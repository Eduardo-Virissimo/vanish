// Grade de categorias: cada linha é um checkbox com ícone, nome e tamanho.
import type { CategoryId } from '../../shared/types';
import { $ } from '../dom';
import { formatBytes } from '../format';
const CHECK_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2.5 6.3 2.4 2.3 4.6-5"/></svg>';
import { isBusy, isSelectable, isUnavailable, type AppState, type CategoryState } from '../state';

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
  if (c.bytes === 0) return 'Vazio';
  return formatBytes(c.bytes);
}

export function renderCategories(s: AppState) {
  for (const c of s.cats) {
    const btn = rows.get(c.id);
    if (!btn) continue;
    btn.setAttribute('aria-checked', String(c.selected && isSelectable(c)));
    btn.classList.toggle('is-empty', c.bytes === 0 && !isUnavailable(c));
    btn.classList.toggle('is-denied', isUnavailable(c));
    btn.disabled = isBusy(s) || !isSelectable(c);
    btn.title = c.blocked ? `${c.hint}\n\n${c.blocked}.` : c.hint;

    const size = btn.querySelector('.cat-size')!;
    size.classList.toggle('loading', c.bytes === null);
    size.textContent = sizeLabel(c);
  }
}
