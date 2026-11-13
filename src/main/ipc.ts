// Responde aos pedidos da tela. Os canais e formatos estão em shared/ipc.ts.
import { BrowserWindow, ipcMain, shell, type IpcMainInvokeEvent, type WebContents } from 'electron';
import { statfs } from 'node:fs/promises';
import { homedir } from 'node:os';
import { categories } from '../cleaner/categories';
import { cleanCategory, scanCategory } from '../cleaner/engine';
import type { EventChannel, EventMap, InvokeChannel, InvokeMap } from '../shared/ipc';
import type { CleanResult, ScanResult } from '../shared/types';
import { BG } from './window';
import { exclusive, latest, throttle } from './timing';

type Handler<K extends InvokeChannel> = (
  event: IpcMainInvokeEvent,
  ...args: Parameters<InvokeMap[K]>
) => ReturnType<InvokeMap[K]> | Promise<ReturnType<InvokeMap[K]>>;

const handle = <K extends InvokeChannel>(channel: K, handler: Handler<K>) => ipcMain.handle(channel, handler);

const emitter = (wc: WebContents) => <K extends EventChannel>(channel: K, data: EventMap[K]) => {
  if (!wc.isDestroyed()) wc.send(channel, data);
};

const EMPTY_SCAN: ScanResult = { bytes: 0, files: 0, denied: false, folders: [] };
const EMPTY_CLEAN: CleanResult = { freed: 0, removed: 0, skipped: 0 };

/** Pastas da última análise: as únicas que a tela pode pedir para abrir no Explorador */
const knownFolders = new Set<string>();

export function registerIpc(): void {
  handle('app:init', () => ({
    home: homedir(),
    // só o que a tela precisa: os caminhos ficam no processo principal
    categories: categories.map(({ id, name, color, icon, hint, optIn, warning }) => ({
      id, name, color, icon, hint, warning, defaultSelected: !optIn,
    })),
  }));

  handle('disk:info', async () => {
    const drive = `${process.env.SystemDrive ?? 'C:'}\\`;
    const s = await statfs(drive);
    return { drive: drive.slice(0, 2), total: s.blocks * s.bsize, free: s.bavail * s.bsize };
  });

  handle('scan', (event) => exclusive(async () => {
    const emit = emitter(event.sender);
    const onPath = latest((p: string) => emit('progress:path', p), 60);
    const results = await Promise.all(categories.map(async (category) => {
      const result = { id: category.id, ...(await scanCategory(category, onPath).catch(() => EMPTY_SCAN)) };
      emit('scan:category', result);
      return result;
    }));
    knownFolders.clear();
    for (const r of results) for (const f of r.folders) knownFolders.add(f.path.toLowerCase());
    return results;
  }));

  handle('folder:open', async (_event, path) => {
    if (typeof path !== 'string' || !knownFolders.has(path.toLowerCase())) {
      throw new Error('Essa pasta não faz parte da análise');
    }
    const error = await shell.openPath(path);
    if (error) throw new Error(error);
  });

  handle('window:splash-done', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    win.setBackgroundColor(BG);
    win.setTitleBarOverlay({ color: BG, symbolColor: '#8E9099' });
  });

  handle('clean', (event, ids) => exclusive(async () => {
    const emit = emitter(event.sender);
    const onPath = latest((p: string) => emit('progress:path', p), 60);
    // Só aceita ids que existem na lista fechada de categorias
    const wanted = new Set(Array.isArray(ids) ? ids : []);
    const total = { ...EMPTY_CLEAN };

    for (const category of categories.filter((c) => wanted.has(c.id))) {
      emit('clean:start', { id: category.id });
      const onFreed = throttle((freed: number) => emit('clean:progress', { id: category.id, freed }), 80);
      const result = await cleanCategory(category, { onPath, onFreed }).catch(() => EMPTY_CLEAN);
      total.freed += result.freed;
      total.removed += result.removed;
      total.skipped += result.skipped;
      for (const f of result.folders ?? []) knownFolders.add(f.path.toLowerCase());
      emit('clean:category', { id: category.id, ...result });
    }
    return total;
  }));
}
