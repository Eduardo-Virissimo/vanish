// Linhas embaixo das categorias sobre administrador: quando alguma categoria precisa dele, e o
// aviso de quando o UAC reabriu o Vanish na conta de OUTRO administrador. A primeira é:
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

/** Reaberto pelo UAC na conta de outro administrador: diz de quem são os arquivos limpos */
function renderAccountHint(s: AppState) {
  const row = $('account-hint');
  row.hidden = !s.otherAccount;
  if (!s.otherAccount) return;
  $('account-hint-text').textContent =
    `O Vanish foi aberto como administrador na conta "${s.otherAccount}". O que ele limpa agora (caches, temporários e Lixeira) é dessa conta, não da sua.`;
}

export function renderAdminHint(s: AppState) {
  renderAccountHint(s);
  const needs = s.isAdmin ? [] : s.cats.filter((c) => c.denied && c.bytes !== null).map((c) => c.name);
  const row = $('admin-hint');
  row.hidden = needs.length === 0;
  if (row.hidden) return;
  $('admin-hint-text').textContent =
    `${listNames(needs)} ${needs.length === 1 ? 'precisa' : 'precisam'} de administrador.`;
  $<HTMLButtonElement>('admin-relaunch').disabled = isBusy(s);
}
