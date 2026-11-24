// Atualização automática pelas releases do GitHub (electron-updater).
// Só no app instalado: confere ao abrir e a cada 6 horas, baixa em segundo plano e instala
// sozinho quando o Vanish fecha. A tela mostra "Reiniciar para atualizar" para quem não quer esperar.
// Nunca instala no meio de uma análise ou limpeza.
import { app, type WebContents } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { UpdateStatus } from '../shared/types';
import { logError } from './log';
import { isBusy } from './timing';

const FIRST_CHECK_MS = 5_000;
const EVERY_MS = 6 * 60 * 60 * 1000;

let status: UpdateStatus | null = null;

export function startUpdater(wc: WebContents) {
  if (!app.isPackaged) return; // em desenvolvimento (npm start) não há o que atualizar

  const send = (next: UpdateStatus) => {
    status = next;
    if (!wc.isDestroyed()) wc.send('update:status', next);
  };

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', (info) => send({ state: 'downloading', version: info.version }));
  autoUpdater.on('update-downloaded', (info) => send({ state: 'ready', version: info.version }));
  // sem internet, GitHub fora do ar, sem releases: tenta de novo na próxima rodada, sem incomodar
  autoUpdater.on('error', (error) => logError('atualização', error));

  const check = () => {
    if (status?.state === 'ready') return;
    autoUpdater.checkForUpdates().catch(() => { /* já tratado no 'error' */ });
  };
  setTimeout(check, FIRST_CHECK_MS);
  setInterval(check, EVERY_MS);

  // a tela pode ter recarregado depois do aviso: manda o último estado de novo
  wc.on('did-finish-load', () => {
    if (status) wc.send('update:status', status);
  });
}

/** Reinicia já instalando a versão baixada (a tela só oferece isso com o app parado) */
export function installNow(): boolean {
  if (status?.state !== 'ready' || isBusy()) return false;
  // isSilent: sem as telas do instalador; isForceRunAfter: abre o Vanish de novo no fim
  setImmediate(() => autoUpdater.quitAndInstall(true, true));
  return true;
}
