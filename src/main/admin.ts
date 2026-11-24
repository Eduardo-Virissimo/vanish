// Administrador: saber se o Vanish já roda elevado e reabrir o próprio Vanish com permissão.
// O relançamento sempre usa o executável do próprio app (nunca um caminho vindo da tela).
import { app } from 'electron';
import { execFile } from 'node:child_process';
import { isElevatedGroups } from './integrity';

const run = (file: string, args: string[]) =>
  new Promise<string>((resolve, reject) => {
    execFile(file, args, { windowsHide: true }, (error, stdout) => (error ? reject(error) : resolve(stdout)));
  });

let cached: Promise<boolean> | null = null;

export function isAdmin(): Promise<boolean> {
  cached ??= run('whoami', ['/groups', '/fo', 'csv', '/nh']).then(isElevatedGroups, () => false);
  return cached;
}

/** texto entre aspas simples para o PowerShell ('' escapa a aspa) */
const ps = (s: string) => `'${s.replace(/'/g, "''")}'`;

/**
 * Reabre o Vanish pedindo administrador (o Windows mostra o aviso do UAC).
 * Devolve false se a pessoa recusou; aí o app atual continua aberto.
 */
export async function relaunchAsAdmin(): Promise<boolean> {
  // em desenvolvimento o executável é o electron.exe e precisa da pasta do app como argumento
  const args = app.isPackaged ? [] : [app.getAppPath()];
  const argList = args.length ? ` -ArgumentList ${args.map((a) => ps(`"${a}"`)).join(',')}` : '';
  const command = `Start-Process -FilePath ${ps(process.execPath)}${argList} -Verb RunAs`;

  // a cópia nova precisa da trava de "uma janela só"; devolve se a pessoa cancelar
  app.releaseSingleInstanceLock();
  try {
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command]);
  } catch {
    app.requestSingleInstanceLock();
    return false;
  }
  setTimeout(() => app.quit(), 150);
  return true;
}
