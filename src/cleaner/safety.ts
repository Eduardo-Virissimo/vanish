// Onde o Vanish pode apagar. Vale nos testes (npm test) E na hora de rodar no PC do usuário:
// as pastas-base vêm de variáveis de ambiente (TEMP, LOCALAPPDATA...), que podem estar erradas
// nesse PC (ex.: TEMP=C:\). Qualquer caminho fora destas regras bloqueia a categoria inteira.
// Motivos em docs/SAFETY-AUDIT.md. Nunca afrouxar uma regra para uma categoria passar.
import { homedir } from 'node:os';
import { join, parse, sep } from 'node:path';
import { LOCAL, PROGRAMDATA, ROAMING, TEMP, WINDIR } from './paths';
import type { Blocked } from '../shared/types';

export interface Area {
  base: string;
  /** true = só a própria pasta pode ser alvo (não uma subpasta dela) */
  exact: boolean;
  /** formato que a pasta-base precisa ter; se não tiver, a variável de ambiente está estranha */
  shape: RegExp;
}

/** Pastas-base de onde os caminhos das categorias são montados */
export interface Bases {
  local: string;
  roaming: string;
  temp: string;
  windir: string;
  programdata: string;
  home: string;
}

export const SYSTEM_BASES: Bases = {
  local: LOCAL, roaming: ROAMING, temp: TEMP, windir: WINDIR, programdata: PROGRAMDATA, home: homedir(),
};

const DRIVE_WINDOWS = /^[a-z]:\\windows$/i;

/** Só se limpa dentro destas áreas */
export const allowedAreas = (b: Bases): Area[] => [
  { base: b.local, exact: false, shape: /\\appdata\\local$/i },
  { base: b.roaming, exact: false, shape: /\\appdata\\roaming$/i },
  { base: join(b.programdata, 'Microsoft', 'Windows', 'WER'), exact: false, shape: /^[a-z]:\\programdata\\microsoft\\windows\\wer$/i },
  // TEMP pode ser trocada pelo usuário: precisa ao menos se chamar Temp/Tmp e não ser a raiz de um disco
  { base: b.temp, exact: true, shape: /^[a-z]:\\(?:[^\\]+\\)*te?mp$/i },
  { base: join(b.windir, 'Temp'), exact: true, shape: /^[a-z]:\\windows\\temp$/i },
  { base: join(b.windir, 'SoftwareDistribution', 'Download'), exact: true, shape: /^[a-z]:\\windows\\softwaredistribution\\download$/i },
];

/** Nunca pode ser alvo, nem conter um destes (apagar o pai apagaria eles) */
export const forbiddenFolders = (b: Bases): string[] => [
  b.windir, join(b.windir, 'System32'), join(b.windir, 'WinSxS'), join(b.windir, 'Installer'),
  join(b.windir, 'Prefetch'), join(b.windir, 'SoftwareDistribution'), b.programdata, b.home,
  join(b.home, 'AppData'), b.local, b.roaming,
  ...['Documents', 'Desktop', 'Downloads', 'Pictures', 'Music', 'Videos', 'OneDrive'].map((d) => join(b.home, d)),
];

/** Pastas com dados do usuário: nenhum alvo pode passar por elas nem terminar nelas */
export const USER_DATA_NAMES = [
  'Cookies', 'Login Data', 'IndexedDB', 'Local Storage', 'Session Storage', 'Service Worker',
  'History', 'Bookmarks', 'Storage', 'packages', 'Berry', 'store', 'Saved Games',
];
/** Pastas que guardam vários perfis/dados: só podem aparecer no meio do caminho, nunca no fim */
export const CONTAINERS = ['User Data', 'Profiles', 'Partitions', 'Packages'];

const lower = (p: string) => p.toLowerCase().replace(/[\\/]+$/, '');
export const same = (a: string, b: string) => lower(a) === lower(b);
export const inside = (path: string, base: string) => lower(path).startsWith(lower(base) + sep);
const isDriveRoot = (p: string) => same(parse(p).root, p);

/** Devolve o problema do caminho, ou undefined se ele pode ser limpo */
export function pathProblem(path: string, bases: Bases = SYSTEM_BASES): string | undefined {
  if (isDriveRoot(path)) return 'é a raiz de um disco';
  if (!DRIVE_WINDOWS.test(bases.windir)) return 'a pasta do Windows não está no lugar esperado';

  const area = allowedAreas(bases).find(({ base, exact }) => (exact ? same(path, base) : inside(path, base)));
  if (!area) return 'está fora das áreas permitidas';
  if (!area.shape.test(lower(area.base))) return `fica em "${area.base}", que não parece a pasta certa`;

  for (const f of forbiddenFolders(bases)) {
    if (same(path, f) || inside(f, path)) return `toca em "${f}"`;
  }
  const parts = path.split(sep).map(lower);
  const userData = USER_DATA_NAMES.find((name) => parts.includes(lower(name)));
  if (userData) return `passa por "${userData}"`;
  if (CONTAINERS.map(lower).includes(parts[parts.length - 1])) return 'é uma pasta de perfis inteira';
  return undefined;
}

/** Bloqueio para o primeiro caminho que não passa nas regras (ou undefined se todos passam) */
export function unsafeRoots(paths: string[], bases: Bases = SYSTEM_BASES): Blocked | undefined {
  for (const path of paths) {
    const problem = pathProblem(path, bases);
    if (problem) {
      return {
        label: 'Bloqueada',
        reason: `Por segurança, nada desta categoria é apagado: a pasta "${path}" ${problem}. `
          + 'Isso costuma vir de uma variável de ambiente (como TEMP) apontando para outro lugar',
      };
    }
  }
  return undefined;
}
