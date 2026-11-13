import type { CleanerApi } from '../shared/ipc';

declare global {
  interface Window {
    /** Exposto pelo preload (src/preload/index.ts) */
    cleaner: CleanerApi;
  }
}

export {};
