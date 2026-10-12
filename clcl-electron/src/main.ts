import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  nativeImage,
  Notification,
  screen,
  shell,
  systemPreferences,
  Tray,
} from 'electron';
import { execFile } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { downloadVideo, findYtDlp, parseVideoUrl } from './download';
import { MULTI_IMAGE_MODES, MultiImageMode, pasteImagesAck, setClipboardImageItems } from './imagepaste';
import * as icons from './icons';
import { parseRegist } from './regist';
import * as store from './store';
import { TemplateFolder, TemplateNode } from './types';

const isMac = process.platform === 'darwin';
const LABEL_MAX = 70;
const ICON_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAALElEQVR4nGNgoBXQ0ND4j4zJ0oQL4zWAEBgiBuDy+6gL6OmCgTWAorxADgAA7YF0uO/iN/EAAAAASUVORK5CYII=';

let cfg: store.Config;
let templates: TemplateNode[] = [];
let history: store.HistoryEntry[] = [];
let tray: Tray | undefined;
let anchor: BrowserWindow | undefined;
let searchWin: BrowserWindow | undefined;
let editorWin: BrowserWindow | undefined;
let menuWin: BrowserWindow | undefined;
let openMenu: Menu | undefined; // referencia viva enquanto o menu esta aberto (evita coleta pelo GC)
let openKind = '';
let searchShownAt = 0;
let searchIndex: { text: string; fromTemplate: boolean; loc?: number[] }[] = [];
let templatesMenu: Menu | undefined; // cache: so reconstroi quando os templates mudam
let lastSeen = '';
let lastImageKey = '';
let imageTick = 0;
const thumbCache = new Map<string, Electron.NativeImage>();
let ownWrite: string | undefined; // texto gravado por nos mesmos (template) -> nao vai para o historico
let warnedAccessibility = false;

// ---------- utilidades ----------

// Log de diagnostico: userData/clcl.log e, se existir, a pasta "new clcl" do iCloud.
function log(...parts: unknown[]): void {
  const line = `${new Date().toISOString()} ${parts.map((p) => (p instanceof Error ? p.stack ?? p.message : String(p))).join(' ')}\n`;
  const shared = path.join(os.homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Desktop/new clcl');
  for (const dir of [app.getPath('userData'), shared]) {
    try {
      if (fs.existsSync(dir)) fs.appendFileSync(path.join(dir, 'clcl.log'), line);
    } catch {
      /* log e melhor esforco */
    }
  }
}

function label(text: string, title = ''): string {
  let s = title.trim();
  if (!s) s = (text.split('\n').find((l) => l.trim() !== '') ?? '').trim();
  s = s.replace(/\s+/g, ' ');
  if (s.length > LABEL_MAX) s = s.slice(0, LABEL_MAX - 1) + '…';
  return (s || '(vazio)').replace(/&/g, '&&');
}

const tooltip = (text: string): string => (text.length > 600 ? text.slice(0, 600) + '…' : text);

function notify(body: string): void {
  if (Notification.isSupported()) new Notification({ title: 'CLCL', body }).show();
}

function canPaste(): boolean {
  if (!cfg.autoPaste) return false;
  if (!isMac) return process.platform === 'win32';
  return systemPreferences.isTrustedAccessibilityClient(false);
}

function sendPasteKey(): void {
  if (isMac) {
    execFile('osascript', ['-e', 'tell application "System Events" to keystroke "v" using command down'], (err) => {
      if (err) notify('Não consegui colar automaticamente; o texto está no clipboard (⌘V).');
    });
  } else if (process.platform === 'win32') {
    execFile('powershell', ['-NoProfile', '-Command', "(New-Object -ComObject WScript.Shell).SendKeys('^v')"]);
  }
}

// Copia o texto e, se der, cola na janela que estava em foco. Shift = so copiar.
// Tempo ate enviar o Cmd+V. No modo "activate" o CLCL esta na frente quando o item e
// escolhido, entao e preciso esperar o foco voltar para o app do usuario.
const pasteDelayDefault = (): number => (cfg.popupMode === 'activate' ? 280 : 120);

function useText(text: string, copyOnly: boolean, fromTemplate: boolean, pasteDelay = pasteDelayDefault()): void {
  if (fromTemplate) ownWrite = text;
  clipboard.writeText(text);
  pasteIfAllowed(copyOnly, pasteDelay);
}

const pasteTmpDir = (): string => path.join(os.tmpdir(), 'clcl-paste');

// Se o Finder (uma pasta ou a mesa) esta na frente, poe no clipboard um ARQUIVO .png
// em vez da imagem: assim o Cmd+V cria o arquivo na pasta. Devolve true se fez isso.
function copyAsFileIfFinder(source: string): Promise<boolean> {
  if (!isMac) return Promise.resolve(false);
  const d = new Date();
  const p2 = (n: number): string => String(n).padStart(2, '0');
  const name = `Imagem ${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}.${p2(d.getMinutes())}.${p2(d.getSeconds())}.png`;
  const target = path.join(pasteTmpDir(), name);
  try {
    fs.mkdirSync(pasteTmpDir(), { recursive: true });
    fs.copyFileSync(source, target);
  } catch (err) {
    log('imagem como arquivo: falha ao copiar', err);
    return Promise.resolve(false);
  }
  const script = [
    'on run argv',
    'tell application "System Events"',
    'set frontAppId to bundle identifier of (first application process whose frontmost is true)',
    'end tell',
    'if frontAppId is "com.apple.finder" then',
    'set the clipboard to (POSIX file (item 1 of argv))',
    'return "file"',
    'end if',
    'return frontAppId',
    'end run',
  ];
  return new Promise((resolve) => {
    execFile('osascript', [...script.flatMap((l) => ['-e', l]), target], { timeout: 3000 }, (err, stdout) => {
      const out = String(stdout).trim();
      log('imagem: app na frente =', err ? `erro ${err.message}` : out);
      resolve(!err && out === 'file');
    });
  });
}

async function useImage(entry: store.HistoryImage, copyOnly: boolean): Promise<void> {
  const file = path.join(store.imagesDir(), entry.image);
  // no modo "activate", espera o foco voltar ao app do usuario antes de ver se e o Finder
  if (cfg.popupMode === 'activate') await new Promise((r) => setTimeout(r, 250));
  const img = nativeImage.createFromPath(file);
  if (img.isEmpty()) {
    notify('O arquivo dessa imagem não existe mais.');
    return;
  }
  if (await copyAsFileIfFinder(file)) {
    // o clipboard agora tem um arquivo; o nome dele nao deve entrar no historico como texto
    lastSeen = clipboard.readText();
    ownWrite = lastSeen;
  } else {
    clipboard.writeImage(img);
  }
  pasteIfAllowed(copyOnly, 60);
}

function pasteIfAllowed(copyOnly: boolean, delay = 120): void {
  if (copyOnly || !cfg.autoPaste) return;
  if (!canPaste()) {
    if (isMac && !warnedAccessibility) {
      warnedAccessibility = true;
      systemPreferences.isTrustedAccessibilityClient(true); // abre o pedido do macOS
      notify('Copiado. Para colar sozinho, libere o app em Ajustes > Privacidade e Segurança > Acessibilidade.');
    }
    return;
  }
  setTimeout(sendPasteKey, delay);
}

// Cola varios itens do historico, na ordem em que foram escolhidos.
// Medido no Mac (Notas): colando 7 imagens uma a uma com 0,4 s entre elas, so 3
// entraram. O app de destino le o clipboard depois que recebe o Cmd+V, e quando ele
// demora a importar uma imagem o clipboard ja foi trocado pela seguinte.
// Por isso imagens seguidas vao numa colagem so, como arquivos .png (igual a copiar
// varios arquivos no Finder e colar): um Cmd+V, todas as imagens. Textos seguidos
// tambem vao juntos, uma linha cada. Entre uma colagem e outra o app espera o destino
// terminar de ler (mais tempo depois de imagens).
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const SET_FILES_JXA = `
ObjC.import('AppKit');
function run(argv) {
  var pb = $.NSPasteboard.generalPasteboard;
  pb.clearContents;
  var urls = $.NSMutableArray.array;
  for (var i = 0; i < argv.length; i++) urls.addObject($.NSURL.fileURLWithPath(argv[i]));
  return pb.writeObjects(urls) ? 'ok' : 'falhou';
}`;

// Copia as imagens para a pasta temporaria com nomes legiveis e poe os arquivos no clipboard.
function setClipboardFiles(images: store.HistoryImage[]): Promise<boolean> {
  const d = new Date();
  const p2 = (n: number): string => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}.${p2(d.getMinutes())}.${p2(d.getSeconds())}`;
  const files: string[] = [];
  try {
    fs.mkdirSync(pasteTmpDir(), { recursive: true });
    images.forEach((e, i) => {
      const target = path.join(pasteTmpDir(), `Imagem ${stamp} (${i + 1}).png`);
      fs.copyFileSync(path.join(store.imagesDir(), e.image), target);
      files.push(target);
    });
  } catch (err) {
    log('colar varios: falha ao preparar as imagens', err);
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    execFile('osascript', ['-l', 'JavaScript', '-e', SET_FILES_JXA, ...files], { timeout: 5000 }, (err, stdout) => {
      const ok = !err && String(stdout).trim() === 'ok';
      if (!ok) log('colar varios: falha ao pôr os arquivos no clipboard', err ? err.message.split('\n')[0] : String(stdout).trim());
      resolve(ok);
    });
  });
}

function frontAppIsFinder(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      'osascript',
      ['-e', 'tell application "System Events" to get bundle identifier of (first application process whose frontmost is true)'],
      { timeout: 3000 },
      (err, stdout) => resolve(!err && String(stdout).trim() === 'com.apple.finder'),
    );
  });
}

type PasteChunk = { text: string } | { images: store.HistoryImage[] };

// Escolhe o jeito de colar as imagens (config.json > multiImageMode):
//   auto     - Finder na frente: arquivos de uma vez; outros apps: ack
//   ack      - uma por vez, passando para a proxima assim que o app leu a anterior
//   items    - todas num unico Cmd+V, uma imagem por item do clipboard
//   files    - todas num unico Cmd+V, como arquivos .png
//   onebyone - uma por vez com espera fixa (multiPasteImageDelayMs)
async function pasteImages(images: store.HistoryImage[], tag: string, forced?: MultiImageMode): Promise<void> {
  const paths = images.map((e) => path.join(store.imagesDir(), e.image)).filter((p) => fs.existsSync(p));
  if (!paths.length) return;
  let mode: MultiImageMode = forced ?? (MULTI_IMAGE_MODES.includes(cfg.multiImageMode) ? cfg.multiImageMode : 'auto');
  if (!isMac) mode = 'onebyone';
  else if (mode === 'auto') mode = (await frontAppIsFinder()) ? 'files' : 'ack';
  const t0 = Date.now();
  if (mode === 'ack') {
    const r = await pasteImagesAck(paths);
    log(`${tag}: ${paths.length} imagens (ack): ${r.done} lidas pelo app, tempos ${JSON.stringify(r.times)} ms${r.err ? ' erro: ' + r.err : ''}`);
    if (r.done < paths.length) {
      // o app nao confirmou a leitura (ou o script falhou): o resto vai com espera fixa
      await pasteImagesOneByOne(paths.slice(r.done), tag);
    }
  } else if (mode === 'items' || mode === 'files') {
    const ok = mode === 'items' ? await setClipboardImageItems(paths) : await setClipboardFiles(images);
    log(`${tag}: ${paths.length} imagens num Cmd+V (${mode}) ${ok ? '' : '-> falhou, indo uma por vez'}`);
    if (!ok) {
      await pasteImagesOneByOne(paths, tag);
    } else {
      await sleep(80);
      sendPasteKey();
      await sleep(600 + 150 * paths.length);
    }
  } else {
    await pasteImagesOneByOne(paths, tag);
  }
  log(`${tag}: imagens concluidas em ${Date.now() - t0} ms`);
}

async function pasteImagesOneByOne(paths: string[], tag: string): Promise<void> {
  const gap = Math.max(500, Number(cfg.multiPasteImageDelayMs) || 2000);
  log(`${tag}: ${paths.length} imagens uma por vez, ${gap} ms entre elas`);
  for (let i = 0; i < paths.length; i++) {
    const img = nativeImage.createFromPath(paths[i]);
    if (img.isEmpty()) continue;
    clipboard.writeImage(img);
    await sleep(80);
    sendPasteKey();
    await sleep(gap);
  }
}

async function pasteMany(list: store.HistoryEntry[], copyOnly: boolean): Promise<void> {
  const chunks: PasteChunk[] = [];
  for (const e of list) {
    const last = chunks[chunks.length - 1];
    if (typeof e === 'string') {
      if (last && 'text' in last) last.text = `${last.text}\n${e}`;
      else chunks.push({ text: e });
    } else if (last && 'images' in last) last.images.push(e);
    else chunks.push({ images: [e] });
  }
  log('colar varios:', list.length, 'itens em', chunks.length, 'colagens', copyOnly ? '(so copiar)' : '');
  if (copyOnly || !cfg.autoPaste || !canPaste()) {
    const texts = list.filter((e): e is string => typeof e === 'string');
    if (texts.length) useText(texts.join('\n'), true, false);
    if (texts.length < list.length) notify('Imagens só podem ser coladas, não copiadas junto com textos. Copiei só os textos.');
    if (!copyOnly) pasteIfAllowed(false); // mostra o aviso de Acessibilidade, se faltar
    return;
  }
  capturePaused = true;
  try {
    await sleep(150); // o menu fecha e o foco volta para o app do usuario
    for (let k = 0; k < chunks.length; k++) {
      const chunk = chunks[k];
      let wait = 450;
      if ('text' in chunk) {
        clipboard.writeText(chunk.text);
        log(`colagem ${k + 1}/${chunks.length}: texto`);
      } else {
        await pasteImages(chunk.images, `colagem ${k + 1}/${chunks.length}`);
        if (k < chunks.length - 1) await sleep(150);
        continue;
      }
      await sleep(80);
      sendPasteKey();
      if (k < chunks.length - 1) await sleep(wait); // o destino precisa ler antes de trocarmos o clipboard
    }
    await sleep(500);
  } finally {
    // o que ficou no clipboard foi escrito por nos: nao entra de novo no historico
    lastSeen = clipboard.readText();
    ownWrite = lastSeen || undefined;
    const img = clipboard.readImage();
    lastImageKey = img.isEmpty() ? '' : imageKey(img);
    capturePaused = false;
  }
}

// ---------- historico (menu do clipboard) ----------

function isConcealed(): boolean {
  if (!isMac) return false;
  try {
    return ['org.nspasteboard.ConcealedType', 'org.nspasteboard.TransientType', 'org.nspasteboard.AutoGeneratedType'].some(
      (t) => clipboard.has(t),
    );
  } catch {
    return false;
  }
}

const thumbFile = (e: store.HistoryImage): string => path.join(store.imagesDir(), `${e.image}.thumb.png`);

function removeImageFiles(e: store.HistoryEntry): void {
  if (typeof e === 'string') return;
  thumbCache.delete(e.image);
  thumbUrlCache.delete(e.image);
  for (const f of [path.join(store.imagesDir(), e.image), thumbFile(e)]) {
    try {
      fs.unlinkSync(f);
    } catch {
      /* ja nao existe */
    }
  }
}

// Miniatura para o menu, na altura de config.json > menuImageHeight.
function menuThumb(e: store.HistoryImage): Electron.NativeImage | undefined {
  let img = thumbCache.get(e.image);
  if (!img) {
    const h = Math.min(store.THUMB_MAX, Math.max(16, Math.round(cfg.menuImageHeight) || 48));
    const src = nativeImage.createFromPath(thumbFile(e));
    if (src.isEmpty()) return undefined;
    img = src.getSize().height > h ? src.resize({ height: h, quality: 'good' }) : src;
    thumbCache.set(e.image, img);
  }
  return img;
}

function pushHistory(entry: store.HistoryEntry): void {
  history.unshift(entry);
  for (const old of history.splice(cfg.historyMax)) removeImageFiles(old);
  store.saveHistory(history);
}

// Imagens (ex.: screenshot com Cmd+Ctrl+Shift+4). Verificado ~1x por segundo,
// porque ler a imagem do clipboard custa mais do que ler texto.
function imageKey(img: Electron.NativeImage): string {
  const { width, height } = img.getSize();
  const small = img.resize({ width: 48, quality: 'good' }).toBitmap();
  return `${width}x${height}-${createHash('sha1').update(small).digest('hex')}`;
}

// Enquanto o app cola varios itens em sequencia, nao captura o que ele mesmo escreve.
let capturePaused = false;

function pollImage(): void {
  if (!clipboard.availableFormats().some((f) => f.startsWith('image/'))) {
    lastImageKey = '';
    return;
  }
  try {
    if (isMac && clipboard.has('public.file-url')) return; // arquivo copiado no Finder, nao uma imagem
  } catch {
    /* clipboard.has e experimental */
  }
  const img = clipboard.readImage();
  if (img.isEmpty()) return;
  const { width, height } = img.getSize();
  const key = imageKey(img);
  if (key === lastImageKey) return;
  lastImageKey = key;
  if (isConcealed()) return;
  const dup = history.findIndex((e) => typeof e !== 'string' && e.key === key);
  if (dup === 0) return;
  if (dup > 0) {
    history.unshift(history.splice(dup, 1)[0]); // mesma imagem: so sobe para o topo
    store.saveHistory(history);
    return;
  }
  const entry: store.HistoryImage = { image: `${Date.now()}.png`, key, width, height };
  fs.mkdirSync(store.imagesDir(), { recursive: true });
  fs.writeFileSync(path.join(store.imagesDir(), entry.image), img.toPNG(), { mode: 0o600 });
  const thumb = height > store.THUMB_MAX ? img.resize({ height: store.THUMB_MAX, quality: 'good' }) : img;
  fs.writeFileSync(thumbFile(entry), thumb.toPNG(), { mode: 0o600 });
  pushHistory(entry);
}

function pollClipboard(): void {
  if (capturePaused) return;
  const text = clipboard.readText();
  if (!text) {
    lastSeen = '';
    if (imageTick++ % 3 === 0) pollImage();
    return;
  }
  lastImageKey = '';
  if (text === lastSeen) return;
  lastSeen = text;
  if (text === ownWrite) return;
  ownWrite = undefined;
  if (!text.trim() || isConcealed()) return;
  if (history[0] === text) return; // duplicata modo 1 do CLCL: igual ao ultimo item
  pushHistory(text);
}

function buildHistoryMenu(): Menu {
  const items: MenuItemConstructorOptions[] = history.map((e, i): MenuItemConstructorOptions => {
    if (typeof e === 'string') {
      return {
        label: `${i + 1}. ${label(e)}`,
        toolTip: tooltip(e),
        click: (_item, _win, ev) => useText(e, !!ev.shiftKey, false),
      };
    }
    return {
      label: `${i + 1}. [Imagem ${e.width}×${e.height}]`,
      icon: menuThumb(e),
      click: (_item, _win, ev) => void useImage(e, !!ev.shiftKey),
    };
  });
  if (!items.length) items.push({ label: '(histórico vazio)', enabled: false });
  items.push(
    { type: 'separator' },
    {
      label: 'Limpar histórico',
      enabled: history.length > 0,
      click: () => {
        history.forEach(removeImageFiles);
        history = [];
        store.saveHistory(history);
      },
    },
    { label: 'Cancelar' },
  );
  return Menu.buildFromTemplate(items);
}

// ---------- templates (menu dos itens salvos) ----------

function menuIcon(x1: string, x2: string): Electron.NativeImage {
  const img = nativeImage.createEmpty();
  img.addRepresentation({ scaleFactor: 1, width: 16, height: 16, buffer: Buffer.from(x1, 'base64') });
  img.addRepresentation({ scaleFactor: 2, width: 32, height: 32, buffer: Buffer.from(x2, 'base64') });
  img.setTemplateImage(true);
  return img;
}
let folderIcon: Electron.NativeImage | undefined;
let itemIcon: Electron.NativeImage | undefined;
const getFolderIcon = (): Electron.NativeImage => (folderIcon ??= menuIcon(icons.FOLDER_1X, icons.FOLDER_2X));
const getItemIcon = (): Electron.NativeImage => (itemIcon ??= menuIcon(icons.DOC_1X, icons.DOC_2X));

function setTemplates(root: TemplateNode[], fromEditor = false): void {
  templates = root;
  templatesMenu = undefined;
  savedModel = undefined;
  store.saveTemplates(root);
  // mudou por fora do editor (menu "Salvar clipboard", importacao): o editor recarrega
  if (!fromEditor && editorWin && !editorWin.isDestroyed()) editorWin.webContents.send('editor:reload');
}

function saveClipboardInto(target: TemplateNode[]): void {
  const text = clipboard.readText();
  if (!text.trim()) {
    notify('O clipboard não tem texto para salvar.');
    return;
  }
  target.push({ type: 'item', title: '', text, modified: new Date().toISOString() });
  setTemplates(templates);
}

function templateEntries(nodes: TemplateNode[]): MenuItemConstructorOptions[] {
  return nodes.map((n): MenuItemConstructorOptions => {
    if (n.type === 'folder') {
      const sub = templateEntries(n.children);
      return {
        label: label('', n.title || '(sem nome)'),
        icon: getFolderIcon(),
        submenu: sub.length ? sub : [{ label: '(vazia)', enabled: false }],
      };
    }
    return {
      label: label(n.text, n.title),
      icon: getItemIcon(),
      toolTip: tooltip(n.text),
      click: (_item, _win, ev) => useText(n.text, !!ev.shiftKey, true),
    };
  });
}

function saveTargets(nodes: TemplateNode[]): MenuItemConstructorOptions[] {
  const folders = nodes.filter((n): n is TemplateFolder => n.type === 'folder');
  const out: MenuItemConstructorOptions[] = [{ label: 'Salvar aqui', click: () => saveClipboardInto(nodes) }];
  if (folders.length) out.push({ type: 'separator' });
  for (const f of folders) {
    out.push({ label: label('', f.title || '(sem nome)'), icon: getFolderIcon(), submenu: saveTargets(f.children) });
  }
  return out;
}

function buildTemplatesMenu(): Menu {
  if (templatesMenu) return templatesMenu;
  const items = templateEntries(templates);
  if (!items.length) items.push({ label: '(nenhum item salvo)', enabled: false });
  items.push(
    { type: 'separator' },
    { label: 'Salvar clipboard atual em', submenu: saveTargets(templates) },
    { label: 'Cancelar' },
  );
  templatesMenu = Menu.buildFromTemplate(items);
  return templatesMenu;
}

// ---------- busca (janela) ----------

interface SearchItem {
  id: number;
  path: string;
  label: string;
  text: string;
}

// Lista plana de tudo que tem texto: primeiro o clipboard, depois os itens salvos.
function buildSearchItems(): SearchItem[] {
  const out: SearchItem[] = [];
  searchIndex = [];
  const add = (text: string, title: string, where: string, fromTemplate: boolean, loc?: number[]): void => {
    out.push({ id: searchIndex.length, path: where, label: label(text, title).replace(/&&/g, '&'), text });
    searchIndex.push({ text, fromTemplate, loc });
  };
  for (const e of history) if (typeof e === 'string') add(e, '', 'Clipboard', false);
  const walk = (nodes: TemplateNode[], trail: string[], loc: number[]): void => {
    nodes.forEach((n, i) => {
      if (n.type === 'folder') walk(n.children, [...trail, n.title || '(sem nome)'], [...loc, i]);
      else add(n.text, n.title, ['Salvos', ...trail].join(' › '), true, [...loc, i]);
    });
  };
  walk(templates, [], []);
  return out;
}

function hideSearch(returnFocus: boolean): void {
  if (!searchWin || searchWin.isDestroyed() || !searchWin.isVisible()) return;
  searchWin.hide();
  // devolve o foco ao app que estava na frente (sem esconder o editor, se estiver aberto)
  const editorOpen = !!editorWin && !editorWin.isDestroyed() && editorWin.isVisible();
  if (returnFocus && isMac && !editorOpen) app.hide();
}

function createSearchWindow(): void {
  searchWin = new BrowserWindow({
    width: 760,
    height: 460,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    ...floatingOptions,
    webPreferences: {
      preload: path.join(__dirname, '..', 'ui', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  floatOverEverything(searchWin);
  void searchWin.loadFile(path.join(__dirname, '..', 'ui', 'search.html'));
  searchWin.on('blur', () => {
    // ao abrir, o macOS pode disparar um blur antes de o app virar o ativo
    if (Date.now() - searchShownAt > 400) hideSearch(false);
  });
  searchWin.webContents.on('did-fail-load', (_e, code, desc) => log('busca: falha ao carregar', code, desc));
  searchWin.webContents.on('render-process-gone', (_e, d) => log('busca: renderer caiu', d.reason));
  searchWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  searchWin.webContents.on('will-navigate', (ev) => ev.preventDefault());
}

function toggleSearch(): void {
  if (!searchWin || searchWin.isDestroyed()) createSearchWindow();
  const win = searchWin!;
  if (win.isVisible()) {
    hideSearch(true);
    return;
  }
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const [w, h] = win.getSize();
  win.setPosition(Math.round(area.x + (area.width - w) / 2), Math.round(area.y + (area.height - h) / 3));
  searchShownAt = Date.now();
  if (openMenu) runRemoteCommandClose();
  hidePanelMenu('abrindo a busca');
  ensureFloating(win, 'busca');
  win.show();
  win.focus();
  win.webContents.send('search:show');
  // Nao ativamos o app (isso tiraria o usuario de um app em tela cheia). Se a busca
  // abriu numa mesa que o usuario nao esta vendo, recriamos a janela na mesa ativa.
  setTimeout(() => {
    if (win.isDestroyed() || !win.isVisible()) return;
    log('busca aberta, focada =', win.isFocused());
    void windowOnScreen(win).then((onScreen) => {
      if (onScreen === undefined || win.isDestroyed() || !win.isVisible()) return;
      log('busca na tela que o usuario ve =', onScreen ? 'sim' : 'NAO');
      if (onScreen) {
        searchRecreated = false;
        return;
      }
      if (searchRecreated) return;
      log('busca: recriando a janela na mesa ativa');
      searchRecreated = true;
      searchWin = undefined;
      win.destroy();
      createSearchWindow();
      searchWin!.webContents.once('did-finish-load', () => toggleSearch());
    });
  }, 150);
}
let searchRecreated = false;

// ---------- editor da arvore de itens salvos (janela) ----------

// Aceita so a estrutura esperada; qualquer outra coisa vinda da janela e descartada.
function sanitizeTree(input: unknown, depth = 0): TemplateNode[] {
  if (!Array.isArray(input) || depth > 50) return [];
  const out: TemplateNode[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const n = raw as Record<string, unknown>;
    const title = typeof n.title === 'string' ? n.title : '';
    if (n.type === 'folder') {
      out.push({ type: 'folder', title, children: sanitizeTree(n.children, depth + 1) });
    } else if (n.type === 'item' && typeof n.text === 'string') {
      const item: TemplateNode = { type: 'item', title, text: n.text };
      if (typeof n.modified === 'string') item.modified = n.modified;
      out.push(item);
    }
  }
  return out;
}

function openEditor(selectLoc?: number[]): void {
  const sendSelect = (): void => {
    if (selectLoc && editorWin && !editorWin.isDestroyed()) editorWin.webContents.send('editor:select', selectLoc);
  };
  if (!editorWin || editorWin.isDestroyed()) {
    store.backupTemplates();
    editorWin = new BrowserWindow({
      width: 1000,
      height: 660,
      minWidth: 720,
      minHeight: 420,
      show: false,
      title: 'CLCL — itens salvos',
      webPreferences: {
        preload: path.join(__dirname, '..', 'ui', 'editor-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    const win = editorWin;
    win.setMenuBarVisibility(false);
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (ev) => ev.preventDefault());
    win.webContents.on('did-fail-load', (_e, code, desc) => log('editor: falha ao carregar', code, desc));
    win.webContents.once('did-finish-load', sendSelect);
    win.once('ready-to-show', () => {
      win.show();
      if (isMac) app.focus({ steal: true });
      win.focus();
    });
    void win.loadFile(path.join(__dirname, '..', 'ui', 'editor.html'));
    log('editor aberto');
    return;
  }
  editorWin.show();
  if (isMac) app.focus({ steal: true });
  editorWin.focus();
  sendSelect();
}

function registerEditorIpc(): void {
  ipcMain.handle('editor:load', () => templates);
  ipcMain.handle('editor:clipboard', () => clipboard.readText());
  ipcMain.on('editor:save', (_ev, root: unknown) => {
    if (!Array.isArray(root)) return;
    setTemplates(sanitizeTree(root), true);
  });
  ipcMain.on('search:edit', (_ev, id: unknown) => {
    const hit = typeof id === 'number' ? searchIndex[id] : undefined;
    if (searchWin && !searchWin.isDestroyed()) searchWin.hide();
    openEditor(hit?.loc);
  });
}

// Baixa o video do link para a pasta Downloads e avisa por notificacao.
async function startVideoDownload(input: string): Promise<void> {
  const url = parseVideoUrl(input);
  if (!url) return;
  if (!findYtDlp()) {
    log('download: yt-dlp nao encontrado');
    dialog.showErrorBox('CLCL', 'Para baixar vídeos é preciso instalar o yt-dlp.\n\nNo Terminal:\n    brew install yt-dlp ffmpeg\n\nDepois é só colar o link de novo.');
    return;
  }
  log('download: inicio', url.hostname);
  notify(`Baixando o vídeo de ${url.hostname}…`);
  const res = await downloadVideo(input, app.getPath('downloads'));
  if (res.ok && res.file) {
    log('download: ok', path.basename(res.file));
    const file = res.file;
    if (Notification.isSupported()) {
      const n = new Notification({ title: 'CLCL — vídeo salvo em Downloads', body: path.basename(file) });
      n.on('click', () => shell.showItemInFolder(file));
      n.show();
    }
  } else {
    log('download: falhou', res.error);
    notify(`Não consegui baixar o vídeo: ${res.error ?? 'erro desconhecido'}`);
  }
}

function registerSearchIpc(): void {
  ipcMain.on('search:download', (_ev, url: unknown) => {
    hideSearch(true);
    if (typeof url === 'string') void startVideoDownload(url);
  });
  ipcMain.handle('search:items', () => buildSearchItems());
  ipcMain.on('search:close', () => hideSearch(true));
  ipcMain.on('search:choose', (_ev, id: unknown, copyOnly: unknown) => {
    const hit = typeof id === 'number' ? searchIndex[id] : undefined;
    hideSearch(true);
    if (hit) useText(hit.text, copyOnly === true, hit.fromTemplate, 250);
  });
}

// ---------- importacao do regist.dat ----------

function registCandidates(): string[] {
  return [
    cfg.registPath,
    path.join(app.getAppPath(), '..', 'regist.dat'),
    path.join(os.homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Desktop/new clcl/regist.dat'),
  ].filter((p) => p && fs.existsSync(p));
}

function importRegist(file: string): boolean {
  try {
    const { root, stats } = parseRegist(fs.readFileSync(file));
    setTemplates(root);
    notify(`Importados ${stats.items} itens em ${stats.folders} pastas.`);
    return true;
  } catch (err) {
    dialog.showErrorBox('CLCL', `Falha ao importar ${file}:\n${String(err)}`);
    return false;
  }
}

async function importDialog(): Promise<void> {
  const pick = await dialog.showOpenDialog({
    title: 'Escolha o regist.dat do CLCL',
    properties: ['openFile'],
    filters: [{ name: 'CLCL', extensions: ['dat'] }],
  });
  if (pick.canceled || !pick.filePaths[0]) return;
  if (templates.length) {
    const ans = await dialog.showMessageBox({
      type: 'warning',
      message: 'Substituir os itens salvos atuais pelos do arquivo?',
      detail: 'Os itens que você salvou no app depois da última importação serão perdidos.',
      buttons: ['Cancelar', 'Substituir'],
      defaultId: 0,
      cancelId: 0,
    });
    if (ans.response !== 1) return;
  }
  importRegist(pick.filePaths[0]);
}

// Menu do app (so aparece com a busca ou o editor em foco): sem "Sair" no Cmd+Q,
// para nao fechar o CLCL por engano, e com Editar para copiar/colar nos campos.
function setAppMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ label: 'CLCL', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }] } as MenuItemConstructorOptions] : []),
    { role: 'editMenu' },
    { label: 'Janela', submenu: [{ role: 'close' }, { role: 'minimize' }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Apaga todo o historico do clipboard (textos e imagens), depois de confirmar.
async function confirmClearHistory(): Promise<void> {
  const n = history.length;
  if (!n) return;
  const ans = await dialog.showMessageBox({
    type: 'warning',
    message: 'Limpar todo o histórico do clipboard?',
    detail: `Os ${n} ${n === 1 ? 'item' : 'itens'} do histórico (textos e imagens) serão apagados. Os itens salvos não são afetados.`,
    buttons: ['Não', 'Sim'],
    defaultId: 0,
    cancelId: 0,
  });
  if (ans.response !== 1) return;
  history.forEach(removeImageFiles);
  history = [];
  store.saveHistory(history);
  log('historico limpo pelo menu da barra:', n, 'itens');
}

// ---------- popup, bandeja, atalhos ----------

// No macOS as janelas de apoio sao "panel": aparecem por cima de apps em tela cheia
// e em qualquer mesa (Space), e recebem o teclado sem tirar o app do usuario da frente.
const floatingOptions: Electron.BrowserWindowConstructorOptions = isMac ? { type: 'panel' } : {};
function floatOverEverything(win: BrowserWindow): void {
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
}

// Reaplicado antes de cada abertura: se a janela perder a marca de "aparece em todas as
// mesas / por cima de tela cheia", ela abriria numa mesa que o usuario nao esta vendo.
// O log registra quando a marca estava perdida, para confirmar se e essa a causa.
function ensureFloating(win: BrowserWindow, name: string): void {
  let onAll = true;
  try {
    onAll = win.isVisibleOnAllWorkspaces();
  } catch {
    /* so existe no macOS e no Linux */
  }
  if (!onAll) log('***', name, 'tinha perdido a marca de todas as mesas; reaplicando');
  floatOverEverything(win);
}

// ---- abertura do menu ----
// Menu.popup precisa de uma janela: usamos uma janela invisivel de 1x1 sob o cursor.
// Modos (config.json > popupMode):
//   anchor   - mostra a janela sem ativar o app; o foco continua no app do usuario
//   activate - ativa o CLCL antes de abrir e devolve o foco ao fechar
//   tray     - abre o menu preso ao icone da barra de menus (nao segue o cursor)
type PopupMode = store.Config['popupMode'];
const POPUP_MODES: PopupMode[] = ['panel', 'anchor', 'activate', 'tray'];
let menuToken = 0;
let menuShown = false;
let menuMode: PopupMode = 'anchor';

// Fecha o menu que estiver aberto, seja preso a janela-ancora ou ao icone da barra.
function dismissOpenMenu(): void {
  if (!openMenu) return;
  try {
    if (menuMode === 'tray') tray?.closeContextMenu();
    else if (anchor && !anchor.isDestroyed()) openMenu.closePopup(anchor);
  } catch {
    /* nada aberto */
  }
}

function menuClosed(token: number, why: string): void {
  if (token !== menuToken || !openMenu) return;
  log('menu fechado', `(${why})`, openKind, menuMode, 'chegou a abrir =', menuShown);
  const mode = menuMode;
  openMenu = undefined;
  openKind = '';
  if (anchor && !anchor.isDestroyed()) anchor.hide();
  if (mode === 'activate' && isMac) {
    appActive = false;
    app.hide(); // devolve o foco ao app que estava na frente
  }
}

// O macOS fecha um menu quando o app muda de ativo/inativo no meio da abertura (o menu
// "pisca"). Por isso, no modo activate, so abrimos o menu depois de o app estar ativo.
let appActive = false;
function whenAppActive(fn: () => void): void {
  if (!isMac || appActive) {
    fn();
    return;
  }
  let done = false;
  const go = (why: string): void => {
    if (done) return;
    done = true;
    app.removeListener('did-become-active', onActive);
    log('app ativo:', why);
    setTimeout(fn, 40);
  };
  const onActive = (): void => go('evento');
  app.once('did-become-active', onActive);
  app.focus({ steal: true });
  setTimeout(() => go('tempo esgotado'), 350);
}

function showMenu(build: () => Menu, kind: string, mode: PopupMode): void {
  if (!anchor || anchor.isDestroyed()) return;
  const win = anchor;
  const menu = build();
  const token = ++menuToken;
  openMenu = menu;
  openKind = kind;
  menuShown = false;
  menuMode = mode;
  menu.once('menu-will-show', () => {
    if (token === menuToken) menuShown = true;
    log('menu abriu', kind, mode);
  });
  menu.once('menu-will-close', () => menuClosed(token, 'evento'));
  const pt = screen.getCursorScreenPoint();
  log('popup', kind, 'modo', mode, menu.items.length, 'itens em', pt.x, pt.y);
  if (mode === 'tray' && tray) {
    tray.popUpContextMenu(menu);
  } else {
    win.setBounds({ x: pt.x, y: pt.y, width: 1, height: 1 });
    const open = (): void => {
      if (token !== menuToken || !openMenu) return; // cancelado enquanto esperava o app ativar
      win.showInactive();
      menu.popup({ window: win, x: 0, y: 0, callback: () => menuClosed(token, 'callback') });
      setTimeout(check, 400);
    };
    if (mode === 'activate') whenAppActive(open);
    else open();
    return;
  }
  setTimeout(check, 400);

  // Confere se o menu abriu mesmo. Se nao abriu, limpa o estado e (opcional) tenta outro modo.
  function check(): void {
    if (token !== menuToken || menuShown || !openMenu) return;
    log('*** o menu NAO abriu ***', kind, 'modo', mode);
    dismissOpenMenu();
    menuClosed(token, 'nao abriu');
    const next = POPUP_MODES[POPUP_MODES.indexOf(mode) + 1];
    if (cfg.popupFallback && next) showMenu(build, kind, next);
  }
}

// ---- menu em janela propria (modo "panel") ----
// Os menus sao desenhados numa janela-painel (ui/menu.html) em vez do menu nativo.
// O painel recebe o teclado sem ativar o CLCL, entao nao tira o usuario de um app em
// tela cheia, e os atalhos continuam funcionando com o menu aberto.
interface MenuRow {
  t: 'item' | 'sep';
  label?: string;
  icon?: 'folder' | 'doc';
  thumb?: string;
  tip?: string;
  id?: number;
  off?: boolean;
  multi?: boolean; // pode entrar numa selecao de varios itens
  hint?: boolean; // linha de ajuda, so texto
  rows?: MenuRow[];
}
type MenuAction = (copyOnly: boolean) => void;
interface MenuModel {
  rows: MenuRow[];
  actions: MenuAction[];
  entries?: (store.HistoryEntry | undefined)[]; // menu do clipboard: item do historico por id
}
let savedModel: MenuModel | undefined; // cache: refeito quando os itens salvos mudam
let panelActions: MenuAction[] = [];
let panelEntries: (store.HistoryEntry | undefined)[] = [];
let panelKind = '';
let panelShownAt = 0;
const thumbUrlCache = new Map<string, string>();

const plain = (text: string, title = ''): string => label(text, title).replace(/&&/g, '&');

function buildSavedModel(): MenuModel {
  if (savedModel) return savedModel;
  const actions: MenuAction[] = [];
  const act = (fn: MenuAction): number => actions.push(fn) - 1;
  const entries = (nodes: TemplateNode[]): MenuRow[] =>
    nodes.map((n): MenuRow => {
      if (n.type === 'folder') return { t: 'item', label: n.title || '(sem nome)', icon: 'folder', rows: entries(n.children) };
      return { t: 'item', label: plain(n.text, n.title), icon: 'doc', tip: tooltip(n.text), id: act((copyOnly) => useText(n.text, copyOnly, true)) };
    });
  const targets = (nodes: TemplateNode[]): MenuRow[] => {
    const folders = nodes.filter((n): n is TemplateFolder => n.type === 'folder');
    const out: MenuRow[] = [{ t: 'item', label: 'Salvar aqui', id: act(() => saveClipboardInto(nodes)) }];
    if (folders.length) out.push({ t: 'sep' });
    for (const f of folders) out.push({ t: 'item', label: f.title || '(sem nome)', icon: 'folder', rows: targets(f.children) });
    return out;
  };
  const rows = entries(templates);
  if (!rows.length) rows.push({ t: 'item', label: '(nenhum item salvo)', off: true });
  rows.push(
    { t: 'sep' },
    { t: 'item', label: 'Salvar clipboard atual em', rows: targets(templates) },
    { t: 'item', label: 'Editar itens salvos…', id: act(() => openEditor()) },
  );
  savedModel = { rows, actions };
  return savedModel;
}

function thumbUrl(e: store.HistoryImage): string | undefined {
  let url = thumbUrlCache.get(e.image);
  if (!url) {
    const img = menuThumb(e);
    if (!img) return undefined;
    url = img.toDataURL();
    thumbUrlCache.set(e.image, url);
  }
  return url;
}

function buildHistoryModel(): MenuModel {
  const actions: MenuAction[] = [];
  const entries: (store.HistoryEntry | undefined)[] = [];
  const act = (fn: MenuAction, entry?: store.HistoryEntry): number => {
    entries.push(entry);
    return actions.push(fn) - 1;
  };
  const rows: MenuRow[] = history.map((e, i): MenuRow => {
    if (typeof e === 'string') {
      return { t: 'item', label: `${i + 1}. ${plain(e)}`, tip: tooltip(e), multi: true, id: act((copyOnly) => useText(e, copyOnly, false), e) };
    }
    return {
      t: 'item',
      label: `${i + 1}. [Imagem ${e.width}×${e.height}]`,
      thumb: thumbUrl(e),
      multi: true,
      id: act((copyOnly) => void useImage(e, copyOnly), e),
    };
  });
  if (!rows.length) rows.push({ t: 'item', label: '(histórico vazio)', off: true });
  rows.push({ t: 'sep' });
  if (history.length > 1) rows.push({ t: 'item', label: 'Shift+↑↓ ou Shift+clique: vários · Enter: colar · ⌥: só copiar', off: true, hint: true });
  rows.push({
    t: 'item',
    label: 'Limpar histórico',
    off: history.length === 0,
    id: act(() => {
      history.forEach(removeImageFiles);
      history = [];
      store.saveHistory(history);
    }),
  });
  return { rows, actions, entries };
}

function createMenuWindow(): void {
  menuWin = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    ...floatingOptions,
    webPreferences: {
      preload: path.join(__dirname, '..', 'ui', 'menu-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  floatOverEverything(menuWin);
  void menuWin.loadFile(path.join(__dirname, '..', 'ui', 'menu.html'));
  menuWin.on('blur', () => {
    if (Date.now() - panelShownAt > 300) hidePanelMenu('perdeu o foco');
  });
  menuWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  menuWin.webContents.on('will-navigate', (ev) => ev.preventDefault());
  menuWin.webContents.on('did-fail-load', (_e, code, desc) => log('painel: falha ao carregar', code, desc));
  menuWin.webContents.on('render-process-gone', (_e, d) => log('painel: renderer caiu', d.reason));
}

// `cleared` = a janela ja apagou o menu e redesenhou (caminho do Esc, clique e escolha).
// Nos outros casos pedimos para apagar e so entao escondemos, para a proxima abertura
// nao mostrar por um instante o menu antigo na posicao antiga.
let panelHideTimer: NodeJS.Timeout | undefined;
function finishPanelHide(): void {
  clearTimeout(panelHideTimer);
  panelHideTimer = undefined;
  if (menuWin && !menuWin.isDestroyed() && !panelKind) menuWin.hide();
}
function hidePanelMenu(why: string, cleared = false): void {
  if (!menuWin || menuWin.isDestroyed() || !menuWin.isVisible() || !panelKind) return;
  log('painel fechado', `(${why})`, panelKind);
  panelKind = '';
  if (cleared) {
    finishPanelHide();
    return;
  }
  menuWin.webContents.send('menu:clear');
  clearTimeout(panelHideTimer);
  panelHideTimer = setTimeout(finishPanelHide, 90); // se a janela nao responder, esconde mesmo assim
}

// ---- conferencia: a janela esta mesmo na tela que o usuario esta vendo? ----
// O Electron so sabe se a janela esta "visivel" e "focada"; nao sabe se ela esta na mesa
// (Space) que aparece na tela. O macOS sabe: a lista de janelas "na tela" do
// CoreGraphics so traz as da mesa ativa. Perguntamos isso por um script JXA.
const ONSCREEN_JXA = `
ObjC.import('CoreGraphics');
function run(argv) {
  var pid = parseInt(argv[0], 10);
  var list = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(1 | 16, 0)));
  var mine = (list || []).filter(function (w) { return w.kCGWindowOwnerPID === pid; });
  return JSON.stringify(mine.map(function (w) { return w.kCGWindowBounds; }));
}`;

// Responde true/false se conseguiu verificar, ou undefined se a verificacao falhou.
function windowOnScreen(win: BrowserWindow): Promise<boolean | undefined> {
  if (!isMac || win.isDestroyed()) return Promise.resolve(undefined);
  const b = win.getBounds();
  return new Promise((resolve) => {
    execFile('osascript', ['-l', 'JavaScript', '-e', ONSCREEN_JXA, String(process.pid)], { timeout: 3000 }, (err, stdout) => {
      if (err) {
        log('conferencia da tela falhou:', err.message.split('\n')[0]);
        resolve(undefined);
        return;
      }
      try {
        const list = JSON.parse(String(stdout).trim()) as { X: number; Y: number; Width: number; Height: number }[];
        // A janela conta como "na tela" se alguma janela do CLCL que o macOS diz estar na
        // tela cobre ao menos metade dela (numa tela cheia o macOS pode encolher a janela
        // para fora da barra de menus, entao o tamanho exato nao serve).
        const overlap = (r: { X: number; Y: number; Width: number; Height: number }): number => {
          const w = Math.min(r.X + r.Width, b.x + b.width) - Math.max(r.X, b.x);
          const h = Math.min(r.Y + r.Height, b.y + b.height) - Math.max(r.Y, b.y);
          return w > 0 && h > 0 ? (w * h) / (b.width * b.height) : 0;
        };
        const on = list.some((r) => overlap(r) >= 0.5);
        if (!on) log('conferencia da tela: janela em', JSON.stringify(b), 'macOS mostra', JSON.stringify(list).slice(0, 300));
        resolve(on);
      } catch {
        log('conferencia da tela: resposta inesperada', String(stdout).slice(0, 120));
        resolve(undefined);
      }
    });
  });
}

let panelRecreated = false;
let panelDrawToken = 0; // aumenta a cada abertura; a janela devolve o numero depois de desenhar
let panelDrawnToken = 0;

function openPanelMenu(kind: string): void {
  if (!menuWin || menuWin.isDestroyed()) createMenuWindow();
  const win = menuWin!;
  if (win.isVisible() && panelKind === kind) {
    hidePanelMenu('mesmo atalho');
    return;
  }
  clearTimeout(panelHideTimer); // reabrindo antes de terminar de esconder
  panelHideTimer = undefined;
  const model = kind === 'salvos' ? buildSavedModel() : buildHistoryModel();
  panelActions = model.actions;
  panelEntries = model.entries ?? [];
  const pt = screen.getCursorScreenPoint();
  const area = screen.getDisplayNearestPoint(pt).bounds; // a janela cobre a tela; as colunas do menu flutuam dentro dela
  panelKind = kind;
  panelShownAt = Date.now();
  ensureFloating(win, 'painel');
  win.setBounds(area);
  const drawToken = ++panelDrawToken;
  win.webContents.send('menu:show', {
    token: drawToken,
    rows: model.rows,
    x: pt.x - area.x,
    y: pt.y - area.y,
    fontSize: Math.min(22, Math.max(9, Number(cfg.menuFontSize) || 13)),
    thumbHeight: Math.min(store.THUMB_MAX, Math.max(16, Math.round(cfg.menuImageHeight) || 48)),
  });
  win.show();
  win.focus();
  log('painel', kind, model.rows.length, 'linhas em', pt.x, pt.y, 'tela', `${area.x},${area.y} ${area.width}x${area.height}`);
  // Se a janela nao confirmar que desenhou o menu, forca o redesenho e reenvia o menu.
  setTimeout(() => {
    if (win.isDestroyed() || !win.isVisible() || panelKind !== kind || panelDrawnToken >= drawToken) return;
    log('*** painel sem desenho; forcando redesenho');
    win.webContents.invalidate();
    win.webContents.send('menu:show', {
      token: drawToken,
      rows: model.rows,
      x: pt.x - area.x,
      y: pt.y - area.y,
      fontSize: Math.min(22, Math.max(9, Number(cfg.menuFontSize) || 13)),
      thumbHeight: Math.min(store.THUMB_MAX, Math.max(16, Math.round(cfg.menuImageHeight) || 48)),
    });
  }, 350);
  setTimeout(() => {
    if (win.isDestroyed() || !win.isVisible() || panelKind !== kind) return;
    log('painel aberto, focado =', win.isFocused(), '| desenhado =', panelDrawnToken >= drawToken);
    void windowOnScreen(win).then((onScreen) => {
      if (onScreen === undefined || win.isDestroyed() || !win.isVisible() || panelKind !== kind) return;
      log('painel na tela que o usuario ve =', onScreen ? 'sim' : 'NAO');
      if (onScreen) {
        panelRecreated = false;
        return;
      }
      if (panelRecreated) return; // ja recriou uma vez para esta abertura: nao insiste
      // A janela abriu em outra mesa. Uma janela nova, criada agora, nasce na mesa ativa.
      log('painel: recriando a janela na mesa ativa');
      panelRecreated = true;
      panelKind = '';
      menuWin = undefined;
      win.destroy();
      createMenuWindow();
      menuWin!.webContents.once('did-finish-load', () => openPanelMenu(kind));
    });
  }, 200);
}

function registerMenuIpc(): void {
  ipcMain.on('menu:close', () => hidePanelMenu('esc ou clique fora', true));
  ipcMain.on('menu:cleared', () => finishPanelHide());
  ipcMain.on('menu:debug', (_ev, msg: unknown) => log('menu:', String(msg).slice(0, 400)));
  ipcMain.on('menu:shown', (_ev, token: unknown) => {
    if (typeof token === 'number' && token > panelDrawnToken) panelDrawnToken = token;
  });
  ipcMain.on('menu:choose', (_ev, id: unknown, copyOnly: unknown) => {
    const action = typeof id === 'number' ? panelActions[id] : undefined;
    hidePanelMenu('item escolhido', true);
    if (action) action(copyOnly === true);
  });
  ipcMain.on('menu:chooseMany', (_ev, ids: unknown, copyOnly: unknown) => {
    hidePanelMenu('varios itens escolhidos', true);
    if (!Array.isArray(ids)) return;
    const list = ids
      .filter((id): id is number => typeof id === 'number')
      .map((id) => panelEntries[id])
      .filter((e): e is store.HistoryEntry => e !== undefined);
    log('menu: recebidos', ids.length, 'ids', JSON.stringify(ids.slice(0, 50)), '->', list.length, 'itens do historico');
    if (list.length) void pasteMany(list.slice(0, 50), copyOnly === true);
  });
}

// `kind` identifica o menu: o mesmo atalho de novo fecha; outro atalho troca de menu.
function popupAtCursor(build: () => Menu, kind: string, mode: PopupMode = cfg.popupMode): void {
  if (mode === 'panel') {
    if (openMenu) dismissOpenMenu();
    openPanelMenu(kind);
    return;
  }
  hidePanelMenu('outro modo');
  if (openMenu) {
    const same = openKind === kind;
    const token = menuToken;
    log('menu ja aberto:', openKind, same ? '-> fecha' : `-> troca para ${kind}`);
    dismissOpenMenu();
    menuClosed(token, 'fechado pelo atalho'); // nao depende do evento do sistema para liberar o estado
    if (!same) setTimeout(() => { if (!openMenu) showMenu(build, kind, mode); }, 150);
    return;
  }
  showMenu(build, kind, mode);
}

function runRemoteCommandClose(): void {
  const token = menuToken;
  dismissOpenMenu();
  menuClosed(token, 'fechado para abrir a busca');
}

// ---- comandos de teste (arquivo clcl-cmd.txt na pasta "new clcl" do iCloud) ----
// Uma linha por comando:  popup salvos|clipboard [anchor|activate|tray]  |  search  |  close
//                         set popupMode <modo>  |  set popupFallback true|false  |  set remoteCommands false
function runRemoteCommand(line: string): void {
  const [cmd, a, b] = line.trim().split(/\s+/);
  if (!cmd) return;
  log('comando remoto:', line.trim());
  const mode = POPUP_MODES.includes(b as PopupMode) ? (b as PopupMode) : cfg.popupMode;
  if (cmd === 'popup' && a === 'salvos') popupAtCursor(buildTemplatesMenu, 'salvos', mode);
  else if (cmd === 'popup' && a === 'clipboard') popupAtCursor(buildHistoryMenu, 'clipboard', mode);
  else if (cmd === 'search') toggleSearch();
  else if (cmd === 'testpaste') {
    // testpaste <modo> <n>: cola as n imagens mais recentes do historico no app da frente
    const tmode = MULTI_IMAGE_MODES.includes(a as MultiImageMode) ? (a as MultiImageMode) : 'auto';
    const n = Math.max(1, Math.min(20, parseInt(b ?? '3', 10) || 3));
    const imgs = history.filter((e): e is store.HistoryImage => typeof e !== 'string').slice(0, n).reverse();
    capturePaused = true;
    void pasteImages(imgs, `teste ${tmode} ${imgs.length}`, tmode).finally(() => {
      const img = clipboard.readImage();
      lastImageKey = img.isEmpty() ? '' : imageKey(img);
      lastSeen = clipboard.readText();
      capturePaused = false;
    });
  } else if (cmd === 'set' && a === 'multiImageMode' && MULTI_IMAGE_MODES.includes(b as MultiImageMode)) {
    cfg.multiImageMode = b as MultiImageMode;
    store.saveConfig(cfg);
  }
  else if (cmd === 'close') {
    const token = menuToken;
    dismissOpenMenu();
    menuClosed(token, 'comando');
    hidePanelMenu('comando');
    hideSearch(false);
  } else if (cmd === 'set' && a === 'popupMode' && POPUP_MODES.includes(b as PopupMode)) {
    cfg.popupMode = b as PopupMode;
    store.saveConfig(cfg);
  } else if (cmd === 'set' && (a === 'popupFallback' || a === 'remoteCommands') && (b === 'true' || b === 'false')) {
    cfg[a] = b === 'true';
    store.saveConfig(cfg);
  } else log('comando remoto desconhecido');
}

function pollRemoteCommands(): void {
  if (!cfg.remoteCommands) return;
  const file = path.join(os.homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Desktop/new clcl/clcl-cmd.txt');
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
    fs.unlinkSync(file);
  } catch {
    return;
  }
  text.split('\n').slice(0, 5).forEach(runRemoteCommand);
}

function createAnchor(): void {
  anchor = new BrowserWindow({
    width: 1,
    height: 1,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    ...floatingOptions,
  });
  floatOverEverything(anchor);
}

function createTray(): void {
  if (isMac) {
    tray = new Tray(nativeImage.createEmpty());
    tray.setTitle('CLCL');
  } else {
    tray = new Tray(nativeImage.createFromDataURL(ICON_PNG));
  }
  tray.setToolTip(`CLCL — salvos: ${cfg.hotkeyTemplates} · clipboard: ${cfg.hotkeyHistory} · busca: ${cfg.hotkeySearch}`);
  const showMenu = (): void => {
    const menu = Menu.buildFromTemplate([
      { label: `Itens salvos (${cfg.hotkeyTemplates})`, click: () => setTimeout(() => popupAtCursor(buildTemplatesMenu, 'salvos'), 150) },
      { label: `Clipboard (${cfg.hotkeyHistory})`, click: () => setTimeout(() => popupAtCursor(buildHistoryMenu, 'clipboard'), 150) },
      { label: `Buscar… (${cfg.hotkeySearch})`, click: toggleSearch },
      { label: 'Editar itens salvos…', click: () => openEditor() },
      { label: 'Limpar todo o histórico…', enabled: history.length > 0, click: () => void confirmClearHistory() },
      { type: 'separator' },
      { label: 'Importar regist.dat…', click: () => void importDialog() },
      {
        label: 'Recarregar itens salvos do arquivo',
        click: () => {
          templates = store.loadTemplates();
          templatesMenu = undefined;
          savedModel = undefined;
        },
      },
      { label: 'Abrir pasta de dados', click: () => void shell.openPath(app.getPath('userData')) },
      {
        label: 'Abrir ao iniciar sessão',
        type: 'checkbox',
        visible: app.isPackaged,
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
      },
      { type: 'separator' },
      { label: 'Sair', click: () => app.quit() },
    ]);
    tray?.popUpContextMenu(menu);
  };
  tray.on('click', showMenu);
  tray.on('right-click', showMenu);
}

function registerHotkeys(): void {
  const failed: string[] = [];
  const reg = (key: string, fn: () => void): void => {
    let ok = false;
    try {
      ok = globalShortcut.register(key, () => {
        log('atalho', key);
        try {
          fn();
        } catch (err) {
          log('erro no atalho', key, err);
        }
      });
    } catch (err) {
      log('erro ao registrar', key, err);
      ok = false;
    }
    log('registro', key, ok ? 'ok' : 'FALHOU');
    if (!ok) failed.push(key);
  };
  reg(cfg.hotkeyTemplates, () => popupAtCursor(buildTemplatesMenu, 'salvos'));
  reg(cfg.hotkeyHistory, () => popupAtCursor(buildHistoryMenu, 'clipboard'));
  reg(cfg.hotkeySearch, toggleSearch);
  if (failed.length) notify(`Não consegui registrar o atalho: ${failed.join(', ')}. Ajuste em config.json.`);
}

// O CLCL fica horas parado esperando um atalho. Sem isto, o Chromium reduz o ritmo das
// janelas escondidas e o menu pode abrir sem ter sido desenhado (janela transparente e
// invisivel, mas com o teclado). O App Nap do macOS e desligado no Info.plist
// (NSAppSleepDisabled, em package.json > build.mac.extendInfo).
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// Mesma pasta de dados rodando com "npm start" ou como CLCL.app.
app.setPath('userData', path.join(app.getPath('appData'), 'clcl-electron'));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    if (isMac) app.dock?.hide();
    cfg = store.loadConfig();
    log('--- inicio', app.getVersion(), 'electron', process.versions.electron, 'empacotado =', app.isPackaged, JSON.stringify(cfg));
    history = store.loadHistory();
    if (store.hasTemplates()) {
      templates = store.loadTemplates();
    } else {
      const found = registCandidates()[0];
      if (found) importRegist(found);
      else notify('Nenhum regist.dat encontrado. Use "Importar regist.dat…" no ícone da barra de menus.');
    }
    fs.rmSync(pasteTmpDir(), { recursive: true, force: true });
    lastSeen = clipboard.readText();
    createAnchor();
    createMenuWindow();
    registerMenuIpc();
    registerSearchIpc();
    registerEditorIpc();
    setAppMenu();
    createSearchWindow();
    createTray();
    registerHotkeys();
    buildTemplatesMenu();
    if (isMac && cfg.autoPaste) systemPreferences.isTrustedAccessibilityClient(true);
    setInterval(pollClipboard, cfg.pollMs);
    setInterval(pollRemoteCommands, 400);
  });
  app.on('window-all-closed', () => {
    /* app de bandeja: continua rodando */
  });
  app.on('did-become-active', () => {
    appActive = true;
  });
  app.on('did-resign-active', () => {
    appActive = false;
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  process.on('uncaughtException', (err) => log('uncaughtException', err));
}
