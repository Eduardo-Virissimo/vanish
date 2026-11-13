import { BrowserWindow } from 'electron';
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
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.loadFile(join(__dirname, 'renderer', 'index.html'));
  return win;
}
