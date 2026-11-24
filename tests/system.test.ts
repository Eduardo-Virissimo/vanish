// Perguntas ao Windows: nível de administrador, SID, discos locais e arquivos da Lixeira.
// Quase tudo testa só a leitura da saída dos comandos; um teste consulta os discos deste PC (só lê).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isInfoFile } from '../src/cleaner/recycle-bin';
import { localDrives, parseDriveLetters, parseSid } from '../src/cleaner/system';
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

test('SID: lido da saída do whoami', () => {
  assert.equal(parseSid('"pc\\ana","S-1-5-21-111-222-333-1001"'), 'S-1-5-21-111-222-333-1001');
  assert.equal(parseSid('erro'), undefined);
});

test('discos: só letras de C a Z, sem repetir', () => {
  assert.deepEqual(parseDriveLetters('C\r\nD\r\n\r\nc\r\nA\r\nlixo\r\nZ'), ['C', 'D', 'Z']);
  assert.deepEqual(parseDriveLetters(''), []);
});

test('discos locais deste PC incluem o do sistema (só lê)', async () => {
  const drives = await localDrives();
  assert.ok(drives.includes((process.env.SystemDrive ?? 'C:').slice(0, 1).toUpperCase()), drives.join(','));
});
