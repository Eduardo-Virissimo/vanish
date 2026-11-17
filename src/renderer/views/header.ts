// Topo: o número grande é o que o Vanish faz (quanto dá para liberar, ou quanto liberou).
// O disco usado vira contexto na linha de baixo, que também mostra o que está sendo lido ou apagado.
import { $ } from '../dom';
import { daysAgo, formatBytes, shortPath } from '../format';
import { cleanableBytes, isBusy, lastClean, type AppState } from '../state';
import { tweenNumber } from './tween';

interface Hero {
  /** null = mostra o texto em vez de um número */
  bytes: number | null;
  text?: string;
  label: string;
}

function hero(s: AppState): Hero {
  if (s.phase === 'done' && s.result) {
    if (s.problem !== 'clean') return { bytes: s.result.freed, label: 'liberados' };
    return s.result.freed > 0
      ? { bytes: s.result.freed, label: 'liberados antes do erro' }
      : { bytes: null, text: '—', label: 'A limpeza não terminou' };
  }
  if (s.problem === 'scan') return { bytes: null, text: '—', label: 'A análise não terminou' };
  const total = cleanableBytes(s);
  if (s.phase !== 'scanning' && total === 0) return { bytes: null, text: 'Tudo limpo', label: '' };
  return { bytes: total, label: 'para liberar' };
}

function status(s: AppState): [text: string, path: string, isContext: boolean] {
  if (s.phase === 'scanning') return ['Analisando', shortPath(s.path), false];
  if (s.phase === 'cleaning') return ['Limpando', shortPath(s.path), false];
  if (!s.disk) return ['', '', true];
  const used = `${formatBytes(s.disk.total - s.disk.free)} de ${formatBytes(s.disk.total)} usados em ${s.disk.drive}`;
  // logo depois de limpar a data seria "hoje": não acrescenta nada
  const prev = lastClean(s);
  const last = prev && s.phase !== 'done' ? ` · última limpeza ${daysAgo(prev.at)}` : '';
  return [used + last, '', true];
}

export function bindHeader(onRescan: () => void) {
  $('rescan').addEventListener('click', onRescan);
}

let lastPhase = '';

export function renderHeader(s: AppState) {
  const h = hero(s);
  const value = $('hero-value');
  if (h.bytes === null) {
    tweenNumber(value, null);
    value.textContent = h.text ?? '';
  } else {
    // ao terminar a limpeza o número sobe do zero até o total liberado
    const from = s.phase === 'done' && lastPhase !== 'done' ? 0 : undefined;
    tweenNumber(value, h.bytes, formatBytes, from);
  }
  $('hero-label').textContent = h.label;
  $('app').classList.toggle('just-cleaned', s.phase === 'done' && !s.problem && (s.result?.freed ?? 0) > 0);
  // o número muda de verdade no fim da análise e no fim da limpeza: passa por pixels até ficar nítido
  const settled = (lastPhase === 'scanning' && s.phase !== 'scanning') || (s.phase === 'done' && lastPhase !== 'done');
  if (settled) {
    value.classList.remove('pixel-in');
    void value.offsetWidth; // reinicia a animação mesmo se a classe acabou de sair
    value.classList.add('pixel-in');
  }
  lastPhase = s.phase;

  const [text, path, isContext] = status(s);
  $('status-verb').textContent = text;
  $('status-verb').classList.toggle('is-context', isContext);
  $('status-path').textContent = path;

  const rescan = $<HTMLButtonElement>('rescan');
  rescan.disabled = isBusy(s);
  rescan.classList.toggle('spinning', s.phase === 'scanning');
}
