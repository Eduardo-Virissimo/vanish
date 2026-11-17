// Ponto de entrada do Electron (processo principal).
import { app, BrowserWindow, Menu } from 'electron';
import { registerIpc } from './ipc';
import { startUpdater } from './updater';
import { createWindow } from './window';

// Uma janela só: abrir o Vanish de novo traz para a frente a que já está aberta.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Sem o menu padrão do Electron: ele roubaria atalhos como Ctrl+R (recarregar a página).
  Menu.setApplicationMenu(null);
  registerIpc();

  let win: BrowserWindow | null = null;
  app.on('second-instance', () => {
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
  app.whenReady().then(() => {
    win = createWindow();
    startUpdater(win.webContents);
  });
  app.on('window-all-closed', () => app.quit());
}
