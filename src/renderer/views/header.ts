// Topo: espaço usado no disco, status atual e botão "Analisar de novo".
import { $ } from '../dom';
import { formatBytes, shortPath } from '../format';
import { cleanableBytes, isBusy, type AppState } from '../state';

function status(s: AppState): [verb: string, path: string] {
  switch (s.phase) {
    case 'scanning':
      return ['Analisando', shortPath(s.path, s.home)];
    case 'cleaning':
      return ['Limpando', shortPath(s.path, s.home)];
    case 'done':
      return [s.result?.freed ? `${formatBytes(s.result.freed)} liberados` : 'Nada foi apagado', ''];
    default: {
      const total = cleanableBytes(s);
      return [total > 0 ? `Dá para liberar ${formatBytes(total)}` : 'Está tudo limpo', ''];
    }
  }
}

export function bindHeader(onRescan: () => void) {
  $('rescan').addEventListener('click', onRescan);
}

export function renderHeader(s: AppState) {
  if (s.disk) {
    $('used').textContent = formatBytes(s.disk.total - s.disk.free);
    $('of').textContent = `de ${formatBytes(s.disk.total)} usados em ${s.disk.drive}`;
  }

  const [verb, path] = status(s);
  $('status-verb').textContent = verb;
  $('status-path').textContent = path;

  const rescan = $<HTMLButtonElement>('rescan');
  rescan.disabled = isBusy(s);
  rescan.classList.toggle('spinning', s.phase === 'scanning');
}
