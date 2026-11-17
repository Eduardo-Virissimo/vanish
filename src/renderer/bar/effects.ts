// Efeitos por pixel que contam o que está acontecendo com cada bloco:
//  - adormecer/acordar: categoria desmarcada apaga pixel a pixel e fica cinza; marcada reacende
//  - onda: passar o mouse (ou o foco) na categoria manda uma onda de luz pelo bloco
//  - desfazer: atrás da faísca os pixels se desfazem na diagonal, como o símbolo do Vanish
//  - queda: parado, de vez em quando um pixel cai do topo e pousa na pilha (lixo acumulando)
import { CELL, PITCH, ROWS, cellY, rand, type Pass } from './geometry';

/* ---------- Adormecer / acordar ---------- */

export const DORMANT = '#8E9099';
/** quanto `on` anda por segundo (1 → 0 em ~0,35 s) */
export const WAKE_SPEED = 1 / 0.35;

/**
 * Cada pixel tem um limiar fixo: está acordado enquanto o nível do bloco (on) passa dele.
 * Assim a transição acontece pixel a pixel, numa ordem aleatória mas sempre a mesma.
 * spark = lampejo do pixel que acabou de acordar (0 a 1).
 */
export function wakeState(seed: number, col: number, row: number, on: number, waking: boolean) {
  const threshold = rand(seed, col, row + 911) * 0.92 + 0.04;
  const awake = on > threshold;
  const spark = waking && awake ? Math.max(0, 1 - (on - threshold) / 0.18) : 0;
  return { awake, spark };
}

/* ---------- Onda do hover ---------- */

const RIPPLE_SPEED = 70;  // colunas por segundo
const RIPPLE_WIDTH = 5;   // largura da onda em colunas
export const rippleDuration = (cols: number) => (cols + RIPPLE_WIDTH * 2) / RIPPLE_SPEED;

/** brilho extra (0 a 1) da onda na coluna `col`, `age` segundos depois do hover começar */
export function ripple(col: number, row: number, age: number): number {
  // a onda entra um pouco inclinada: as linhas de baixo vão na frente
  const pos = age * RIPPLE_SPEED - RIPPLE_WIDTH + (ROWS - 1 - row) * 0.25;
  const d = col - pos;
  return Math.exp(-(d * d) / RIPPLE_WIDTH);
}

/* ---------- Desfazer na diagonal (limpeza) ---------- */

const DISSOLVE_COLS = 9; // quantas colunas depois da faísca ainda têm pedaços no ar

/**
 * Pixel já limpo, mas perto da faísca: quanto dele ainda existe (0 = sumiu, 1 = inteiro).
 * Some primeiro em cima e mais longe da faísca, como o símbolo se desfazendo.
 */
export function dissolveLeft(seed: number, col: number, row: number, edge: number): number {
  const d = (col + 0.5 - edge) / DISSOLVE_COLS;
  if (d >= 1) return 0;
  const height = 1 - row / (ROWS - 1); // 1 em cima, 0 embaixo
  const jitter = rand(seed, col, row + 1201) * 0.35;
  return Math.max(0, Math.min(1, 1 - (d * 1.1 + height * 0.55 + jitter - 0.25)));
}

/** desenha o pedaço que está se desfazendo: menor, mais quente e deslocado para cima e direita */
export function drawDissolving(
  ctx: CanvasRenderingContext2D, pass: Pass, cx: number, cy: number, left: number, color: string, alpha: number,
) {
  const size = Math.max(1, CELL * (0.35 + 0.65 * left));
  const drift = (1 - left) * 7;
  const x = cx + (CELL - size) / 2 + drift;
  const y = cy + (CELL - size) / 2 - drift * 1.2;
  ctx.globalAlpha = left * alpha * (pass === 'glow' ? 0.9 : 1);
  ctx.fillStyle = left < 0.55 ? '#FFE3B3' : color; // esquenta antes de sumir
  ctx.fillRect(x, y, size, size);
}

/* ---------- Pixel caindo (parado) ---------- */

const DROP_FALL = 0.55; // segundos caindo
const DROP_LAND = 0.35; // lampejo ao pousar

/**
 * Um pixel por bloco, de tempos em tempos (2,5 a 6 s, diferente em cada bloco).
 * Devolve onde ele está agora, ou null se o bloco está sem queda neste momento.
 */
export function dropAt(seed: number, count: number, t: number, landingRow: (col: number) => number) {
  const period = 2.5 + rand(seed, 7, 3) * 3.5;
  const cycle = Math.floor((t + rand(seed, 9, 5) * period) / period);
  const age = (t + rand(seed, 9, 5) * period) - cycle * period;
  if (age > DROP_FALL + DROP_LAND || count < 2) return null;
  const col = Math.floor(rand(seed, cycle, 41) * count);
  const land = landingRow(col);
  if (land < 1) return null; // coluna cheia até o topo
  const fall = Math.min(1, age / DROP_FALL);
  const y = cellY(0) - PITCH * 2 + (cellY(land) - cellY(0) + PITCH * 2) * fall * fall; // acelera como gravidade
  const flash = age > DROP_FALL ? 1 - (age - DROP_FALL) / DROP_LAND : 0;
  return { col, y, flash, falling: fall < 1 };
}
