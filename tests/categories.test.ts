// Guarda-costas das categorias: roda em toda mudança (`npm test`) e recusa qualquer categoria
// que aponte para um lugar perigoso ou que esteja incompleta. Regras em docs/MAINTENANCE.md.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, parse, sep } from 'node:path';
import { test } from 'node:test';
import { categories } from '../src/cleaner/categories';
import {
  CONTAINERS, SYSTEM_BASES, USER_DATA_NAMES, allowedAreas, forbiddenFolders, inside, same,
} from '../src/cleaner/safety';

// As regras moram em src/cleaner/safety.ts: as mesmas valem aqui e no app, na hora de limpar.
const lower = (p: string) => p.toLowerCase();
const ALLOWED = allowedAreas(SYSTEM_BASES);
const FORBIDDEN = forbiddenFolders(SYSTEM_BASES);

const targetsOf = (c: (typeof categories)[number]) => c.targets ?? [];

test('cada arquivo de categoria está registrado e tem o id igual ao nome do arquivo', () => {
  const files = readdirSync(join('src', 'cleaner', 'categories'))
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts' && !f.startsWith('_'))
    .map((f) => f.replace(/\.ts$/, ''))
    .sort();
  assert.deepEqual([...categories.map((c) => c.id)].sort(), files);
});

test('ids e cores são únicos e bem formados', () => {
  const ids = categories.map((c) => c.id);
  const colors = categories.map((c) => c.color.toUpperCase());
  assert.equal(new Set(ids).size, ids.length, 'id repetido');
  assert.equal(new Set(colors).size, colors.length, 'cor repetida');
  for (const c of categories) {
    assert.match(c.id, /^[a-z][a-z0-9-]*$/, `id "${c.id}"`);
    assert.match(c.color, /^#[0-9A-F]{6}$/i, `cor de ${c.id}`);
  }
});

test('textos e ícone preenchidos, ícone sem script', () => {
  for (const c of categories) {
    assert.ok(c.name.trim() && c.hint.trim(), `${c.id}: nome e hint`);
    assert.ok(c.icon.includes('currentColor'), `${c.id}: o ícone precisa usar currentColor`);
    assert.doesNotMatch(c.icon, /<script|\son\w+=/i, `${c.id}: ícone com script`);
  }
});

test('perda que não volta (aviso "danger") sempre começa desmarcada', () => {
  for (const c of categories) {
    if (c.warning?.level === 'danger') assert.equal(c.optIn, true, `${c.id} precisa de optIn: true`);
  }
});

test('toda categoria normal tem pelo menos uma pasta', () => {
  for (const c of categories) if (!c.special) assert.ok(targetsOf(c).length > 0, c.id);
});

test('toda pasta está dentro de uma área permitida', () => {
  for (const c of categories) {
    for (const t of targetsOf(c)) {
      const ok = ALLOWED.some(({ base, exact }) => (exact ? same(t.path, base) : inside(t.path, base)));
      assert.ok(ok, `${c.id}: "${t.path}" está fora das áreas permitidas`);
    }
  }
});

test('nenhuma pasta é proibida nem contém uma pasta proibida', () => {
  for (const c of categories) {
    for (const t of targetsOf(c)) {
      assert.ok(!same(t.path, parse(t.path).root), `${c.id}: "${t.path}" é a raiz de um disco`);
      for (const f of FORBIDDEN) {
        assert.ok(!same(t.path, f) && !inside(f, t.path), `${c.id}: "${t.path}" toca em "${f}"`);
      }
    }
  }
});

test('nenhuma pasta passa por dados do usuário nem termina num contêiner de perfis', () => {
  for (const c of categories) {
    for (const t of targetsOf(c)) {
      const parts = t.path.split(sep).map(lower);
      for (const name of USER_DATA_NAMES) {
        assert.ok(!parts.includes(lower(name)), `${c.id}: "${t.path}" passa por "${name}"`);
      }
      assert.ok(!CONTAINERS.map(lower).includes(parts[parts.length - 1]), `${c.id}: "${t.path}" é um contêiner inteiro`);
    }
  }
});

test('toda categoria está na auditoria de segurança (docs/SAFETY-AUDIT.md)', () => {
  const audit = readFileSync(join('docs', 'SAFETY-AUDIT.md'), 'utf8');
  for (const c of categories) {
    assert.ok(audit.includes(`### ${c.name}`), `falta "### ${c.name}" na auditoria`);
  }
});
