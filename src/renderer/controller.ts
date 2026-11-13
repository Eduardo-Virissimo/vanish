// Ações da tela: analisar, limpar e reagir aos avisos do processo principal.
// É o único lugar que muda o estado; depois de mudar, chama render().
import type { CategoryScan } from '../shared/ipc';
import type { CategoryId } from '../shared/types';
import type { PixelBar } from './bar/pixel-bar';
import {
  chosen, cleanableBytes, isBusy, isSelectable, isUnavailable, type AppState, type CategoryState,
} from './state';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createController(state: AppState, bar: PixelBar, render: () => void) {
  const api = window.cleaner;
  const find = (id: CategoryId) => state.cats.find((c) => c.id === id);
  const bytesAtStart = new Map<CategoryId, number>();

  // A barra inteira = todo o lixo da última análise (state.scale, definido no fim do scan).
  // Depois de limpar, a escala fica fixa e o espaço liberado vira pontinhos apagados.
  function updateBar() {
    bar.setData(state.scale || 1, state.cats.map((c) => ({
      id: c.id,
      color: c.color,
      bytes: isUnavailable(c) ? 0 : c.bytes ?? 0,
    })));
  }

  async function refreshDisk() {
    try {
      state.disk = await api.invoke('disk:info');
    } catch { /* mantém o valor anterior */ }
  }

  /* ---------- Avisos do processo principal ---------- */

  api.on('progress:path', (path) => {
    state.path = path;
    render();
  });

  function applyScan({ id, bytes, denied, blocked, folders }: CategoryScan) {
    const c = find(id);
    if (!c) return;
    c.bytes = bytes;
    c.denied = denied;
    c.blocked = blocked;
    c.folders = folders;
    // categorias "opt-in" (Lixeira, Windows Update) começam desmarcadas
    if (!c.touched) c.selected = isSelectable(c) && c.defaultSelected;
    state.rev++;
  }

  // Durante a análise só as linhas atualizam; a barra acende toda no final
  api.on('scan:category', (result) => {
    applyScan(result);
    render();
  });

  api.on('clean:start', ({ id }) => {
    bytesAtStart.set(id, find(id)?.bytes ?? 0);
    bar.startClearing(id);
  });

  api.on('clean:progress', ({ id, freed }) => {
    const start = bytesAtStart.get(id);
    if (start) bar.progress(id, freed / start);
  });

  api.on('clean:category', ({ id, freed, folders }) => {
    const cat = find(id);
    if (cat && folders) {
      cat.folders = folders; // o que sobrou em cada pasta
      state.rev++;
    }
    const start = bytesAtStart.get(id) ?? 0;
    if (start) bar.progress(id, freed / start);
    // Deixa a linha terminar o percurso antes do bloco encolher
    setTimeout(() => {
      bar.finishClearing(id);
      if (cat) cat.bytes = Math.max(0, start - freed);
      state.rev++;
      updateBar();
      render();
    }, 450);
  });

  /* ---------- Ações do usuário ---------- */

  async function scan() {
    if (isBusy(state)) return;
    state.phase = 'scanning';
    state.path = '';
    for (const c of state.cats) {
      c.bytes = null;
      c.folders = null;
    }
    state.rev++;
    bar.startScanning();
    render();
    await refreshDisk();
    render();
    try {
      (await api.invoke('scan')).forEach(applyScan);
    } finally {
      state.phase = 'idle';
      state.scale = cleanableBytes(state);
      updateBar();
      bar.reveal();
      render();
    }
  }

  async function clean() {
    const ids = chosen(state).map((c) => c.id);
    if (!ids.length) return;
    state.phase = 'cleaning';
    state.path = '';
    render();
    try {
      state.result = await api.invoke('clean', ids);
    } catch {
      state.result = { freed: 0, removed: 0, skipped: 0 };
    }
    await wait(500); // espera a última animação
    await refreshDisk();
    state.phase = 'done';
    render();
  }

  /** Primeiro clique pede confirmação; o segundo apaga */
  function requestClean() {
    if (state.phase === 'confirm') void clean();
    else if (!isBusy(state) && chosen(state).length) {
      state.phase = 'confirm';
      render();
    }
  }

  function cancel() {
    if (state.phase !== 'confirm') return;
    state.phase = 'idle';
    render();
  }

  function toggle(cat: CategoryState) {
    if (!isSelectable(cat) || isBusy(state)) return;
    cat.selected = !cat.selected;
    cat.touched = true;
    state.rev++;
    if (state.phase === 'done' || state.phase === 'confirm') state.phase = 'idle';
    render();
  }

  function openFolder(path: string) {
    api.invoke('folder:open', path).catch((err: unknown) => console.warn('Não foi possível abrir a pasta', err));
  }

  return { scan, requestClean, cancel, toggle, openFolder };
}
