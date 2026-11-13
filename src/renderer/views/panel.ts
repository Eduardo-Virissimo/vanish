// Menu (☰ na barra de título): desliza da esquerda por cima do app. Mostra o símbolo,
// o nome e as pastas reais que cada categoria vai limpar. Clicar numa pasta abre no Explorador.
import type { FolderInfo } from '../../shared/types';
import { $ } from '../dom';
import { formatBytes, plural, shortPath } from '../format';
import { isSelectable, type AppState, type CategoryState } from '../state';

const OPEN_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M13.5 2.5 8 8M6.5 3.5h-3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3"/></svg>';

let isOpen = false;
let drawnRev = -1;

/** cria um elemento com classe e texto (texto nunca vira HTML) */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export const panelOpen = () => isOpen;

export function setPanel(open: boolean, s: AppState) {
  if (open === isOpen) return;
  isOpen = open;
  $('app').classList.toggle('panel-open', open);
  $('panel').inert = !open;
  // o mesmo botão abre (☰) e fecha (X); o CSS faz ele deslizar e virar X
  const toggle = $('panel-toggle');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  toggle.title = open ? 'Fechar menu' : 'Menu';
  if (open) {
    renderPanel(s);
    $('panel').focus();
  } else {
    $('panel-toggle').focus();
  }
}

export function bindPanel(s: AppState, onOpenFolder: (path: string) => void) {
  $('panel-toggle').addEventListener('click', () => setPanel(!isOpen, s));
  $('scrim').addEventListener('click', () => setPanel(false, s));
  $('panel-list').addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.dr-folder');
    if (btn?.dataset.path) onOpenFolder(btn.dataset.path);
  });
}

/** Caminho legível: "~" para a pasta do usuário e "(seu usuário)" no lugar do código SID da Lixeira */
const displayPath = (path: string, home: string) =>
  shortPath(path, home, 200).replace(/\\S-1-5-[\d-]+$/, '\\(seu usuário)');

function folderRow(f: FolderInfo, home: string): HTMLLIElement {
  const btn = el('button', 'dr-folder');
  btn.type = 'button';
  btn.dataset.path = f.path;
  btn.title = `Abrir no Explorador: ${f.path}`;
  btn.classList.toggle('is-empty', f.bytes === 0);

  const size = f.denied ? 'Precisa de admin' : f.bytes === 0 ? 'Vazia' : formatBytes(f.bytes);
  const open = el('span', 'dr-open');
  open.innerHTML = OPEN_ICON;
  btn.append(el('span', 'dr-path', displayPath(f.path, home)), el('span', 'dr-size', size), open);
  if (f.note) btn.append(el('span', 'dr-note', f.note));

  const li = document.createElement('li');
  li.append(btn);
  return li;
}

function categorySection(c: CategoryState, home: string): HTMLElement {
  const section = el('section', 'dr-cat');
  section.style.setProperty('--c', c.color);
  const willClean = c.selected && isSelectable(c);
  section.classList.toggle('is-off', !willClean);

  const head = el('div', 'dr-cat-head');
  head.append(
    el('span', 'dr-dot'),
    el('h3', 'dr-cat-name', c.name),
    el('span', 'dr-cat-size', c.bytes === null ? '—' : formatBytes(c.bytes)),
  );
  section.append(head);

  if (c.folders === null) {
    section.append(el('p', 'dr-cat-state', 'Analisando…'));
    return section;
  }
  if (c.blocked) {
    section.append(el('p', 'dr-cat-state', `${c.blocked}.`));
  } else if (!willClean) {
    section.append(el('p', 'dr-cat-state', c.bytes ? 'Desmarcada: não será limpa' : 'Nada para limpar aqui'));
  }
  if (c.folders.length === 0) {
    section.append(el('p', 'dr-cat-state', 'Nenhuma dessas pastas existe neste PC'));
    return section;
  }

  const list = el('ul', 'dr-folders');
  [...c.folders].sort((a, b) => b.bytes - a.bytes).forEach((f) => list.append(folderRow(f, home)));
  section.append(list);
  return section;
}

/** Redesenha a lista só quando a coluna está aberta e algo mudou (state.rev) */
export function renderPanel(s: AppState) {
  if (!isOpen || drawnRev === s.rev) return;
  drawnRev = s.rev;

  const folders = s.cats.reduce((n, c) => n + (c.folders?.length ?? 0), 0);
  $('panel-count').textContent = folders ? plural(folders, 'pasta encontrada', 'pastas encontradas') : '';

  // redesenha sem perder a posição da rolagem
  const scroller = $('panel-scroll');
  const scroll = scroller.scrollTop;
  $('panel-list').replaceChildren(...s.cats.map((c) => categorySection(c, s.home)));
  scroller.scrollTop = scroll;
}
