// Guarda-costas das categorias: roda em toda mudança (`npm test`) e recusa qualquer categoria
// que aponte para um lugar perigoso ou que esteja incompleta. Regras em docs/MAINTENANCE.md.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, sep } from 'node:path';
import { test } from 'node:test';
import { categories } from '../src/cleaner/categories';
import { LOCAL, PROGRAMDATA, ROAMING, TEMP, WINDIR } from '../src/cleaner/paths';

const HOME = homedir();
const lower = (p: string) => p.toLowerCase();
const inside = (path: string, base: string) => lower(path).startsWith(lower(base) + sep);
const same = (a: string, b: string) => lower(a) === lower(b);

/** Só se limpa dentro destas áreas */
const ALLOWED = [
  { base: LOCAL, exact: false },
  { base: ROAMING, exact: false },
  { base: join(PROGRAMDATA, 'Microsoft', 'Windows', 'WER'), exact: false },
  { base: TEMP, exact: true },
  { base: join(WINDIR, 'Temp'), exact: true },
  { base: join(WINDIR, 'SoftwareDistribution', 'Download'), exact: true },
];

/** Nunca pode ser alvo, nem conter um destes (apagar o pai apagaria eles) */
const FORBIDDEN = [
  'C:\\', WINDIR, join(WINDIR, 'System32'), join(WINDIR, 'WinSxS'), join(WINDIR, 'Installer'),
  join(WINDIR, 'Prefetch'), join(WINDIR, 'SoftwareDistribution'), PROGRAMDATA, HOME,
  join(HOME, 'AppData'), LOCAL, ROAMING,
  ...['Documents', 'Desktop', 'Downloads', 'Pictures', 'Music', 'Videos', 'OneDrive'].map((d) => join(HOME, d)),
];

/** Pastas com dados do usuário: nenhum alvo pode passar por elas nem terminar nelas */
const USER_DATA_NAMES = [
  'Cookies', 'Login Data', 'IndexedDB', 'Local Storage', 'Session Storage', 'Service Worker',
  'History', 'Bookmarks', 'Storage', 'packages', 'Berry', 'store', 'Saved Games',
];
/** Pastas que guardam vários perfis/dados: só podem aparecer no meio do caminho, nunca no fim */
const CONTAINERS = ['User Data', 'Profiles', 'Partitions', 'Packages'];

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
