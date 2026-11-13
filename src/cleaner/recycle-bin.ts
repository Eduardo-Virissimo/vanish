// Lixeira: o tamanho é lido de X:\$Recycle.Bin\<SID do usuário> em cada disco;
// para esvaziar usamos o próprio Windows (Clear-RecycleBin), que atualiza o ícone da lixeira.
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { basename } from 'node:path';
import { promisify } from 'node:util';
import type { CleanResult, FolderInfo, ScanResult } from '../shared/types';
import { walk } from './fs-walk';

const run = promisify(execFile);
const DRIVES = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

async function currentSid(): Promise<string> {
  const { stdout } = await run('whoami', ['/user', '/fo', 'csv', '/nh'], { windowsHide: true });
  const sid = stdout.match(/"(S-[\d-]+)"/)?.[1];
  if (!sid) throw new Error('SID do usuário não encontrado');
  return sid;
}

async function recycleRoots(): Promise<string[]> {
  const sid = await currentSid();
  const roots = DRIVES.map((d) => `${d}:\\$Recycle.Bin\\${sid}`);
  const found = await Promise.all(roots.map((r) => access(r).then(() => true, () => false)));
  return roots.filter((_, i) => found[i]);
}

export async function scanRecycleBin(onPath: (p: string) => void): Promise<ScanResult> {
  const folders: FolderInfo[] = [];
  for (const root of await recycleRoots()) {
    const folder: FolderInfo = { path: root, bytes: 0, files: 0, denied: false, note: 'Esvaziada pelo próprio Windows' };
    await walk(root, {
      onFile: (file, size) => {
        if (basename(file).toLowerCase() === 'desktop.ini') return;
        folder.bytes += size;
        folder.files++;
        onPath(file);
      },
    });
    folders.push(folder);
  }
  return {
    bytes: folders.reduce((sum, f) => sum + f.bytes, 0),
    files: folders.reduce((sum, f) => sum + f.files, 0),
    denied: false,
    folders,
  };
}

export async function emptyRecycleBin(onPath: (p: string) => void): Promise<CleanResult> {
  const before = await scanRecycleBin(() => {});
  onPath('Lixeira');
  await run('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command',
    'Clear-RecycleBin -Force -ErrorAction SilentlyContinue',
  ], { windowsHide: true });
  const after = await scanRecycleBin(() => {});
  return {
    freed: Math.max(0, before.bytes - after.bytes),
    removed: Math.max(0, before.files - after.files),
    skipped: after.files,
    folders: after.folders,
  };
}
