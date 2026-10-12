// Colar varias imagens no macOS sem perder nenhuma e sem esperas fixas.
//
// O problema: o app de destino so le o clipboard depois de receber o Cmd+V, e leva
// um tempo variavel para importar cada imagem. Trocar o clipboard antes disso perde
// imagens; esperar um tempo fixo e lento e mesmo assim pode falhar.
//
// Modo "ack" (padrao): cada imagem e posta no clipboard como uma PROMESSA (o dado so e
// entregue quando alguem pede). Quando o app de destino pede o dado, sabemos que ele
// leu, e so entao passamos para a proxima. O item leva a marca
// org.nspasteboard.TransientType, que os gerenciadores de clipboard (Paste, Maccy, o
// proprio CLCL) respeitam e nao leem, para que so o app de destino dispare o aviso.
// Tudo roda num unico processo osascript (JXA), que tambem envia os Cmd+V.
import { execFile } from 'child_process';

export type MultiImageMode = 'auto' | 'ack' | 'items' | 'files' | 'onebyone';
export const MULTI_IMAGE_MODES: MultiImageMode[] = ['auto', 'ack', 'items', 'files', 'onebyone'];

const ACK_JXA = `
ObjC.import('AppKit');
var state = { provided: false, path: '' };
ObjC.registerSubclass({
  name: 'CLCLPngProvider',
  protocols: ['NSPasteboardItemDataProvider'],
  methods: {
    'pasteboard:item:provideDataForType:': {
      types: ['void', ['id', 'id', 'id']],
      implementation: function (pb, item, type) {
        var t = ObjC.unwrap(type);
        var data = $.NSData.dataWithContentsOfFile(state.path);
        if (t === 'public.tiff') data = $.NSImage.alloc.initWithData(data).TIFFRepresentation;
        item.setDataForType(data, type);
        state.provided = true;
      }
    }
  }
});
function spin(sec) { $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(sec)); }
// Shift, Control, Option ou Command ainda apertados transformariam o Cmd+V em outro atalho
// (Shift+Cmd+V = colar sem formatacao, que ignora imagens). Espera soltar (ate 3 s).
function waitModifiersUp() {
  var t0 = Date.now();
  while ((Number($.NSEvent.modifierFlags) & 0x1E0000) !== 0 && Date.now() - t0 < 3000) spin(0.02);
  return Date.now() - t0;
}
// Reativa o app de destino (sem Apple Events, entao sem pedir permissao).
function activateTarget(bundleId) {
  if (!bundleId) return;
  var apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier(bundleId);
  if (apps.count > 0) apps.objectAtIndex(0).activateWithOptions(2); // NSApplicationActivateIgnoringOtherApps
}
function frontId() {
  var a = $.NSWorkspace.sharedWorkspace.frontmostApplication;
  return a.isNil() ? '?' : ObjC.unwrap(a.bundleIdentifier);
}
function run(argv) {
  var timeoutMs = parseInt(argv[0], 10);
  var target = argv[1];
  var paths = argv.slice(2);
  var notes = [];
  var se = Application('System Events');
  var provider = $.CLCLPngProvider.alloc.init;
  var pb = $.NSPasteboard.generalPasteboard;
  var out = [];
  var waited = 0;
  for (var i = 0; i < paths.length; i++) {
    state.provided = false;
    state.path = paths[i];
    pb.clearContents;
    var item = $.NSPasteboardItem.alloc.init;
    item.setDataProviderForTypes(provider, $(['public.png', 'public.tiff']));
    item.setDataForType($.NSData.data, 'org.nspasteboard.TransientType');
    pb.writeObjects($([item]));
    spin(0.03);
    waited += waitModifiersUp();
    if (frontId() === 'net.robotizze.clcl') { activateTarget(target); spin(0.15); }
    se.keystroke('v', { using: 'command down' });
    var t0 = Date.now();
    // Se o app nao pedir a imagem em 1 s, o Cmd+V provavelmente se perdeu (o app ainda
    // nao estava pronto para teclado): reativa o app de destino e tenta de novo, ate 2 vezes.
    var tries = 1;
    while (!state.provided && Date.now() - t0 < timeoutMs) {
      spin(0.02);
      if (!state.provided && tries < 3 && Date.now() - t0 > 1000 * tries) {
        notes.push('imagem ' + (i + 1) + ': sem leitura em ' + (Date.now() - t0) + ' ms, app da frente ' + frontId() + '; repetindo');
        activateTarget(target);
        spin(0.15);
        se.keystroke('v', { using: 'command down' });
        tries++;
      }
    }
    out.push(state.provided ? Date.now() - t0 : -1);
    if (!state.provided) break;
    spin(0.12);
  }
  return JSON.stringify({ t: out, w: waited, n: notes });
}`;

// Cmd+V para o app da frente, depois de as teclas modificadoras serem soltas.
const PASTE_KEY_JXA = `
ObjC.import('AppKit');
function run(argv) {
  var target = argv[0] || '';
  var t0 = Date.now();
  // Depois de um clique no menu o CLCL pode ser o app da frente (medido: Shift+clique).
  // Nesse caso o Cmd+V iria para ele; devolve a frente ao app de destino antes.
  var front = $.NSWorkspace.sharedWorkspace.frontmostApplication;
  if (target && !front.isNil() && ObjC.unwrap(front.bundleIdentifier) === 'net.robotizze.clcl') {
    var apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier(target);
    if (apps.count > 0) apps.objectAtIndex(0).activateWithOptions(2);
    $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.15));
  }
  while ((Number($.NSEvent.modifierFlags) & 0x1E0000) !== 0 && Date.now() - t0 < 3000) {
    $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.02));
  }
  Application('System Events').keystroke('v', { using: 'command down' });
  return String(Date.now() - t0);
}`;

export function pressPasteKey(targetBundleId = ''): Promise<{ ok: boolean; waitedMs: number; err?: string }> {
  return osa(PASTE_KEY_JXA, [targetBundleId], 8000).then((r) => ({ ok: r.ok, waitedMs: parseInt(r.out, 10) || 0, err: r.err }));
}

const ITEMS_JXA = `
ObjC.import('AppKit');
function run(argv) {
  var pb = $.NSPasteboard.generalPasteboard;
  pb.clearContents;
  var arr = $.NSMutableArray.array;
  for (var i = 0; i < argv.length; i++) {
    var img = $.NSImage.alloc.initWithContentsOfFile(argv[i]);
    if (!img.isNil()) arr.addObject(img);
  }
  return pb.writeObjects(arr) ? 'ok' : 'falhou';
}`;

function osa(script: string, args: string[], timeoutMs: number): Promise<{ ok: boolean; out: string; err?: string }> {
  return new Promise((resolve) => {
    execFile('osascript', ['-l', 'JavaScript', '-e', script, ...args], { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) resolve({ ok: false, out: String(stdout).trim(), err: (String(stderr).trim() || err.message).split('\n')[0] });
      else resolve({ ok: true, out: String(stdout).trim() });
    });
  });
}

// Modo ack: devolve quantas imagens o destino confirmadamente leu (na ordem), e o tempo de cada uma.
export async function pasteImagesAck(
  paths: string[],
  targetBundleId: string,
  perImageTimeoutMs = 4000,
): Promise<{ done: number; times: number[]; waitedMs: number; notes: string[]; err?: string }> {
  const r = await osa(ACK_JXA, [String(perImageTimeoutMs), targetBundleId, ...paths], (perImageTimeoutMs + 3000) * paths.length + 10000);
  if (!r.ok) return { done: 0, times: [], waitedMs: 0, notes: [], err: r.err };
  try {
    const res = JSON.parse(r.out) as { t: number[]; w: number; n: string[] };
    const done = res.t.filter((t) => t >= 0).length;
    return { done, times: res.t, waitedMs: res.w, notes: res.n ?? [] };
  } catch {
    return { done: 0, times: [], waitedMs: 0, notes: [], err: `resposta inesperada: ${r.out.slice(0, 120)}` };
  }
}

// Modo items: todas as imagens num unico clipboard, uma por item (para um Cmd+V so).
export async function setClipboardImageItems(paths: string[]): Promise<boolean> {
  const r = await osa(ITEMS_JXA, paths, 8000);
  return r.ok && r.out === 'ok';
}
