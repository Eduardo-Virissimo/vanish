// Arquivos agendados para a próxima reinicialização (PendingFileRenameOperations): leitura da saída
// do "reg query" e o motor pulando esses arquivos. Pastas falsas no temporário; nunca pastas reais.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { walk } from '../src/cleaner/fs-walk';
import { parsePendingRenames } from '../src/cleaner/pending-renames';

// saída real do reg.exe (Windows 11), com o marcador "*1" e um par origem → destino
const REG = [
  '',
  String.raw`HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager`,
  String.raw`    PendingFileRenameOperations    REG_MULTI_SZ    *1\??\C:\Windows\System32\gamingservicesproxy_17.dll.0\0\0\??\C:\Users\Ana\AppData\Local\Temp\setup 1\a.tmp\0\??\C:\Program Files\App\a.dll`,
  '',
].join('\r\n');

test('lê os caminhos agendados, sem prefixos, em minúsculas', () => {
  assert.deepEqual([...parsePendingRenames(REG)].sort(), [
    String.raw`c:\program files\app\a.dll`,
    String.raw`c:\users\ana\appdata\local\temp\setup 1\a.tmp`,
    String.raw`c:\windows\system32\gamingservicesproxy_17.dll.0`,
  ]);
});

test('sem o valor (ou saída estranha), não há nada agendado', () => {
  assert.equal(parsePendingRenames('').size, 0);
  assert.equal(parsePendingRenames('ERRO: o sistema não pôde localizar a chave').size, 0);
});

const ROOT = mkdtempSync(join(tmpdir(), 'vanish-pending-'));
after(() => rmSync(ROOT, { recursive: true, force: true }));

test('o motor nunca conta nem entrega um arquivo agendado', async () => {
  mkdirSync(join(ROOT, 'sub'), { recursive: true });
  const kept = join(ROOT, 'sub', 'agendado.dll');
  const other = join(ROOT, 'lixo.tmp');
  writeFileSync(kept, 'x');
  writeFileSync(other, 'x');
  const seen: string[] = [];
  await walk(ROOT, { skip: new Set([kept.toUpperCase().toLowerCase()]), onFile: (f) => { seen.push(f); } });
  assert.deepEqual(seen, [other]);
  assert.ok(existsSync(kept));
});
