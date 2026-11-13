// Roda os testes de tests/*.test.ts: compila com o esbuild para .tmp/tests e usa o
// executor de testes do próprio Node (node --test). Rodar: npm test
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { readdir, rm } from 'node:fs/promises';

const files = (await readdir('tests')).filter((f) => f.endsWith('.test.ts'));
await rm('.tmp/tests', { recursive: true, force: true });
await esbuild.build({
  entryPoints: files.map((f) => `tests/${f}`),
  outdir: '.tmp/tests',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  logLevel: 'warning',
});

const outputs = files.map((f) => `.tmp/tests/${f.replace(/\.ts$/, '.mjs')}`);
const run = spawnSync(process.execPath, ['--test', ...outputs], { stdio: 'inherit' });
process.exit(run.status ?? 1);
