import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { TemplateNode } from './types';

export interface Config {
  hotkeyTemplates: string; // menu dos itens salvos
  hotkeyHistory: string; // menu do clipboard (historico)
  historyMax: number;
  pollMs: number;
  autoPaste: boolean;
  registPath: string; // regist.dat usado na primeira carga
}

const defaults: Config = {
  hotkeyTemplates: 'Control+Q',
  hotkeyHistory: 'Control+W',
  historyMax: 30,
  pollMs: 300,
  autoPaste: true,
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
  if (!saved) writeJson('config.json', cfg);
  return cfg;
}

export const hasTemplates = (): boolean => fs.existsSync(file('templates.json'));
export const loadTemplates = (): TemplateNode[] => readJson<TemplateNode[]>('templates.json') ?? [];
export const saveTemplates = (root: TemplateNode[]): void => writeJson('templates.json', root);
export const loadHistory = (): string[] => readJson<string[]>('history.json') ?? [];
export const saveHistory = (items: string[]): void => writeJson('history.json', items);
