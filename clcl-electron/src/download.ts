// Download de video a partir de um link (X/Twitter, YouTube, etc.) usando o yt-dlp
// instalado na maquina. O link vai como argumento separado (sem shell).
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Apps abertos pelo Finder nao herdam o PATH do terminal: procurar nos lugares usuais.
const EXTRA_DIRS = ['/opt/homebrew/bin', '/usr/local/bin', path.join(os.homedir(), '.local/bin'), path.join(os.homedir(), 'bin')];

export function toolPath(): string {
  return [...EXTRA_DIRS, ...(process.env.PATH ?? '').split(path.delimiter)].filter(Boolean).join(path.delimiter);
}

export function findYtDlp(): string | undefined {
  const names = process.platform === 'win32' ? ['yt-dlp.exe'] : ['yt-dlp'];
  for (const dir of toolPath().split(path.delimiter)) {
    for (const name of names) {
      const full = path.join(dir, name);
      try {
        fs.accessSync(full, fs.constants.X_OK);
        return full;
      } catch {
        /* nao esta aqui */
      }
    }
  }
  return undefined;
}

export function parseVideoUrl(input: string): URL | undefined {
  const text = input.trim();
  if (!/^https?:\/\/\S+$/i.test(text)) return undefined;
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}

export interface DownloadResult {
  ok: boolean;
  file?: string; // caminho final do video
  error?: string; // ultima linha de erro do yt-dlp
  missingTool?: boolean;
}

export function downloadVideo(input: string, destDir: string): Promise<DownloadResult> {
  const url = parseVideoUrl(input);
  if (!url) return Promise.resolve({ ok: false, error: 'Link inválido.' });
  const bin = findYtDlp();
  if (!bin) return Promise.resolve({ ok: false, missingTool: true, error: 'yt-dlp não está instalado.' });
  const args = [
    '--no-playlist',
    '--no-progress',
    '-S', 'ext:mp4:m4a', // prefere mp4, que abre em qualquer player
    '-P', destDir,
    '-o', '%(uploader,channel|video)s - %(title).60s [%(id)s].%(ext)s',
    '--print', 'after_move:filepath',
    '--', url.toString(),
  ];
  return new Promise((resolve) => {
    execFile(bin, args, { env: { ...process.env, PATH: toolPath() }, maxBuffer: 8 * 1024 * 1024, timeout: 30 * 60 * 1000 }, (err, stdout, stderr) => {
      const file = String(stdout).split('\n').map((l) => l.trim()).filter(Boolean).pop();
      if (!err && file && fs.existsSync(file)) {
        resolve({ ok: true, file });
        return;
      }
      const lines = String(stderr).split('\n').map((l) => l.trim()).filter(Boolean);
      const last = lines.filter((l) => l.startsWith('ERROR')).pop() ?? lines.pop() ?? (err ? err.message : 'O yt-dlp não devolveu nenhum arquivo.');
      resolve({ ok: false, error: last.replace(/^ERROR:\s*/, '').slice(0, 300) });
    });
  });
}
