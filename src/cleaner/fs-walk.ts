// Percorrer pastas com segurança: sem seguir links/junções e sem abrir arquivos demais de uma vez.
import { lstat, readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import type { Target } from './types';

/** Limita quantas operações de disco rodam ao mesmo tempo */
function createLimit(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    if (active >= max) return;
    const run = queue.shift();
    if (!run) return;
    active++;
    run();
  };
  return <T>(fn: () => Promise<T>) => new Promise<T>((resolve, reject) => {
    queue.push(() => {
      fn().then(resolve, reject).finally(() => {
        active--;
        next();
      });
    });
    next();
  });
}

export const limit = createLimit(48);

/**
 * Há quanto tempo o arquivo (ou pasta) existe/mudou. Usa a data MAIS NOVA entre criação e
 * modificação: quem extrai um zip mantém a data de modificação original (ex.: 2023), mas a
 * data de criação é a da extração. Só a modificação faria um instalador recém-extraído
 * parecer velho e ser apagado no meio da instalação.
 */
export const ageMs = (st: { mtimeMs: number; birthtimeMs: number }, now = Date.now()) =>
  now - Math.max(st.mtimeMs, st.birthtimeMs);

const isRealDir = async (p: string) => {
  try {
    const st = await lstat(p);
    return st.isDirectory() && !st.isSymbolicLink();
  } catch {
    return false;
  }
};

/** "webcache*" → /^webcache.*$/i (o "*" vale qualquer trecho do nome) */
const wildcard = (part: string) =>
  new RegExp(`^${part.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 'i');

/**
 * Troca cada trecho com "*" pelas subpastas que existem de verdade.
 * "*" sozinho = qualquer subpasta (ex.: cada perfil); "webcache*" = subpastas que começam assim.
 */
export async function expand(pattern: string): Promise<string[]> {
  const [drive, ...parts] = pattern.split(sep).filter(Boolean);
  let bases = [drive + sep];
  for (const part of parts) {
    const next: string[] = [];
    for (const base of bases) {
      if (!part.includes('*')) {
        next.push(join(base, part));
        continue;
      }
      const re = wildcard(part);
      const entries = await readdir(base, { withFileTypes: true }).catch(() => []);
      for (const e of entries) {
        if (e.isDirectory() && !e.isSymbolicLink() && re.test(e.name)) next.push(join(base, e.name));
      }
    }
    bases = next;
  }
  const exists = await Promise.all(bases.map(isRealDir));
  return bases.filter((_, i) => exists[i]);
}

export interface WalkContext extends Omit<Target, 'path'> {
  onFile(file: string, size: number): void | Promise<void>;
  /** se existir, recebe cada subpasta visitada */
  dirs?: string[];
  /** fica true se a pasta raiz não pôde ser lida por falta de permissão */
  denied?: boolean;
}

export async function walk(dir: string, ctx: WalkContext, isRoot = true): Promise<void> {
  let entries;
  try {
    entries = await limit(() => readdir(dir, { withFileTypes: true }));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (isRoot && (code === 'EPERM' || code === 'EACCES')) ctx.denied = true;
    return;
  }
  if (!isRoot) ctx.dirs?.push(dir);

  const subdirs: string[] = [];
  await Promise.all(entries.map(async (entry) => {
    if (entry.isSymbolicLink()) return;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ctx.shallow) subdirs.push(full);
      return;
    }
    if (!entry.isFile() || (ctx.match && !ctx.match.test(entry.name))) return;

    const st = await limit(() => lstat(full)).catch(() => null);
    if (!st || (ctx.minAgeMs && ageMs(st) < ctx.minAgeMs)) return;
    await ctx.onFile(full, st.size);
  }));

  await Promise.all(subdirs.map((d) => walk(d, ctx, false)));
}
