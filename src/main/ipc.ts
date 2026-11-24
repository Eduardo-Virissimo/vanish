// Responde aos pedidos da tela. Os canais e formatos estão em shared/ipc.ts.
import { BrowserWindow, ipcMain, shell, type IpcMainInvokeEvent, type WebContents } from 'electron';
import { statfs } from 'node:fs/promises';
import { homedir } from 'node:os';
import { categories } from '../cleaner/categories';
import { cleanCategory, scanCategory } from '../cleaner/engine';
import type { EventChannel, EventMap, InvokeChannel, InvokeMap } from '../shared/ipc';
import type { CleanResult, ScanResult } from '../shared/types';
import { BG } from './window';
import { isAdmin, relaunchAsAdmin } from './admin';
import { taskbar } from './taskbar';
import { installNow } from './updater';
import { exclusive, latest, throttle } from './timing';

type Handler<K extends InvokeChannel> = (
  event: IpcMainInvokeEvent,
  ...args: Parameters<InvokeMap[K]>
) => ReturnType<InvokeMap[K]> | Promise<ReturnType<InvokeMap[K]>>;

/**
 * Só a tela do próprio Vanish (arquivo local, quadro principal) pode pedir algo. A navegação já é
 * bloqueada em window.ts; isto é a segunda trava, recomendada pelo guia de segurança do Electron.
 */
const fromApp = (event: IpcMainInvokeEvent) =>
  event.senderFrame !== null && event.senderFrame === event.sender.mainFrame && event.senderFrame.url.startsWith('file://');

const handle = <K extends InvokeChannel>(channel: K, handler: Handler<K>) =>
  ipcMain.handle(channel, (event, ...args) => {
    if (!fromApp(event)) throw new Error('Pedido de origem desconhecida');
    return handler(event, ...(args as Parameters<InvokeMap[K]>));
  });

const emitter = (wc: WebContents) => <K extends EventChannel>(channel: K, data: EventMap[K]) => {
  if (!wc.isDestroyed()) wc.send(channel, data);
};

/** a análise da categoria deu erro: nunca mostrar como "Vazia" (pareceria que não há nada) */
const FAILED_SCAN: ScanResult = {
  bytes: 0, files: 0, denied: false, folders: [],
  blocked: { label: 'Não analisada', reason: 'Algo deu errado ao ler as pastas desta categoria. Analise de novo' },
};
const EMPTY_CLEAN: CleanResult = { freed: 0, removed: 0, skipped: 0 };

/** Pastas da última análise: as únicas que a tela pode pedir para abrir no Explorador */
const knownFolders = new Set<string>();

export function registerIpc(): void {
  handle('app:init', async () => ({
    home: homedir(),
    isAdmin: await isAdmin(),
    // só o que a tela precisa: os caminhos ficam no processo principal
    categories: categories.map(({ id, name, color, icon, hint, optIn, warning, closeFirst }) => ({
      id, name, color, icon, hint, warning, closeFirst, defaultSelected: !optIn,
    })),
  }));

  handle('disk:info', async () => {
    const drive = `${process.env.SystemDrive ?? 'C:'}\\`;
    const s = await statfs(drive);
    return { drive: drive.slice(0, 2), total: s.blocks * s.bsize, free: s.bavail * s.bsize };
  });

  handle('scan', (event) => exclusive('scan', async () => {
    const emit = emitter(event.sender);
    const progress = taskbar(event.sender);
    progress.busy();
    const onPath = latest((p: string) => emit('progress:path', p), 60);
    const results = await Promise.all(categories.map(async (category) => {
      const result = { id: category.id, ...(await scanCategory(category, onPath).catch((error) => {
        console.warn(`Análise de ${category.id}:`, error);
        return FAILED_SCAN;
      })) };
      emit('scan:category', result);
      return result;
    }));
    knownFolders.clear();
    for (const r of results) for (const f of r.folders) knownFolders.add(f.path.toLowerCase());
    progress.done();
    return results;
  }));

  handle('folder:open', async (_event, path) => {
    if (typeof path !== 'string' || !knownFolders.has(path.toLowerCase())) {
      throw new Error('Essa pasta não faz parte da análise');
    }
    const error = await shell.openPath(path);
    if (error) throw new Error(error);
  });

  // caminho fixo: sempre o próprio Vanish, nunca algo vindo da tela
  handle('app:relaunch-admin', () => relaunchAsAdmin());
  handle('update:install', () => installNow());

  handle('window:splash-done', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    win.setBackgroundColor(BG);
    win.setTitleBarOverlay({ color: BG, symbolColor: '#8E9099' });
  });

  handle('clean', (event, ids) => exclusive('clean', async () => {
    const emit = emitter(event.sender);
    const onPath = latest((p: string) => emit('progress:path', p), 60);
    // Só aceita ids que existem na lista fechada de categorias
    const wanted = new Set(Array.isArray(ids) ? ids : []);
    const total: CleanResult = { ...EMPTY_CLEAN, failed: [] };
    const chosen = categories.filter((c) => wanted.has(c.id));
    const progress = taskbar(event.sender);

    for (const [index, category] of chosen.entries()) {
      progress.set(index / chosen.length);
      emit('clean:start', { id: category.id });
      const onFreed = throttle((freed: number) => emit('clean:progress', { id: category.id, freed }), 80);
      const result = await cleanCategory(category, { onPath, onFreed }).catch((error) => {
        // o que já foi apagado antes do erro não volta, mas a tela precisa saber que parou
        console.warn(`Limpeza de ${category.id}:`, error);
        total.failed?.push(category.name);
        return EMPTY_CLEAN;
      });
      total.freed += result.freed;
      total.removed += result.removed;
      total.skipped += result.skipped;
      for (const f of result.folders ?? []) knownFolders.add(f.path.toLowerCase());
      emit('clean:category', { id: category.id, ...result });
    }
    progress.done();
    return total;
  }));
}
