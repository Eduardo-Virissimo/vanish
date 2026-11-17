// Contrato de comunicação entre o processo principal e a tela.
// Mudou um canal aqui? O TypeScript aponta todo lugar que precisa acompanhar.
import type { CategoryId, CleanResult, DiskInfo, InitData, ScanResult, UpdateStatus } from './types';

export type CategoryScan = ScanResult & { id: CategoryId };

/** Pedidos da tela para o main (ipcRenderer.invoke → ipcMain.handle) */
export interface InvokeMap {
  'app:init': () => InitData;
  'disk:info': () => DiskInfo;
  /** devolve o resultado de todas as categorias (os avisos scan:category chegam antes, um por um) */
  scan: () => CategoryScan[];
  clean: (ids: CategoryId[]) => CleanResult;
  /** abre no Explorador uma pasta que veio da última análise */
  'folder:open': (path: string) => void;
  /** a tela de abertura terminou: a barra de título volta da cor preta para a cor do app */
  'window:splash-done': () => void;
  /** reabre o Vanish como administrador (aviso do UAC); false = a pessoa recusou */
  'app:relaunch-admin': () => boolean;
  /** reinicia instalando a versão nova já baixada; false = ainda não está pronta ou o app está ocupado */
  'update:install': () => boolean;
}

/** Avisos do main para a tela (webContents.send → ipcRenderer.on) */
export interface EventMap {
  'progress:path': string;
  'scan:category': CategoryScan;
  'clean:start': { id: CategoryId };
  'clean:progress': { id: CategoryId; freed: number };
  'clean:category': CleanResult & { id: CategoryId };
  /** versão nova encontrada no GitHub (baixando) ou pronta para instalar */
  'update:status': UpdateStatus;
}

export type InvokeChannel = keyof InvokeMap;
export type EventChannel = keyof EventMap;

export const INVOKE_CHANNELS: readonly InvokeChannel[] = [
  'app:init', 'disk:info', 'scan', 'clean', 'folder:open', 'window:splash-done', 'app:relaunch-admin', 'update:install',
];
export const EVENT_CHANNELS: readonly EventChannel[] = [
  'progress:path', 'scan:category', 'clean:start', 'clean:progress', 'clean:category', 'update:status',
];

/** API que o preload expõe na tela como window.cleaner */
export interface CleanerApi {
  invoke<K extends InvokeChannel>(channel: K, ...args: Parameters<InvokeMap[K]>): Promise<ReturnType<InvokeMap[K]>>;
  on<K extends EventChannel>(channel: K, listener: (data: EventMap[K]) => void): () => void;
}
