// Diálogo de confirmação antes de apagar: lista cada categoria marcada com o que vai acontecer.
// Perigo (ex.: Lixeira) exige marcar "Entendi" antes de liberar o botão. O foco começa em
// "Cancelar", para um Enter apressado não apagar nada.
import { $ } from '../dom';
import { formatBytes } from '../format';
import { chosen, chosenBytes, type AppState, type CategoryState } from '../state';

const WARN_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M7.1 1.9a1 1 0 0 1 1.8 0l6 11.1A1 1 0 0 1 14 14.5H2a1 1 0 0 1-.9-1.5zM8 5.5a.8.8 0 0 0-.8.8v3.4a.8.8 0 0 0 1.6 0V6.3A.8.8 0 0 0 8 5.5m0 7a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8"/></svg>';

let open = false;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function item(c: CategoryState): HTMLLIElement {
  const li = el('li', 'confirm-item');
  li.style.setProperty('--c', c.color);
  li.classList.toggle('is-danger', c.warning?.level === 'danger');
  li.append(el('span', 'confirm-dot'), el('span', 'confirm-name', c.name), el('span', 'confirm-size', formatBytes(c.bytes ?? 0)));
  if (c.warning) {
    const warn = el('p', `confirm-warn ${c.warning.level}`);
    warn.innerHTML = WARN_ICON;
    warn.append(el('span', '', c.warning.text));
    li.append(warn);
  }
  return li;
}

const needsAck = (s: AppState) => chosen(s).some((c) => c.warning?.level === 'danger');

function updateOk(s: AppState) {
  const ack = $<HTMLInputElement>('confirm-ack');
  $<HTMLButtonElement>('confirm-ok').disabled = needsAck(s) && !ack.checked;
}

export function bindConfirm(s: AppState, handlers: { onConfirm(): void; onCancel(): void }) {
  $('confirm-ok').addEventListener('click', handlers.onConfirm);
  $('confirm-cancel').addEventListener('click', handlers.onCancel);
  $('confirm-ack').addEventListener('change', () => updateOk(s));
  $('confirm-scrim').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) handlers.onCancel(); // clique fora do diálogo
  });
  // mantém o Tab dentro do diálogo enquanto ele está aberto
  $('confirm-scrim').addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const items = [...$('confirm-scrim').querySelectorAll<HTMLElement>('input, button:not(:disabled)')]
      .filter((n) => n.offsetParent !== null);
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

export function renderConfirm(s: AppState) {
  const scrim = $('confirm-scrim');
  const shouldOpen = s.phase === 'confirm';
  if (shouldOpen === open) return;
  open = shouldOpen;

  if (!open) {
    scrim.hidden = true;
    return;
  }

  // o que é perigoso aparece primeiro, nunca escondido no fim da lista
  const rank = (c: CategoryState) => (c.warning?.level === 'danger' ? 0 : c.warning ? 1 : 2);
  const sel = [...chosen(s)].sort((a, b) => rank(a) - rank(b));
  const bytes = formatBytes(chosenBytes(s));
  $('confirm-title').textContent = `Apagar ${bytes}?`;
  $('confirm-list').replaceChildren(...sel.map(item));
  $('confirm-ok').textContent = `Apagar ${bytes}`;
  const ack = $<HTMLInputElement>('confirm-ack');
  ack.checked = false;
  $('confirm-ack-row').hidden = !needsAck(s);
  updateOk(s);

  scrim.hidden = false;
  $('confirm-cancel').focus();
}
