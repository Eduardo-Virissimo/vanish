// Testa o motor (análise e limpeza) em pastas falsas criadas no diretório temporário.
// Nunca toca em pastas reais do PC.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, beforeEach, test } from 'node:test';
import { cleanCategory, scanCategory } from '../src/cleaner/engine';
import { expand } from '../src/cleaner/fs-walk';
import { SYSTEM_BASES, type Bases } from '../src/cleaner/safety';
import { defineCategory, type Target } from '../src/cleaner/types';

const ROOT = mkdtempSync(join(tmpdir(), 'vanish-test-'));
// as pastas falsas imitam um AppDataLocal, para passar nas regras de lugar seguro (safety.ts)
const LOCAL = join(ROOT, 'AppData', 'Local');
const CACHE = join(LOCAL, 'cache');
const BASES: Bases = { ...SYSTEM_BASES, local: LOCAL, home: ROOT };
const OUTSIDE = join(ROOT, 'fora');
const DAY = 24 * 60 * 60 * 1000;

/** cria um arquivo; ageMs muda só a data de modificação (como um zip extraído agora) */
const file = (path: string, bytes: number, ageMs = 0) => {
  writeFileSync(path, Buffer.alloc(bytes));
  if (ageMs) {
    const when = new Date(Date.now() - ageMs);
    utimesSync(path, when, when);
  }
};

/** muda a data de CRIAÇÃO (o Node não sabe; o PowerShell sabe) */
const created = (path: string, ageMs: number) => execFileSync('powershell.exe', [
  '-NoProfile', '-NonInteractive', '-Command',
  `(Get-Item -LiteralPath '${path}').CreationTime = (Get-Date).AddMilliseconds(-${ageMs})`,
], { windowsHide: true });

/** arquivo velho de verdade: criado e modificado há ageMs */
const oldFile = (path: string, bytes: number, ageMs: number) => {
  file(path, bytes, ageMs);
  created(path, ageMs);
};

const category = (targets: Target[]) =>
  defineCategory({ id: 'teste', name: 'Teste', color: '#000000', icon: 'currentColor', hint: 'teste', targets });

const noop = () => {};
const clean = (targets: Target[]) => cleanCategory(category(targets), { onPath: noop, onFreed: noop }, BASES);
const scan = (targets: Target[]) => scanCategory(category(targets), noop, BASES);

beforeEach(() => {
  rmSync(ROOT, { recursive: true, force: true });
  mkdirSync(join(CACHE, 'sub', 'fundo'), { recursive: true });
  mkdirSync(OUTSIDE, { recursive: true });
  file(join(CACHE, 'a.bin'), 5000);
  file(join(CACHE, 'sub', 'fundo', 'b.bin'), 3000);
  file(join(CACHE, 'somente-leitura.bin'), 1000);
  chmodSync(join(CACHE, 'somente-leitura.bin'), 0o444);
  writeFileSync(join(OUTSIDE, 'importante.txt'), 'não apagar');
  // junção dentro do cache apontando para fora: nunca pode ser seguida
  symlinkSync(OUTSIDE, join(CACHE, 'atalho'), 'junction');
});

after(() => rmSync(ROOT, { recursive: true, force: true }));

test('análise soma os arquivos sem seguir a junção', async () => {
  const r = await scan([{ path: CACHE }]);
  assert.equal(r.bytes, 9000);
  assert.equal(r.files, 3);
  assert.equal(r.folders.length, 1);
  assert.equal(r.folders[0].path, CACHE);
});

test('limpeza apaga o conteúdo, mantém a pasta e não sai pela junção', async () => {
  const r = await clean([{ path: CACHE }]);
  assert.equal(r.freed, 9000);
  assert.equal(r.removed, 3);
  assert.equal(r.skipped, 0);
  assert.ok(existsSync(CACHE), 'a pasta raiz continua existindo');
  assert.ok(!existsSync(join(CACHE, 'sub')), 'subpastas vazias são removidas');
  assert.equal(readFileSync(join(OUTSIDE, 'importante.txt'), 'utf8'), 'não apagar');
});

test('idade mínima: arquivos novos ficam', async () => {
  oldFile(join(CACHE, 'velho.tmp'), 100, 2 * DAY);
  file(join(CACHE, 'novo.tmp'), 100);
  const r = await scan([{ path: CACHE, minAgeMs: DAY }]);
  assert.equal(r.files, 1, 'só o arquivo velho conta');
  await clean([{ path: CACHE, minAgeMs: DAY }]);
  assert.ok(!existsSync(join(CACHE, 'velho.tmp')));
  assert.ok(existsSync(join(CACHE, 'novo.tmp')));
});

test('filtro por nome e sem entrar em subpastas', async () => {
  file(join(CACHE, 'thumbcache_1.db'), 10);
  const r = await clean([{ path: CACHE, match: /^thumbcache_.*\.db$/i, shallow: true }]);
  assert.equal(r.removed, 1);
  assert.ok(existsSync(join(CACHE, 'a.bin')), 'arquivos fora do padrão ficam');
  assert.ok(existsSync(join(CACHE, 'sub', 'fundo', 'b.bin')), 'subpastas não são visitadas');
});

test('pasta que não existe não dá erro', async () => {
  const r = await scan([{ path: join(LOCAL, 'nao-existe') }]);
  assert.equal(r.bytes, 0);
  assert.equal(r.folders.length, 0);
});

test('"*" vale uma subpasta inteira ou um trecho do nome', async () => {
  for (const d of ['webcache_1', 'webcache_22', 'outra']) mkdirSync(join(LOCAL, 'launcher', d), { recursive: true });
  const any = await expand(join(LOCAL, 'launcher', '*'));
  const web = await expand(join(LOCAL, 'launcher', 'webcache*'));
  assert.equal(any.length, 3);
  assert.deepEqual(web.map((p) => p.split(/[\\/]/).pop()).sort(), ['webcache_1', 'webcache_22']);
  const viaJunction = await expand(join(CACHE, '*'));
  assert.ok(!viaJunction.some((p) => p.endsWith('atalho')), 'junção não entra no "*"');
});

test('idade mínima: arquivo extraído agora com data antiga (zip, instalador) fica', async () => {
  // modificado "há 2 dias" (data que veio no zip), mas criado agora: é de um instalador rodando
  file(join(CACHE, 'extraido.dll'), 100, 2 * DAY);
  const r = await scan([{ path: CACHE, minAgeMs: DAY }]);
  assert.equal(r.files, 0, 'não conta');
  await clean([{ path: CACHE, minAgeMs: DAY }]);
  assert.ok(existsSync(join(CACHE, 'extraido.dll')), 'não apaga');
});

test('pasta fora do lugar seguro bloqueia a categoria: nem lê, nem apaga', async () => {
  // OUTSIDE não está no AppDataLocal falso: é como um TEMP apontando para outro lugar
  const r = await scan([{ path: CACHE }, { path: OUTSIDE }]);
  assert.ok(r.blocked, 'bloqueada');
  assert.equal(r.bytes, 0);
  assert.equal(r.folders.length, 0);
  const c = await clean([{ path: CACHE }, { path: OUTSIDE }]);
  assert.equal(c.removed, 0);
  assert.equal(readFileSync(join(OUTSIDE, 'importante.txt'), 'utf8'), 'não apagar');
  assert.ok(existsSync(join(CACHE, 'a.bin')), 'nem a pasta boa da mesma categoria é limpa');
});
