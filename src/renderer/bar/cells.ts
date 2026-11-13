// Os quadradinhos de um bloco: quais acendem, o pulso, e o surgimento com "pop" e lampejo.
import { CELL, FREE, PITCH, ROWS, cellY, rand, type Pass } from './geometry';

/**
 * Como é um quadradinho: se está aceso, o brilho (0 a 1) e se é "quente" (quase branco).
 * Com t (segundos), cada pixel pulsa no seu ritmo e às vezes dá um lampejo.
 */
function cellLight(seed: number, col: number, row: number, t: number | null) {
  // Mais quadradinhos acesos embaixo, como se o bloco estivesse "cheio"
  const chance = 0.04 + 0.85 * (row / (ROWS - 1)) ** 4;
  const on = rand(seed, col, row) < chance;
  let level = 0.5 + 0.5 * rand(seed, col, row + 97);

  if (on && t !== null) {
    const phase = rand(seed, col, row + 331) * Math.PI * 2;
    const speed = 0.6 + rand(seed, col, row + 517) * 1.4;
    level *= 0.7 + 0.3 * Math.sin(t * speed + phase);
    const flash = Math.max(0, Math.sin(t * speed * 0.45 + phase * 3)) ** 60;
    level = Math.min(1, level + flash * 0.7);
  }
  return { on, level, hot: on && level > 0.88 };
}

/* ---------- Surgimento: pixels aparecem de baixo para cima, com "pop" e lampejo ---------- */

const APPEAR_ROW_DELAY = 0.035; // segundos entre uma linha e a de cima
const APPEAR_JITTER = 0.12;     // variação por pixel, para não subir como uma régua
const APPEAR_DUR = 0.3;         // duração do pop de cada pixel
export const OUTLINE_FADE = 0.45;       // contorno do bloco acende nesse tempo
export const APPEAR_SEG_STAGGER = 0.09; // atraso entre um bloco e o próximo
/** quanto tempo um bloco leva para aparecer por completo */
export const APPEAR_SEG_TOTAL = (ROWS - 1) * APPEAR_ROW_DELAY + APPEAR_JITTER + APPEAR_DUR;

/** progresso (0 a 1) do pixel, dado o tempo desde que o bloco começou a aparecer */
function cellAppear(elapsed: number, seed: number, col: number, row: number): number {
  const delay = (ROWS - 1 - row) * APPEAR_ROW_DELAY + rand(seed, col, row + 733) * APPEAR_JITTER;
  return Math.min(1, Math.max(0, (elapsed - delay) / APPEAR_DUR));
}

/** cresce passando um pouco do tamanho e volta: dá a sensação de "pop" */
function easeOutBack(p: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2;
}

function freeCell(ctx: CanvasRenderingContext2D, pass: Pass, x: number, y: number) {
  if (pass !== 'base') return; // vazio não brilha
  ctx.globalAlpha = 1;
  ctx.fillStyle = FREE;
  ctx.fillRect(x, y, CELL, CELL);
}

export interface CellsOptions {
  x: number;
  count: number;      // colunas do bloco
  litCount: number;   // colunas ainda cheias (o resto já foi limpo)
  seed: number;
  color: string;
  alpha: number;
  t: number | null;        // tempo para o pulso
  appear: number | null;   // segundos desde que o bloco começou a surgir
}

export function drawCells(ctx: CanvasRenderingContext2D, pass: Pass, o: CellsOptions) {
  for (let i = 0; i < o.count; i++) {
    const cx = o.x + i * PITCH + 1;
    for (let r = 0; r < ROWS; r++) {
      const cy = cellY(r);
      if (i >= o.litCount) {
        freeCell(ctx, pass, cx, cy); // parte já limpa
        continue;
      }

      // Surgimento: o pixel ainda não apareceu, está "estourando" ou já está pronto
      const p = o.appear === null ? 1 : cellAppear(o.appear, o.seed, i, r);
      if (p <= 0) {
        freeCell(ctx, pass, cx, cy);
        continue;
      }
      const popping = p < 1;
      const size = popping ? CELL * easeOutBack(p) : CELL;
      const flash = popping ? (1 - p) ** 2 : 0; // lampejo branco que vira a cor
      const fade = popping ? Math.min(1, p * 2) : 1;
      const px = cx + (CELL - size) / 2;
      const py = cy + (CELL - size) / 2;
      const { on, level, hot } = cellLight(o.seed, i, r, o.t);

      if (pass === 'glow') {
        if (on) {
          ctx.globalAlpha = level * o.alpha;
          ctx.fillStyle = hot ? '#FFFFFF' : o.color;
          ctx.fillRect(px, py, size, size);
        }
        if (flash > 0.02) {
          ctx.globalAlpha = flash * o.alpha;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(px, py, size, size);
        }
        continue;
      }

      ctx.fillStyle = o.color;
      ctx.globalAlpha = (on ? level : 0.13) * o.alpha * fade;
      ctx.fillRect(px, py, size, size);
      if (hot) {
        // núcleo quase branco nos pixels mais fortes
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.55 * o.alpha * fade;
        ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      }
      if (flash > 0.02) {
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = flash * 0.85 * o.alpha;
        ctx.fillRect(px, py, size, size);
      }
    }
  }
  ctx.globalAlpha = 1;
}
