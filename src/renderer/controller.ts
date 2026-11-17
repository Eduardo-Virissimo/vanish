// Ações da tela: analisar, limpar e reagir aos avisos do processo principal.
// É o único lugar que muda o estado; depois de mudar, chama render().
import type { CategoryScan } from '../shared/ipc';
import type { CategoryId } from '../shared/types';
import type { PixelBar } from './bar/pixel-bar';
import { saveHistory, saveUnchecked } from './memory';
import {
  chosen, cleanableBytes, isBusy, isSelectable, isUnavailable, type AppState, type CategoryState,
} from './state';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createController(state: AppState, bar: PixelBar, render: () => void) {
  const api = window.cleaner;
  const find = (id: CategoryId) => state.cats.find((c) => c.id === id);
  const bytesAtStart = new Map<CategoryId, number>();
  /** soma do que cada categoria já liberou nesta limpeza (vale mesmo se ela parar no meio) */
  let freedSoFar = 0;

  // A barra inteira = todo o lixo da última análise (state.scale, definido no fim do scan).
  // Depois de limpar, a escala fica fixa e o espaço liberado vira pontinhos apagados.
  function updateBar() {
    bar.setData(state.scale || 1, state.cats.map((c) => ({
      id: c.id,
      color: c.color,
      bytes: isUnavailable(c) ? 0 : c.bytes ?? 0,
      selected: c.selected && isSelectable(c),
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
    freedSoFar += freed;
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

  // versão nova do GitHub: só aparece na tela quando já está baixada
  api.on('update:status', (status) => {
    state.update = status;
    render();
  });

  /* ---------- Ações do usuário ---------- */

  async function scan() {
    if (isBusy(state)) return;
    state.phase = 'scanning';
    state.problem = null;
    state.path = '';
    state.unopened.clear();
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
    } catch {
      // sem resultado não dá para dizer "está tudo limpo": a tela mostra o erro
      state.problem = 'scan';
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
    state.problem = null;
    state.path = '';
    freedSoFar = 0;
    render();
    try {
      state.result = await api.invoke('clean', ids);
    } catch {
      // parou no meio: mostra só o que de fato saiu, nunca "0 arquivos" como se tivesse dado certo
      state.problem = 'clean';
      state.result = { freed: freedSoFar, removed: 0, skipped: 0 };
    }
    await wait(500); // espera a última animação
    await refreshDisk();
    if (state.result && state.result.freed > 0) {
      state.history = [...state.history, { at: Date.now(), freed: state.result.freed }];
      saveHistory(state.history);
      state.rev++; // o gráfico da gaveta muda
    }
    state.phase = 'done';
    render();
  }

  /** Primeiro clique pede confirmação; o segundo apaga. Depois de um erro, analisa de novo */
  function requestClean() {
    if (state.problem && !isBusy(state) && state.phase !== 'confirm') void scan();
    else if (state.phase === 'confirm') void clean();
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
    // lembra só o que foi desmarcado (nunca marca sozinha uma categoria arriscada)
    saveUnchecked(state.cats.filter((c) => c.touched && !c.selected).map((c) => c.id));
    state.rev++;
    updateBar(); // o bloco da categoria adormece ou reacende pixel a pixel
    if (state.phase === 'done' || state.phase === 'confirm') state.phase = 'idle';
    render();
  }

  function openFolder(path: string) {
    api.invoke('folder:open', path).catch(() => {
      // a pasta sumiu (ou ficou inacessível) depois da análise: a linha passa a dizer isso
      state.unopened.add(path);
      state.rev++;
      render();
    });
  }

  /** reabre como administrador; se a pessoa recusar no aviso do Windows, nada muda */
  function relaunchAsAdmin() {
    if (isBusy(state)) return;
    void api.invoke('app:relaunch-admin').catch(() => false);
  }

  /** reinicia instalando a versão nova (o main recusa se estiver analisando ou limpando) */
  function installUpdate() {
    if (isBusy(state) || state.update?.state !== 'ready') return;
    void api.invoke('update:install').catch(() => false);
  }

  return { scan, requestClean, cancel, toggle, openFolder, relaunchAsAdmin, installUpdate };
}
