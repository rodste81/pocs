// Importador do regist.dat do CLCL (Windows).
// Formato: clcl-src/core-oficial-nakkag/File.c (file_file_to_item):
//   \x04 titulo \0 ... filhos ... \x05                      -> pasta
//   \x01 titulo \0 data(hex16) \0 janela \0 plugin \0 param \0 "mod,vk,paste" \0 \x02 -> item
//   depois, um bloco por formato (sem marcador entre eles):
//   tamanho \0 nome \0 plugin \0 param \0 opcao \0 \x03 + <tamanho> bytes
// Strings do cabecalho e o formato TEXT estao em ANSI (windows-1252);
// UNICODE TEXT esta em UTF-16LE.
import { ImportStats, TemplateFolder, TemplateItem, TemplateNode } from './types';

const ansi = new TextDecoder('windows-1252');
const utf16 = new TextDecoder('utf-16le');

function cutAtNul(s: string): string {
  const i = s.indexOf('\0');
  return i === -1 ? s : s.slice(0, i);
}

function filetimeToIso(hex: string): string | undefined {
  if (!/^[0-9a-fA-F]{16}$/.test(hex)) return undefined;
  const ms = Number(BigInt('0x' + hex) / 10000n) - 11644473600000;
  if (ms <= 0) return undefined;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function parseRegist(buf: Buffer): { root: TemplateNode[]; stats: ImportStats } {
  const stats: ImportStats = { folders: 0, items: 0, skipped: 0 };
  let p = 0;

  const cstr = (): string => {
    let e = buf.indexOf(0, p);
    if (e === -1) e = buf.length;
    const s = ansi.decode(buf.subarray(p, e));
    p = e + 1;
    return s;
  };

  const parseLevel = (level: number): TemplateNode[] => {
    const out: TemplateNode[] = [];
    while (p < buf.length) {
      const b = buf[p];
      if (b === 0x05) {
        p++;
        if (level > 0) return out;
        continue;
      }
      if (b === 0x04) {
        p++;
        const title = cstr();
        while (p < buf.length && buf[p] !== 0x01 && buf[p] !== 0x04 && buf[p] !== 0x05) p++;
        const folder: TemplateFolder = { type: 'folder', title, children: parseLevel(level + 1) };
        stats.folders++;
        out.push(folder);
        continue;
      }
      if (b === 0x01) {
        p++;
        const head: string[] = [];
        while (p < buf.length && buf[p] !== 0x02 && head.length < 6) head.push(cstr());
        while (p < buf.length && buf[p] !== 0x02) p++;
        p++;
        let unicode: string | undefined;
        let text: string | undefined;
        // blocos de formato: comecam pelo tamanho em ASCII
        while (p < buf.length && buf[p] >= 0x30 && buf[p] <= 0x39) {
          const fh: string[] = [];
          while (p < buf.length && buf[p] !== 0x03 && fh.length < 5) fh.push(cstr());
          while (p < buf.length && buf[p] !== 0x03) p++;
          p++;
          const size = parseInt(fh[0], 10) || 0;
          const data = buf.subarray(p, p + size);
          p += size;
          if (fh[1] === 'UNICODE TEXT') unicode = cutAtNul(utf16.decode(data));
          else if (fh[1] === 'TEXT') text = cutAtNul(ansi.decode(data));
        }
        const body = unicode ?? text;
        if (body === undefined || body.trim() === '') {
          stats.skipped++;
          continue;
        }
        const item: TemplateItem = {
          type: 'item',
          title: head[0] ?? '',
          text: body.replace(/\r\n/g, '\n'),
        };
        const iso = filetimeToIso(head[1] ?? '');
        if (iso) item.modified = iso;
        stats.items++;
        out.push(item);
        continue;
      }
      throw new Error(`regist.dat: byte inesperado 0x${b.toString(16)} na posicao ${p}`);
    }
    return out;
  };

  let root = parseLevel(0);
  // O CLCL costuma ter uma unica pasta-raiz; ela vira o nivel de cima do menu.
  const folders = root.filter((n): n is TemplateFolder => n.type === 'folder');
  if (folders.length === 1) root = [...folders[0].children, ...root.filter((n) => n.type === 'item')];
  return { root, stats };
}
