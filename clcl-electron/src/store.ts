import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { TemplateNode } from './types';

export interface Config {
  hotkeyTemplates: string; // menu dos itens salvos
  hotkeyHistory: string; // menu do clipboard (historico)
  hotkeySearch: string; // janela de busca
  historyMax: number;
  pollMs: number;
  autoPaste: boolean;
  menuImageHeight: number; // altura (px) da miniatura das imagens no menu, de 16 a 256
  registPath: string; // regist.dat usado na primeira carga
}

const defaults: Config = {
  hotkeyTemplates: 'Control+Q',
  hotkeyHistory: 'Control+W',
  hotkeySearch: 'Control+E',
  historyMax: 30,
  pollMs: 300,
  autoPaste: true,
  menuImageHeight: 48,
  registPath: '',
};

const file = (name: string): string => path.join(app.getPath('userData'), name);

function readJson<T>(name: string): T | undefined {
  try {
    return JSON.parse(fs.readFileSync(file(name), 'utf8')) as T;
  } catch {
    return undefined;
  }
}

function writeJson(name: string, data: unknown): void {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  const tmp = file(name) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file(name));
}

export const paths = {
  config: (): string => file('config.json'),
  templates: (): string => file('templates.json'),
  history: (): string => file('history.json'),
};

export function loadConfig(): Config {
  const saved = readJson<Partial<Config>>('config.json');
  const cfg = { ...defaults, ...(saved ?? {}) };
  if (!saved || Object.keys(defaults).some((k) => !(k in saved))) writeJson('config.json', cfg);
  return cfg;
}

export const hasTemplates = (): boolean => fs.existsSync(file('templates.json'));
export const loadTemplates = (): TemplateNode[] => readJson<TemplateNode[]>('templates.json') ?? [];
export const saveTemplates = (root: TemplateNode[]): void => writeJson('templates.json', root);
// Item do historico: texto puro ou imagem (PNG gravado em images/).
export interface HistoryImage {
  image: string; // nome do arquivo em images/ (a miniatura e <nome>.thumb.png)
  key: string; // assinatura para detectar duplicata
  width: number;
  height: number;
}
export type HistoryEntry = string | HistoryImage;

export const THUMB_MAX = 256; // altura maxima da miniatura gravada
export const imagesDir = (): string => file('images');
export const loadHistory = (): HistoryEntry[] => readJson<HistoryEntry[]>('history.json') ?? [];
export const saveHistory = (items: HistoryEntry[]): void => writeJson('history.json', items);
