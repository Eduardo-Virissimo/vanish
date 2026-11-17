// Cálculo puro dos blocos da barra: quanto cada categoria ocupa e como os tamanhos se animam.
import type { CategoryId } from '../../shared/types';
import { WAKE_SPEED } from './effects';
import type { Segment } from './geometry';

const MIN_COLS = 3; // categorias pequenas ainda aparecem

export interface BarItem {
  id: CategoryId;
  color: string;
  bytes: number;
  /** vai ser limpa (marcada); desmarcada, o bloco fica adormecido */
  selected: boolean;
}

/**
 * Atualiza (ou cria) um bloco por item, proporcional a `total`, cabendo em `cols` colunas.
 * snap = pula a animação e já põe no tamanho final.
 */
export function layoutSegments(segs: Segment[], items: BarItem[], total: number, cols: number, snap: boolean): Segment[] {
  if (!total) return segs;
  const out = [...segs];
  let sum = 0;
  items.forEach((item, index) => {
    let s = out.find((seg) => seg.id === item.id);
    if (!s) {
      const on = item.selected ? 1 : 0;
      s = { id: item.id, index, color: item.color, W: 0, targetW: 0, lit: 0, litTarget: 0, clearing: false, on, onTarget: on, hoverAt: null };
      out.push(s);
    }
    s.index = index;
    s.onTarget = item.selected ? 1 : 0;
    s.targetW = item.bytes > 0 ? Math.max(MIN_COLS, Math.round((item.bytes / total) * cols)) : 0;
    sum += s.targetW;
  });
  out.sort((a, b) => a.index - b.index);

  // O mínimo das categorias pequenas pode estourar a largura: tira do maior bloco
  let excess = sum - cols;
  while (excess > 0) {
    const big = out.reduce((a, b) => (b.targetW > a.targetW ? b : a));
    if (big.targetW <= MIN_COLS) break;
    const cut = Math.min(excess, big.targetW - MIN_COLS);
    big.targetW -= cut;
    excess -= cut;
  }

  for (const s of out) {
    if (!s.clearing) s.litTarget = s.targetW;
    if (snap) {
      s.W = s.targetW;
      s.lit = s.litTarget;
      s.on = s.onTarget;
    }
  }
  return out;
}

/** Aproxima a de b um pouco a cada quadro; encaixa quando já está perto */
const approach = (a: number, b: number, k: number) => (Math.abs(b - a) < 0.01 ? b : a + (b - a) * k);

/** Avança a animação de tamanho um quadro; devolve true enquanto algum bloco se mexe */
export function stepSegments(segs: Segment[], dt: number): boolean {
  let moving = false;
  for (const s of segs) {
    // marcar/desmarcar: anda em velocidade constante, para os pixels trocarem num ritmo regular
    if (s.on !== s.onTarget) {
      const stepOn = WAKE_SPEED * dt;
      s.on = Math.abs(s.onTarget - s.on) <= stepOn ? s.onTarget : s.on + Math.sign(s.onTarget - s.on) * stepOn;
      moving = true;
    }
    s.W = approach(s.W, s.targetW, 0.12);
    const litGoal = Math.min(s.litTarget, s.W);
    s.lit = approach(s.lit, litGoal, s.clearing ? 0.06 : 0.12);
    if (s.W !== s.targetW || s.lit !== litGoal || s.clearing) moving = true;
  }
  return moving;
}
