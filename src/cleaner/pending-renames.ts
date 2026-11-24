// Arquivos que o Windows vai trocar ou apagar na próxima reinicialização (instaladores e
// atualizações agendam isso em PendingFileRenameOperations). Apagar um deles antes do reinício
// pode fazer a instalação falhar, então o motor pula esses arquivos em qualquer categoria.
// Fonte: documentação do MoveFileEx (MOVEFILE_DELAY_UNTIL_REBOOT), Microsoft Learn.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const KEY = String.raw`HKLM\SYSTEM\CurrentControlSet\Control\Session Manager`;
const VALUE = 'PendingFileRenameOperations';

/**
 * Lê a saída do "reg query ... /v PendingFileRenameOperations". O valor é uma lista de pares
 * (origem, destino; destino vazio = apagar) separados por "\0" na saída, cada caminho com o
 * prefixo "\??\" e às vezes um marcador como "*1". Devolve todos os caminhos em minúsculas.
 */
export function parsePendingRenames(stdout: string): Set<string> {
  const line = stdout.split(/\r?\n/).find((l) => l.includes(VALUE));
  const data = line?.split(/REG_MULTI_SZ\s+/)[1];
  const paths = new Set<string>();
  if (!data) return paths;
  for (const raw of data.split('\\0')) {
    const path = raw.trim().replace(/^\*\d+/, '').replace(/^\\\?\?\\/, '');
    if (/^[a-z]:\\/i.test(path)) paths.add(path.toLowerCase());
  }
  return paths;
}

let cache: { at: number; paths: Promise<Set<string>> } | null = null;
const FRESH_MS = 10_000; // uma análise consulta uma vez, não uma vez por categoria

/** caminhos agendados para a próxima reinicialização (vazio se não houver ou não der para ler) */
export function pendingRenames(): Promise<Set<string>> {
  if (cache && Date.now() - cache.at < FRESH_MS) return cache.paths;
  const paths = run('reg', ['query', KEY, '/v', VALUE], { windowsHide: true })
    .then(({ stdout }) => parsePendingRenames(stdout), () => new Set<string>()); // sem o valor, o reg sai com erro
  cache = { at: Date.now(), paths };
  return paths;
}
