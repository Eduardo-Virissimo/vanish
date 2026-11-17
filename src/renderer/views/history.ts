// Histórico na gaveta (☰): total liberado com o Vanish e um gráfico de pixels das últimas 8
// semanas. Cada semana é uma coluna de até 10 pixels, na mesma linguagem da barra.
import { $ } from '../dom';
import { formatBytes, plural } from '../format';
import type { CleanRecord } from '../memory';
import type { AppState } from '../state';

const WEEKS = 8;
const CELLS = 10;
const DAY = 24 * 60 * 60 * 1000;

/** segunda-feira 00:00 da semana de `t` */
function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** quanto foi liberado em cada uma das últimas semanas (a última é a atual) */
function weekly(history: CleanRecord[], now = Date.now()) {
  const current = weekStart(now);
  return Array.from({ length: WEEKS }, (_, i) => {
    const start = current - (WEEKS - 1 - i) * 7 * DAY;
    const end = start + 7 * DAY;
    const freed = history.filter((r) => r.at >= start && r.at < end).reduce((sum, r) => sum + r.freed, 0);
    return { start, freed };
  });
}

const shortDate = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export function renderHistory(s: AppState) {
  const total = s.history.reduce((sum, r) => sum + r.freed, 0);
  $('history-total').textContent = total > 0 ? formatBytes(total) : '—';
  $('history-sub').textContent = s.history.length
    ? `liberados em ${plural(s.history.length, 'limpeza', 'limpezas')}`
    : 'O total liberado aparece aqui depois da primeira limpeza.';

  const weeks = weekly(s.history);
  const max = Math.max(...weeks.map((w) => w.freed));
  $('history-chart').replaceChildren(...weeks.map((w, i) => {
    const col = document.createElement('span');
    col.className = 'hist-col';
    col.classList.toggle('is-now', i === WEEKS - 1);
    // pelo menos um pixel se a semana teve alguma limpeza
    const lit = w.freed > 0 ? Math.max(1, Math.round((w.freed / max) * CELLS)) : 0;
    col.style.setProperty('--lit', String(lit));
    col.style.setProperty('--col', String(i));
    col.title = `Semana de ${shortDate(w.start)}: ${w.freed > 0 ? formatBytes(w.freed) : 'nada'}`;
    for (let k = 0; k < CELLS; k++) {
      const px = document.createElement('i');
      // de baixo para cima: os primeiros `lit` acendem, com o degradê do símbolo (azul → ciano)
      // o mais alto aceso é o "topo": pulsa de leve depois que a coluna sobe
      if (CELLS - 1 - k < lit) px.className = CELLS - 1 - k === lit - 1 ? 'on top' : 'on';
      px.style.setProperty('--row', String(CELLS - 1 - k));
      col.append(px);
    }
    return col;
  }));
}
