// Os quadradinhos de um bloco: quais acendem e o pulso. O surgimento fica em appear.ts;
// Os efeitos que contam estado (adormecer, onda, desfazer, queda) ficam em effects.ts.
import { DORMANT, dissolveLeft, drawDissolving, dropAt, ripple, wakeState } from './effects';
import { cellAppear, easeOutBack } from './appear';
import { CELL, PITCH, ROWS, cellY, rand, type Pass } from './geometry';
import { drawGlass, drawLed, rowShades, spill } from './led';

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

function freeCell(ctx: CanvasRenderingContext2D, pass: Pass, x: number, y: number) {
  if (pass !== 'base') return; // vazio não brilha
  drawGlass(ctx, x, y);
}

export interface CellsOptions {
  x: number;
  count: number;      // colunas do bloco
  litCount: number;   // colunas ainda cheias (o resto já foi limpo)
  /** borda exata da parte cheia, em colunas (onde está a faísca) */
  litEdge: number;
  clearing: boolean;
  seed: number;
  color: string;
  alpha: number;
  t: number | null;        // tempo para o pulso
  appear: number | null;   // segundos desde que o bloco começou a surgir
  /** 1 = categoria marcada (acesa), 0 = desmarcada (cinza); entre os dois, trocando pixel a pixel */
  on: number;
  waking: boolean;
  /** segundos desde que o hover começou (null = sem onda) */
  rippleAge: number | null;
}

/** linha onde um pixel que cai na coluna pousa: logo acima do primeiro pixel aceso */
function landingRow(seed: number, col: number): number {
  for (let r = 0; r < ROWS; r++) if (cellLight(seed, col, r, null).on) return r - 1;
  return ROWS - 1;
}

export function drawCells(ctx: CanvasRenderingContext2D, pass: Pass, o: CellsOptions) {
  const shades = rowShades(o.color);
  for (let i = 0; i < o.count; i++) {
    const cx = o.x + i * PITCH + 1;
    for (let r = 0; r < ROWS; r++) {
      const cy = cellY(r);
      if (i >= o.litCount) {
        freeCell(ctx, pass, cx, cy); // parte já limpa
        // logo atrás da faísca, os pixels acesos ainda estão se desfazendo
        if (o.clearing && o.t !== null && cellLight(o.seed, i, r, null).on) {
          const left = dissolveLeft(o.seed, i, r, o.litEdge);
          if (left > 0.02) drawDissolving(ctx, pass, cx, cy, left, o.color, o.alpha);
        }
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
      const light = cellLight(o.seed, i, r, o.t);
      const { awake, spark } = o.on >= 1 ? { awake: true, spark: 0 } : wakeState(o.seed, i, r, o.on, o.waking);
      const wave = o.rippleAge === null || !awake ? 0 : ripple(i, r, o.rippleAge);
      const on = light.on || wave > 0.35; // a onda acende até os pixels apagados por onde passa
      const level = Math.min(1, (light.on ? light.level : 0.25) + wave * 0.55);
      const hot = awake && (light.hot || wave > 0.8);
      const color = awake ? shades[r] : DORMANT;

      if (pass === 'glow') {
        if (on && awake) {
          ctx.globalAlpha = level * o.alpha;
          ctx.fillStyle = hot ? '#FFFFFF' : color;
          ctx.fillRect(px, py, size, size);
        }
        const white = Math.max(flash, spark);
        if (white > 0.02) {
          ctx.globalAlpha = white * o.alpha;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(px, py, size, size);
        }
        continue;
      }

      // aceso: LED com reflexo; apagado: só a luz que vaza do fundo do bloco.
      // adormecido: cinza bem baixo, sem brilho; dá para ver o tamanho do bloco, mas ele "dorme"
      const dormant = awake ? 1 : 0.32;
      if (on) drawLed(ctx, px, py, size, color, level * dormant * o.alpha * fade);
      else {
        ctx.fillStyle = color;
        ctx.globalAlpha = spill(r) * dormant * o.alpha * fade;
        ctx.fillRect(px, py, size, size);
      }
      if (spark > 0.02) {
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = spark * 0.8 * o.alpha;
        ctx.fillRect(px, py, size, size);
      }
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
  drawDrop(ctx, pass, o);
  ctx.globalAlpha = 1;
}

/** parado e aceso: de vez em quando um pixel cai e pousa na pilha */
function drawDrop(ctx: CanvasRenderingContext2D, pass: Pass, o: CellsOptions) {
  if (o.t === null || o.on < 1 || o.clearing || o.appear !== null || o.litCount < o.count) return;
  const d = dropAt(o.seed, o.count, o.t, (col) => landingRow(o.seed, col));
  if (!d) return;
  const x = o.x + d.col * PITCH + 1;
  // pousou: dá um lampejo e se funde na pilha
  ctx.globalAlpha = (d.falling ? 0.9 : d.flash) * o.alpha;
  ctx.fillStyle = pass === 'glow' && d.flash > 0.3 ? '#FFFFFF' : o.color;
  ctx.fillRect(x, d.y, CELL, CELL);
}
