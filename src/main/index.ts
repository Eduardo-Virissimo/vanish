// Ponto de entrada do Electron (processo principal).
import { app } from 'electron';
import { registerIpc } from './ipc';
import { createWindow } from './window';

registerIpc();
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
