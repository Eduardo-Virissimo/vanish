// Condições que precisam ser verdadeiras antes de mexer numa categoria.
// Motivos e fontes em docs/SAFETY-AUDIT.md.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Blocked } from '../shared/types';
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

/** Devolve o bloqueio, ou undefined se pode seguir */
export async function checkGuard(guard: Guard | undefined): Promise<Blocked | undefined> {
  if (guard === 'no-pending-reboot' && (await rebootPending())) {
    return {
      label: 'Reinicie antes',
      reason: 'Há uma atualização esperando o PC reiniciar para terminar. Reinicie o PC e analise de novo',
    };
  }
  return undefined;
}
