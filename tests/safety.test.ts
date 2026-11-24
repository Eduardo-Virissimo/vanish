// Regras de lugar seguro na hora de rodar (src/cleaner/safety.ts), com variáveis de ambiente
// falsas: imita PCs onde TEMP ou LOCALAPPDATA apontam para lugares errados. Não toca no disco.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categories } from '../src/cleaner/categories';
import { pathProblem, unsafeRoots, type Bases } from '../src/cleaner/safety';

const NORMAL: Bases = {
  local: 'C:\\Users\\ana\\AppData\\Local',
  roaming: 'C:\\Users\\ana\\AppData\\Roaming',
  temp: 'C:\\Users\\ana\\AppData\\Local\\Temp',
  windir: 'C:\\Windows',
  programdata: 'C:\\ProgramData',
  home: 'C:\\Users\\ana',
};

test('caminhos normais passam', () => {
  for (const p of [
    NORMAL.temp,
    'C:\\Windows\\Temp',
    'C:\\Windows\\SoftwareDistribution\\Download',
    'C:\\Users\\ana\\AppData\\Local\\npm-cache',
    'C:\\Users\\ana\\AppData\\Roaming\\discord\\Cache',
    'C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportQueue',
  ]) assert.equal(pathProblem(p, NORMAL), undefined, p);
});

test('TEMP no nome curto do Windows (RUNNER~1) continua valendo', () => {
  const bases = { ...NORMAL, temp: 'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp' };
  assert.equal(pathProblem(bases.temp, bases), undefined);
});

test('TEMP apontando para a raiz de um disco é recusado', () => {
  for (const temp of ['C:\\', 'D:\\', 'C:']) {
    const bases = { ...NORMAL, temp };
    assert.ok(pathProblem(temp, bases), `TEMP=${temp}`);
  }
});

test('TEMP apontando para pastas do usuário ou do sistema é recusado', () => {
  for (const temp of [
    'C:\\Users\\ana', 'C:\\Users\\ana\\Downloads', 'D:\\Downloads', 'C:\\Users\\ana\\Desktop',
    'C:\\Windows', 'C:\\Program Files', 'C:\\Users\\ana\\AppData', 'C:\\Users\\ana\\AppData\\Local',
  ]) {
    assert.ok(pathProblem(temp, { ...NORMAL, temp }), `TEMP=${temp}`);
  }
});

test('TEMP em outra pasta chamada Temp é aceito (ex.: C:\\Temp)', () => {
  assert.equal(pathProblem('C:\\Temp', { ...NORMAL, temp: 'C:\\Temp' }), undefined);
  assert.equal(pathProblem('D:\\tmp', { ...NORMAL, temp: 'D:\\tmp' }), undefined);
});

test('LOCALAPPDATA ou APPDATA fora do formato bloqueiam o que está dentro deles', () => {
  const local = { ...NORMAL, local: 'C:\\' };
  assert.ok(pathProblem('C:\\npm-cache', local));
  const roaming = { ...NORMAL, roaming: 'C:\\Users\\ana' };
  assert.ok(pathProblem('C:\\Users\\ana\\discord\\Cache', roaming));
  const windir = { ...NORMAL, windir: 'C:\\' };
  assert.ok(pathProblem('C:\\Temp', windir));
});

test('dados do usuário e contêineres de perfis são recusados mesmo dentro da área', () => {
  assert.ok(pathProblem('C:\\Users\\ana\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\IndexedDB', NORMAL));
  assert.ok(pathProblem('C:\\Users\\ana\\AppData\\Local\\Google\\Chrome\\User Data', NORMAL));
  assert.ok(pathProblem('C:\\Users\\ana\\AppData\\Local', NORMAL), 'a própria área inteira');
});

test('um caminho ruim bloqueia a categoria inteira, com o motivo', () => {
  const bases = { ...NORMAL, temp: 'C:\\' };
  const blocked = unsafeRoots(['C:\\Windows\\Temp', 'C:\\'], bases);
  assert.ok(blocked);
  assert.equal(blocked.label, 'Bloqueada');
  assert.match(blocked.reason, /C:\\/);
  assert.equal(unsafeRoots(['C:\\Windows\\Temp', NORMAL.temp], NORMAL), undefined);
});

test('as categorias reais passam nas regras com as pastas deste PC', () => {
  for (const c of categories) {
    const paths = (c.targets ?? []).map((t) => t.path);
    assert.equal(unsafeRoots(paths), undefined, c.id);
  }
});
