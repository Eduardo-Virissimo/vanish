// Ponte segura entre a tela e o processo principal.
// A tela não tem acesso ao Node; só consegue usar os canais listados em shared/ipc.ts.
import { contextBridge, ipcRenderer } from 'electron';
import { EVENT_CHANNELS, INVOKE_CHANNELS, type CleanerApi } from '../shared/ipc';

const invokable = new Set<string>(INVOKE_CHANNELS);
const listenable = new Set<string>(EVENT_CHANNELS);

const api: CleanerApi = {
  invoke(channel, ...args) {
    if (!invokable.has(channel)) return Promise.reject(new Error(`Canal desconhecido: ${channel}`));
    return ipcRenderer.invoke(channel, ...args);
  },
  on(channel, listener) {
    if (!listenable.has(channel)) throw new Error(`Canal desconhecido: ${channel}`);
    const handler = (_event: Electron.IpcRendererEvent, data: Parameters<typeof listener>[0]) => listener(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
};

contextBridge.exposeInMainWorld('cleaner', api);
