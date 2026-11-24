// Perguntas ao Windows usadas pelo motor: quem é o usuário (SID) e quais discos são locais.
// A leitura da saída dos comandos fica em funções puras, testadas em tests/system.test.ts.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ALL_LETTERS = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** SID na saída de "whoami /user /fo csv /nh" ("dominio\\nome","S-1-5-21-...") */
export const parseSid = (stdout: string) => stdout.match(/"(S-1-[\d-]+)"/)?.[1];

let sid: Promise<string> | null = null;

/** SID do usuário que roda o Vanish (não muda enquanto o app está aberto) */
export function currentSid(): Promise<string> {
  sid ??= run('whoami', ['/user', '/fo', 'csv', '/nh'], { windowsHide: true }).then(({ stdout }) => {
    const found = parseSid(stdout);
    if (!found) throw new Error('SID do usuário não encontrado');
    return found;
  });
  sid.catch(() => { sid = null; }); // falhou: tenta de novo na próxima vez
  return sid;
}

/** letras de disco, uma por linha ("C", "D"...), de C a Z; ignora o resto */
export const parseDriveLetters = (stdout: string) =>
  [...new Set(stdout.split(/\r?\n/).map((l) => l.trim().toUpperCase()).filter((l) => /^[C-Z]$/.test(l)))];

/**
 * Discos locais (fixos e removíveis). Unidades de rede ficam de fora: checar uma unidade mapeada
 * e desconectada pode travar dezenas de segundos esperando a rede. Se a consulta falhar, devolve
 * todas as letras (o comportamento antigo), para a Lixeira nunca sumir da análise.
 */
export async function localDrives(): Promise<string[]> {
  try {
    const { stdout } = await run('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      "[IO.DriveInfo]::GetDrives() | Where-Object { $_.DriveType -in 'Fixed','Removable' } | ForEach-Object { $_.Name.Substring(0,1) }",
    ], { windowsHide: true, timeout: 15_000 });
    const letters = parseDriveLetters(stdout);
    return letters.length ? letters : ALL_LETTERS;
  } catch {
    return ALL_LETTERS;
  }
}
