// Grade de categorias: cada linha é um checkbox (de pixel) com ícone, nome e tamanho.
import type { CategoryId } from '../../shared/types';
import { $ } from '../dom';
import { formatBytes } from '../format';
import { isBusy, isSelectable, isUnavailable, type AppState, type CategoryState } from '../state';

/** ✓ desenhado em pixels (grade 7×7); ao marcar, eles acendem um a um (categories.css) */
const CHECK_PIXELS: Array<[number, number]> = [[0, 3], [1, 4], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1]];
const CHECK_ICON = `<svg viewBox="-1 -1 9 9" aria-hidden="true">${
  CHECK_PIXELS.map(([x, y]) => `<rect x="${x + 0.06}" y="${y + 0.06}" width="0.88" height="0.88"/>`).join('')
}</svg>`;

export interface CategoryHandlers {
  onToggle(cat: CategoryState): void;
  onHover(cat: CategoryState | null): void;
}

const rows = new Map<CategoryId, HTMLButtonElement>();

export function mountCategories(s: AppState, handlers: CategoryHandlers) {
  const list = $('cats');
  for (const cat of s.cats) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat';
    btn.title = cat.hint;
    btn.setAttribute('role', 'checkbox');
    btn.style.setProperty('--c', cat.color);
    btn.innerHTML = `
      <span class="check">${CHECK_ICON}</span>
      <svg class="cat-icon" viewBox="0 0 24 24" aria-hidden="true">${cat.icon}</svg>
      <span class="cat-name"></span>
      <span class="cat-size"></span>`;
    btn.querySelector('.cat-name')!.textContent = cat.name;

    btn.addEventListener('click', () => handlers.onToggle(cat));
    btn.addEventListener('mouseenter', () => handlers.onHover(cat));
    btn.addEventListener('focus', () => handlers.onHover(cat));
    btn.addEventListener('mouseleave', () => handlers.onHover(null));
    btn.addEventListener('blur', () => handlers.onHover(null));

    const li = document.createElement('li');
    li.append(btn);
    list.append(li);
    rows.set(cat.id, btn);
  }
}

function sizeLabel(c: CategoryState): string {
  if (c.bytes === null) return '—';
  if (c.blocked) return 'Reinicie antes';
  if (c.denied) return 'Precisa de admin';
  if (c.bytes === 0) return 'Vazia';
  return formatBytes(c.bytes);
}

/** explicação completa, lida pelo leitor de tela e mostrada no tooltip */
function reason(c: CategoryState): string {
  if (c.blocked) return `${c.blocked}. Reinicie o PC e analise de novo.`;
  if (c.denied) return 'Para limpar esta categoria, use "Abrir como administrador", embaixo das categorias.';
  return '';
}

export function renderCategories(s: AppState) {
  for (const c of s.cats) {
    const btn = rows.get(c.id);
    if (!btn) continue;
    btn.setAttribute('aria-checked', String(c.selected && isSelectable(c)));
    btn.classList.toggle('is-empty', c.bytes === 0 && !isUnavailable(c));
    btn.classList.toggle('is-denied', isUnavailable(c));
    // indisponível continua focável (aria-disabled) para o teclado alcançar o motivo;
    // o controller ignora o clique. Vazia não tem o que explicar e sai da ordem do Tab.
    const unavailable = isUnavailable(c) && c.bytes !== null;
    btn.disabled = isBusy(s) || (!isSelectable(c) && !unavailable);
    btn.setAttribute('aria-disabled', String(unavailable));
    const why = reason(c);
    btn.title = why ? `${c.hint}\n\n${why}` : c.hint;
    if (why) btn.setAttribute('aria-description', why);
    else btn.removeAttribute('aria-description');

    const size = btn.querySelector('.cat-size')!;
    size.classList.toggle('loading', c.bytes === null);
    size.textContent = sizeLabel(c);
  }
}
