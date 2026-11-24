// Menu (☰ na barra de título): desliza da esquerda por cima do app. Mostra o símbolo,
// o nome e as pastas reais que cada categoria vai limpar. Clicar numa pasta abre no Explorador.
import type { FolderInfo } from '../../shared/types';
import { $ } from '../dom';
import { formatBytes, plural, shortPath } from '../format';
import { chosen, chosenBytes, isSelectable, type AppState, type CategoryState } from '../state';
import { renderHistory } from './history';
import { startPanelEdge, stopPanelEdge } from './panel-edge';

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
    startPanelEdge(s.cats.map((c) => c.color));
    renderPanel(s);
    $('panel').focus();
  } else {
    stopPanelEdge();
    $('panel-toggle').focus();
  }
}

export function bindPanel(s: AppState, onOpenFolder: (path: string) => void) {
  // a borda é desenhada no tamanho da janela: redesenha se ela mudar com a gaveta aberta
  window.addEventListener('resize', () => {
    if (isOpen) startPanelEdge(s.cats.map((c) => c.color));
  });
  $('panel-toggle').addEventListener('click', () => setPanel(!isOpen, s));
  $('scrim').addEventListener('click', () => setPanel(false, s));
  $('panel-list').addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.dr-folder');
    if (btn?.dataset.path) onOpenFolder(btn.dataset.path);
  });
}

/**
 * Caminho completo, como no Explorador, com "(seu usuário)" no lugar do código SID da Lixeira.
 * Pode quebrar linha só depois de cada "\", nunca no meio de um nome.
 */
function pathNode(path: string): HTMLSpanElement {
  const span = el('span', 'dr-path');
  const parts = shortPath(path, 200).replace(/\\S-1-5-[\d-]+$/, '\\(seu usuário)').split('\\');
  parts.forEach((part, i) => {
    if (i === parts.length - 1) {
      span.append(el('span', 'dr-leaf', part)); // o nome da pasta em destaque; o caminho até ela fica apagado
      return;
    }
    span.append(`${part}\\`, document.createElement('wbr'));
  });
  return span;
}

function folderRow(f: FolderInfo, gone: boolean): HTMLLIElement {
  const btn = el('button', 'dr-folder');
  btn.type = 'button';
  btn.dataset.path = f.path;
  btn.title = gone ? `Não foi possível abrir: ${f.path}` : `Abrir no Explorador: ${f.path}`;
  btn.classList.toggle('is-empty', f.bytes === 0 || gone);

  const size = gone ? 'Não existe mais' : f.denied ? 'Precisa de admin' : f.bytes === 0 ? 'Vazia' : formatBytes(f.bytes);
  const open = el('span', 'dr-open');
  open.innerHTML = OPEN_ICON;
  btn.append(pathNode(f.path), el('span', 'dr-size', size), open);
  if (f.note) btn.append(el('span', 'dr-note', f.note));

  const li = document.createElement('li');
  li.append(btn);
  return li;
}

function categorySection(c: CategoryState, unopened: Set<string>): HTMLElement {
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
    section.append(el('p', 'dr-cat-state', `${c.blocked.reason}.`));
  } else if (!willClean) {
    section.append(el('p', 'dr-cat-state', c.bytes ? 'Desmarcada: não será limpa' : 'Nada para limpar aqui'));
  }
  if (c.folders.length === 0) {
    // desmarcada ou vazia já ganhou uma frase acima; não repete
    if (willClean) section.append(el('p', 'dr-cat-state', 'Nenhuma dessas pastas existe neste PC'));
    return section;
  }

  const list = el('ul', 'dr-folders');
  [...c.folders].sort((a, b) => b.bytes - a.bytes).forEach((f) => list.append(folderRow(f, unopened.has(f.path))));
  if (willClean) {
    section.append(list);
    return section;
  }
  // o que não vai ser limpo fica recolhido, para a gaveta mostrar primeiro o que importa
  const more = el('details', 'dr-more');
  more.append(el('summary', 'dr-more-toggle', `Ver ${plural(c.folders.length, 'pasta', 'pastas')}`), list);
  section.append(more);
  return section;
}

/** Redesenha a lista só quando a coluna está aberta e algo mudou (state.rev) */
export function renderPanel(s: AppState) {
  if (!isOpen || drawnRev === s.rev) return;
  drawnRev = s.rev;
  renderHistory(s);

  // resumo do que vai acontecer: só as categorias marcadas contam
  const sel = chosen(s);
  const folders = sel.reduce((n, c) => n + (c.folders?.length ?? 0), 0);
  $('panel-count').textContent = folders
    ? `${formatBytes(chosenBytes(s))} em ${plural(folders, 'pasta', 'pastas')}`
    : 'Nenhuma categoria marcada';

  // redesenha sem perder a posição da rolagem
  const scroller = $('panel-scroll');
  const scroll = scroller.scrollTop;
  $('panel-list').replaceChildren(...s.cats.map((c) => categorySection(c, s.unopened)));
  scroller.scrollTop = scroll;
}
