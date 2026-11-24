import { BrowserWindow, dialog } from 'electron';
import { currentTask } from './timing';
import { join } from 'node:path';

const WINDOW_MIN_WIDTH = 820;
const WINDOW_MIN_HEIGHT = 540;

/** cor de fundo do app */
export const BG = '#1B1C1F';
/** a janela nasce preta por causa da tela de abertura; volta para BG no 'window:splash-done' */
const SPLASH_BG = '#000000';

export function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 980,
    height: 560,
    center: true,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    title: 'Vanish',
    icon: join(__dirname, 'icon.png'),
    backgroundColor: SPLASH_BG,
    show: false,
    // Sem barra de título própria; os botões do Windows ficam por cima, à direita
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: SPLASH_BG, symbolColor: '#5C5E66', height: 40 },
    webPreferences: {
      // __dirname aqui é dist/, depois do build
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
    // Iniciado pelo terminal, o Windows às vezes abre a janela atrás das outras.
    // "Sempre no topo" por um instante traz ela para a frente sem ficar presa lá.
    win.setAlwaysOnTop(true);
    win.moveTop();
    win.focus();
    setTimeout(() => {
      if (!win.isDestroyed()) win.setAlwaysOnTop(false);
    }, 600);
  });
  // segurança (guia do Electron): nada de janelas novas, navegação, <webview> nem permissões
  // (câmera, notificações, localização...). O Vanish não precisa de nenhuma delas.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('will-attach-webview', (e) => e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, allow) => allow(false));
  win.webContents.session.setPermissionCheckHandler(() => false);

  // fechar no meio da limpeza para tudo: pergunta antes (na análise não há o que perder)
  win.on('close', (e) => {
    if (currentTask() !== 'clean') return;
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      title: 'Vanish',
      message: 'A limpeza ainda está em andamento.',
      detail: 'Se fechar agora, ela para no meio. O que já foi apagado não volta; o resto fica para a próxima limpeza.',
      buttons: ['Continuar limpando', 'Fechar'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (choice === 0) e.preventDefault();
  });
  win.loadFile(join(__dirname, 'renderer', 'index.html'));
  return win;
}
