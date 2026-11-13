// Condições que precisam ser verdadeiras antes de mexer numa categoria.
// Motivos e fontes em docs/SAFETY-AUDIT.md.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Guard } from './types';

const run = promisify(execFile);

/** Chaves que o Windows cria quando uma atualização está esperando reiniciar */
const REBOOT_KEYS = [
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired',
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending',
];

async function keyExists(key: string): Promise<boolean> {
  try {
    await run('reg', ['query', key], { windowsHide: true });
    return true;
  } catch {
    return false; // "reg query" sai com erro quando a chave não existe
  }
}

export async function rebootPending(): Promise<boolean> {
  const found = await Promise.all(REBOOT_KEYS.map(keyExists));
  return found.some(Boolean);
}

/** Devolve o motivo do bloqueio, ou undefined se pode seguir */
export async function checkGuard(guard: Guard | undefined): Promise<string | undefined> {
  if (guard === 'no-pending-reboot' && (await rebootPending())) {
    return 'Reinicie o PC antes: há uma atualização esperando para terminar';
  }
  return undefined;
}
