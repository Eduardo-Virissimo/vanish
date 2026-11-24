// Analisar (só lê) e limpar (apaga) uma categoria. Os dois devolvem o detalhe por pasta.
import { lstat, rmdir, unlink } from 'node:fs/promises';
import type { CleanResult, FolderInfo, ScanResult } from '../shared/types';
import { ageMs, expand, limit, walk, type WalkContext } from './fs-walk';
import { checkGuard } from './guards';
import { pendingRenames } from './pending-renames';
import { SYSTEM_BASES, unsafeRoots, type Bases } from './safety';
import { emptyRecycleBin, scanRecycleBin } from './recycle-bin';
import type { Category, Target } from './types';

type OnPath = (path: string) => void;
type Root = Target & { root: string };

interface CleanCallbacks {
  onPath: OnPath;
  onFreed: (freedSoFar: number) => void;
}

const HOUR = 60 * 60 * 1000;

/** Texto da regra da pasta para o painel (ex.: "Só arquivos com mais de 24 horas") */
const noteFor = (t: Target) =>
  t.note ?? (t.minAgeMs ? `Só arquivos com mais de ${Math.round(t.minAgeMs / HOUR)} horas` : undefined);

/** Resolve os "*" e tira pastas repetidas (ex.: %TEMP% que aparece duas vezes) */
async function resolveRoots(targets: Target[]): Promise<Root[]> {
  const seen = new Set<string>();
  const roots: Root[] = [];
  for (const target of targets) {
    for (const root of await expand(target.path)) {
      const key = root.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      roots.push({ ...target, root });
    }
  }
  return roots;
}

/** Remove subpastas que ficaram vazias, das mais fundas para cima */
async function removeEmptyDirs(dirs: string[], minAgeMs?: number) {
  dirs.sort((a, b) => b.length - a.length);
  for (const dir of dirs) {
    try {
      if (minAgeMs && ageMs(await lstat(dir)) < minAgeMs) continue;
      await rmdir(dir);
    } catch { /* não está vazia ou está em uso */ }
  }
}

const sumBytes = (folders: FolderInfo[]) => folders.reduce((sum, f) => sum + f.bytes, 0);

/**
 * `bases`: pastas-base que valem como lugar seguro (padrão: as do sistema). Os testes passam
 * pastas falsas; o app usa sempre o padrão.
 */
export async function scanCategory(category: Category, onPath: OnPath, bases: Bases = SYSTEM_BASES): Promise<ScanResult> {
  if (category.special === 'recycle') return scanRecycleBin(onPath);

  const roots = await resolveRoots(category.targets);
  // caminho fora do lugar (ex.: TEMP=C:\): nem lê, para não somar o disco inteiro
  const unsafe = unsafeRoots(roots.map((r) => r.root), bases);
  if (unsafe) return { bytes: 0, files: 0, denied: false, blocked: unsafe, folders: [] };

  const blocked = await checkGuard(category.guard);
  // arquivos que o Windows vai trocar no próximo reinício: nem conta (nem apaga, na limpeza)
  const skip = await pendingRenames();
  const folders: FolderInfo[] = [];
  for (const target of roots) {
    const folder: FolderInfo = { path: target.root, bytes: 0, files: 0, denied: false, note: noteFor(target) };
    const ctx: WalkContext = {
      ...target,
      skip,
      onFile: (file, size) => {
        folder.bytes += size;
        folder.files++;
        onPath(file);
      },
    };
    await walk(target.root, ctx);
    folder.denied = !!ctx.denied;
    folders.push(folder);
  }

  const bytes = sumBytes(folders);
  return {
    bytes,
    files: folders.reduce((sum, f) => sum + f.files, 0),
    // Só diz "precisa de admin" se não deu para ler nada
    denied: bytes === 0 && folders.some((f) => f.denied),
    blocked,
    folders,
  };
}

export async function cleanCategory(
  category: Category,
  { onPath, onFreed }: CleanCallbacks,
  bases: Bases = SYSTEM_BASES,
): Promise<CleanResult> {
  if (category.special === 'recycle') {
    const result = await emptyRecycleBin(onPath);
    onFreed(result.freed);
    return result;
  }

  const result: CleanResult = { freed: 0, removed: 0, skipped: 0, folders: [] };
  // confere de novo na hora de apagar: a situação pode ter mudado desde a análise
  if (await checkGuard(category.guard)) return result;
  const roots = await resolveRoots(category.targets);
  if (unsafeRoots(roots.map((r) => r.root), bases)) return result;
  const skip = await pendingRenames();

  for (const target of roots) {
    // o que não deu para apagar continua na pasta
    const left: FolderInfo = { path: target.root, bytes: 0, files: 0, denied: false, note: noteFor(target) };
    const dirs: string[] = [];
    const ctx: WalkContext = {
      ...target,
      skip,
      dirs,
      onFile: async (file, size) => {
        onPath(file);
        try {
          await limit(() => unlink(file));
          result.freed += size;
          result.removed++;
          onFreed(result.freed);
        } catch {
          result.skipped++; // em uso ou sem permissão
          left.bytes += size;
          left.files++;
        }
      },
    };
    await walk(target.root, ctx);
    left.denied = !!ctx.denied;
    result.folders?.push(left);
    await removeEmptyDirs(dirs, target.minAgeMs);
  }
  return result;
}
