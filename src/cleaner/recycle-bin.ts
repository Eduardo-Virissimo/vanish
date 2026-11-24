// Lixeira: o tamanho é lido de X:\$Recycle.Bin\<SID do usuário> em cada disco;
// para esvaziar usamos o próprio Windows (Clear-RecycleBin), que atualiza o ícone da lixeira.
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { promisify } from 'node:util';
import type { CleanResult, FolderInfo, ScanResult } from '../shared/types';
import { walk } from './fs-walk';
import { currentSid, localDrives } from './system';

const run = promisify(execFile);

/** "$IAB12CD.txt": arquivo de informação da Lixeira (não é o conteúdo apagado) */
export const isInfoFile = (name: string) => /^\$i[a-z0-9]{6}/i.test(name);

/** só discos locais: uma unidade de rede desconectada travaria a análise (system.ts) */
async function recycleRoots(): Promise<string[]> {
  const [sid, drives] = await Promise.all([currentSid(), localDrives()]);
  const roots = drives.map((d) => `${d}:\\$Recycle.Bin\\${sid}`);
  const found = await Promise.all(roots.map((r) => access(r).then(() => true, () => false)));
  return roots.filter((_, i) => found[i]);
}

export async function scanRecycleBin(onPath: (p: string) => void): Promise<ScanResult> {
  const folders: FolderInfo[] = [];
  for (const root of await recycleRoots()) {
    const folder: FolderInfo = { path: root, bytes: 0, files: 0, denied: false, note: 'Esvaziada pelo próprio Windows' };
    await walk(root, {
      onFile: (file, size) => {
        // só o primeiro nível é da própria Lixeira; dentro de uma pasta apagada tudo é do usuário
        const top = dirname(file) === root;
        const name = basename(file);
        if (top && name.toLowerCase() === 'desktop.ini') return;
        folder.bytes += size;
        // cada item apagado vira dois arquivos: $I (data e caminho original) e $R (o conteúdo).
        // Só o conteúdo conta como arquivo, senão "N arquivos" sai dobrado
        if (!(top && isInfoFile(name))) folder.files++;
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
