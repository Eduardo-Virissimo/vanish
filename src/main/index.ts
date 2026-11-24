// Ponto de entrada do Electron (processo principal).
import { app, BrowserWindow, Menu } from 'electron';
import { registerIpc } from './ipc';
import { logError, logUncaught } from './log';
import { startUpdater } from './updater';
import { createWindow } from './window';

logUncaught();

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
    // a tela travou ou fechou sozinha: fica registrado para investigar
    win.webContents.on('render-process-gone', (_e, details) => logError('tela', `${details.reason} (código ${details.exitCode})`));
    startUpdater(win.webContents);
  });
  app.on('window-all-closed', () => app.quit());
}
