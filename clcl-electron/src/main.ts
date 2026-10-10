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
function useText(text: string, copyOnly: boolean, fromTemplate: boolean, pasteDelay = 120): void {
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
  const small = img.resize({ width: 48, quality: 'good' }).toBitmap();
  const key = `${width}x${height}-${createHash('sha1').update(small).digest('hex')}`;
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
  if (openMenu && anchor && !anchor.isDestroyed()) openMenu.closePopup(anchor);
  win.show();
  win.focus();
  win.webContents.send('search:show');
  // o painel costuma receber o teclado sem ativar o app; se nao recebeu, ativa o app
  setTimeout(() => {
    if (win.isDestroyed() || !win.isVisible()) return;
    const focused = win.isFocused();
    log('busca aberta, focada =', focused);
    if (!focused) {
      searchShownAt = Date.now();
      if (isMac) app.focus({ steal: true });
      win.focus();
      setTimeout(() => log('busca: apos ativar o app, focada =', !win.isDestroyed() && win.isFocused()), 200);
    }
  }, 150);
}

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

// ---------- popup, bandeja, atalhos ----------

// No macOS as janelas de apoio sao "panel": aparecem por cima de apps em tela cheia
// e em qualquer mesa (Space), e recebem o teclado sem tirar o app do usuario da frente.
const floatingOptions: Electron.BrowserWindowConstructorOptions = isMac ? { type: 'panel' } : {};
function floatOverEverything(win: BrowserWindow): void {
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
}

// Menu.popup precisa de uma janela: usamos uma janela invisivel de 1x1 sob o
// cursor, mostrada sem ativar o app, para o foco continuar na janela do usuario.
// `kind` identifica o menu: o mesmo atalho de novo fecha; outro atalho troca de menu.
function popupAtCursor(menu: Menu, kind = 'menu'): void {
  if (!anchor || anchor.isDestroyed()) return;
  const win = anchor;
  if (openMenu) {
    const same = openKind === kind;
    log('menu ja aberto:', openKind, same ? '-> fecha' : `-> troca para ${kind}`);
    openMenu.closePopup(win);
    if (!same) setTimeout(() => popupAtCursor(kind === 'salvos' ? buildTemplatesMenu() : kind === 'clipboard' ? buildHistoryMenu() : menu, kind), 120);
    return;
  }
  const pt = screen.getCursorScreenPoint();
  win.setBounds({ x: pt.x, y: pt.y, width: 1, height: 1 });
  win.showInactive();
  openMenu = menu;
  openKind = kind;
  log('popup', kind, menu.items.length, 'itens em', pt.x, pt.y);
  menu.popup({
    window: win,
    x: 0,
    y: 0,
    callback: () => {
      openMenu = undefined;
      openKind = '';
      win.hide();
      log('popup fechado');
    },
  });
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
      { label: `Itens salvos (${cfg.hotkeyTemplates})`, click: () => popupAtCursor(buildTemplatesMenu()) },
      { label: `Clipboard (${cfg.hotkeyHistory})`, click: () => popupAtCursor(buildHistoryMenu()) },
      { label: `Buscar… (${cfg.hotkeySearch})`, click: toggleSearch },
      { label: 'Editar itens salvos…', click: () => openEditor() },
      { type: 'separator' },
      { label: 'Importar regist.dat…', click: () => void importDialog() },
      {
        label: 'Recarregar itens salvos do arquivo',
        click: () => {
          templates = store.loadTemplates();
          templatesMenu = undefined;
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
  reg(cfg.hotkeyTemplates, () => popupAtCursor(buildTemplatesMenu(), 'salvos'));
  reg(cfg.hotkeyHistory, () => popupAtCursor(buildHistoryMenu(), 'clipboard'));
  reg(cfg.hotkeySearch, toggleSearch);
  if (failed.length) notify(`Não consegui registrar o atalho: ${failed.join(', ')}. Ajuste em config.json.`);
}

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
    registerSearchIpc();
    registerEditorIpc();
    setAppMenu();
    createSearchWindow();
    createTray();
    registerHotkeys();
    buildTemplatesMenu();
    if (isMac && cfg.autoPaste) systemPreferences.isTrustedAccessibilityClient(true);
    setInterval(pollClipboard, cfg.pollMs);
  });
  app.on('window-all-closed', () => {
    /* app de bandeja: continua rodando */
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  process.on('uncaughtException', (err) => log('uncaughtException', err));
}
