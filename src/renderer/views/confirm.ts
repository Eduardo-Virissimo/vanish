// Diálogo de confirmação antes de apagar. O peso acompanha o risco:
// - só caches (os apps recriam): título "Limpar", tom tranquilo, botão normal, efeitos em texto simples;
// - com algo que não volta (aviso "danger", ex.: Lixeira): título "Apagar", item em vermelho primeiro,
//   botão vermelho e "Entendi" obrigatório.
// O que precisa estar fechado vem num bloco só, antes da lista. O foco começa em "Cancelar".
import { $ } from '../dom';
import { formatBytes } from '../format';
import { chosen, chosenBytes, type AppState, type CategoryState } from '../state';

const WARN_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M7.1 1.9a1 1 0 0 1 1.8 0l6 11.1A1 1 0 0 1 14 14.5H2a1 1 0 0 1-.9-1.5zM8 5.5a.8.8 0 0 0-.8.8v3.4a.8.8 0 0 0 1.6 0V6.3A.8.8 0 0 0 8 5.5m0 7a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8"/></svg>';

let open = false;
let closeTimer: ReturnType<typeof setTimeout> | undefined;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const isDanger = (c: CategoryState) => c.warning?.level === 'danger';

function item(c: CategoryState): HTMLLIElement {
  const li = el('li', 'confirm-item');
  li.style.setProperty('--c', c.color);
  li.classList.toggle('is-danger', isDanger(c));
  li.append(el('span', 'confirm-dot'), el('span', 'confirm-name', c.name), el('span', 'confirm-size', formatBytes(c.bytes ?? 0)));
  if (c.warning) {
    const warn = el('p', `confirm-warn ${c.warning.level}`);
    if (isDanger(c)) warn.innerHTML = WARN_ICON; // o triângulo fica só para o que não volta
    warn.append(el('span', '', c.warning.text));
    li.append(warn);
  }
  return li;
}

const needsAck = (s: AppState) => chosen(s).some(isDanger);

function updateOk(s: AppState) {
  const ack = $<HTMLInputElement>('confirm-ack');
  $<HTMLButtonElement>('confirm-ok').disabled = needsAck(s) && !ack.checked;
}

/** esmaece o pé da lista enquanto ainda há itens para rolar */
function updateFade() {
  const list = $('confirm-list');
  list.classList.toggle('has-more', list.scrollTop + list.clientHeight < list.scrollHeight - 2);
}

export function bindConfirm(s: AppState, handlers: { onConfirm(): void; onCancel(): void }) {
  $('confirm-ok').addEventListener('click', handlers.onConfirm);
  $('confirm-cancel').addEventListener('click', handlers.onCancel);
  $('confirm-ack').addEventListener('change', () => updateOk(s));
  $('confirm-list').addEventListener('scroll', updateFade, { passive: true });
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

/** ["navegadores", "Steam e Epic"] → itens da lista "feche antes" */
function closeFirst(sel: CategoryState[]) {
  const names = sel.map((c) => c.closeFirst).filter((n): n is string => !!n);
  $('confirm-close').hidden = names.length === 0;
  $('confirm-close-list').replaceChildren(...names.map((n) => el('li', 'confirm-close-item', n)));
}

export function renderConfirm(s: AppState) {
  const scrim = $('confirm-scrim');
  const shouldOpen = s.phase === 'confirm';
  if (shouldOpen === open) return;
  open = shouldOpen;

  clearTimeout(closeTimer);
  scrim.classList.remove('closing', 'opening');
  if (!open) {
    // some em pixels (confirm.css) e só então sai da tela; enquanto isso não recebe clique
    scrim.classList.add('closing');
    closeTimer = setTimeout(() => {
      scrim.hidden = true;
      scrim.classList.remove('closing');
    }, 150);
    return;
  }

  // o que é perigoso aparece primeiro, nunca escondido no fim da lista
  const rank = (c: CategoryState) => (isDanger(c) ? 0 : c.warning ? 1 : 2);
  const sel = [...chosen(s)].sort((a, b) => rank(a) - rank(b));
  const danger = needsAck(s);
  const bytes = formatBytes(chosenBytes(s));
  const verb = danger ? 'Apagar' : 'Limpar';

  $('confirm-title').textContent = `${verb} ${bytes}?`;
  $('confirm-desc').textContent = danger
    ? 'O que está em vermelho é apagado de vez. O resto os apps recriam quando precisarem.'
    : 'São caches e temporários: os apps recriam o que precisarem. Arquivos em uso ficam para a próxima.';
  closeFirst(sel);
  $('confirm-list').replaceChildren(...sel.map(item));

  const ok = $<HTMLButtonElement>('confirm-ok');
  ok.textContent = `${verb} ${bytes}`;
  ok.classList.toggle('danger', danger);
  ok.classList.toggle('primary', !danger);
  const ack = $<HTMLInputElement>('confirm-ack');
  ack.checked = false;
  $('confirm-ack-row').hidden = !danger;
  updateOk(s);

  scrim.hidden = false;
  // surge em pixels (confirm.css); depois a máscara sai, senão cortaria a sombra do diálogo
  scrim.classList.add('opening');
  closeTimer = setTimeout(() => scrim.classList.remove('opening'), 300);
  updateFade();
  $('confirm-cancel').focus();
}
