// Pastas do sistema e atalhos para montar as listas de cache.
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Target } from './types';

const env = process.env;
const HOME = homedir();

export const LOCAL = env.LOCALAPPDATA ?? join(HOME, 'AppData', 'Local');
export const ROAMING = env.APPDATA ?? join(HOME, 'AppData', 'Roaming');
export const WINDIR = env.SystemRoot ?? 'C:\\Windows';
export const PROGRAMDATA = env.ProgramData ?? 'C:\\ProgramData';
export const TEMP = env.TEMP ?? join(LOCAL, 'Temp');

export const DAY = 24 * 60 * 60 * 1000;

/** Cache de um navegador baseado em Chromium ("*" = cada perfil) */
export const chromiumCaches = (userData: string): Target[] => [
  join(userData, '*', 'Cache'),
  join(userData, '*', 'Code Cache'),
  join(userData, '*', 'GPUCache'),
  join(userData, 'ShaderCache'),
  join(userData, 'GrShaderCache'),
].map((path) => ({ path }));

/** Pastas de cache de um app feito em Electron (só cache; dados do usuário ficam) */
const ELECTRON_CACHE_DIRS = ['Cache', 'Code Cache', 'GPUCache'];

/** Apps feitos em Electron guardam cache no mesmo formato */
export const electronCaches = (appDir: string): Target[] =>
  ELECTRON_CACHE_DIRS.map((dir) => ({ path: join(appDir, dir) }));

/**
 * Apps Electron que separam sessões em `Partitions\<nome>` (Notion, Postman): só as pastas de
 * cache de cada partição. IndexedDB, Service Worker e Local Storage ficam (dados offline).
 */
export const partitionCaches = (appDir: string): Target[] =>
  ELECTRON_CACHE_DIRS.map((dir) => ({ path: join(appDir, 'Partitions', '*', dir) }));
