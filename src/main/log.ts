// Registro de erros em arquivo, para investigar um problema relatado (o console não aparece no app
// instalado). Fica só no PC: %APPDATA%\Vanish\logs\vanish.log, até ~1 MB (o anterior vira
// vanish.old.log). Nunca envia nada pela internet e nunca derruba o app se não conseguir gravar.
import { app } from 'electron';
import { appendFile, mkdir, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';

const MAX_BYTES = 1024 * 1024;

/** uma linha do registro: data, onde aconteceu e a mensagem (com a pilha, se houver) */
export function formatLine(when: Date, where: string, error: unknown): string {
  const detail = error instanceof Error ? (error.stack ?? `${error.name}: ${error.message}`) : String(error);
  return `${when.toISOString()} [${where}] ${detail.replace(/\r?\n/g, '\n    ')}\n`;
}

let queue: Promise<void> = Promise.resolve();

async function write(line: string) {
  const dir = app.getPath('logs');
  const file = join(dir, 'vanish.log');
  await mkdir(dir, { recursive: true });
  const size = await stat(file).then((s) => s.size, () => 0);
  if (size > MAX_BYTES) await rename(file, join(dir, 'vanish.old.log')).catch(() => {});
  await appendFile(file, line, 'utf8');
}

/** registra um erro; as gravações vão em fila, uma de cada vez */
export function logError(where: string, error: unknown): void {
  const line = formatLine(new Date(), where, error);
  if (!app.isPackaged) process.stderr.write(line); // em desenvolvimento, também no terminal
  queue = queue.then(() => write(line)).catch(() => { /* sem disco ou sem permissão: segue sem registro */ });
}

/** erros que escapariam sem ninguém ver: registra em vez de sumir */
export function logUncaught(): void {
  process.on('uncaughtException', (error) => logError('erro não tratado', error));
  process.on('unhandledRejection', (reason) => logError('promessa rejeitada', reason));
}
