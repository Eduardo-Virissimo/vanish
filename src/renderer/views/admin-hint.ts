// Linha embaixo das categorias quando alguma precisa de administrador:
// "Windows Update precisa de administrador. [Abrir como administrador]".
// O botão reabre o próprio Vanish elevado (o Windows mostra o aviso do UAC).
import { $ } from '../dom';
import { isBusy, type AppState } from '../state';

export function bindAdminHint(onRelaunch: () => void) {
  $('admin-relaunch').addEventListener('click', onRelaunch);
}

/** "A", "A e B", "A, B e C" */
const listNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;

export function renderAdminHint(s: AppState) {
  const needs = s.isAdmin ? [] : s.cats.filter((c) => c.denied && c.bytes !== null).map((c) => c.name);
  const row = $('admin-hint');
  row.hidden = needs.length === 0;
  if (row.hidden) return;
  $('admin-hint-text').textContent =
    `${listNames(needs)} ${needs.length === 1 ? 'precisa' : 'precisam'} de administrador.`;
  $<HTMLButtonElement>('admin-relaunch').disabled = isBusy(s);
}
