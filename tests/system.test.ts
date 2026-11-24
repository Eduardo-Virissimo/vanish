// Leituras do Windows que não precisam de disco: nível de administrador e arquivos da Lixeira.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isInfoFile } from '../src/cleaner/recycle-bin';
import { isElevatedGroups } from '../src/main/integrity';

// linhas de "whoami /groups /fo csv /nh" (o nome do grupo muda com o idioma; o SID não)
const MEDIUM = '"Rótulo Obrigatório\\Nível Obrigatório Médio","Rótulo","S-1-16-8192",""';
const HIGH = '"Mandatory Label\\High Mandatory Level","Label","S-1-16-12288",""';
const SYSTEM = '"Mandatory Label\\System Mandatory Level","Label","S-1-16-16384",""';

test('administrador: só nível alto ou de sistema contam como elevado', () => {
  assert.equal(isElevatedGroups(MEDIUM), false);
  assert.equal(isElevatedGroups(HIGH), true);
  assert.equal(isElevatedGroups(SYSTEM), true);
  assert.equal(isElevatedGroups(''), false);
  assert.equal(isElevatedGroups('"x","y","S-1-16-122880",""'), false, 'SID parecido não conta');
});

test('Lixeira: $I é informação, $R é o conteúdo', () => {
  assert.equal(isInfoFile('$IAB12CD.txt'), true);
  assert.equal(isInfoFile('$iab12cd'), true);
  assert.equal(isInfoFile('$RAB12CD.txt'), false);
  assert.equal(isInfoFile('desktop.ini'), false);
  assert.equal(isInfoFile('$I.txt'), false, 'nome curto demais não é da Lixeira');
});
