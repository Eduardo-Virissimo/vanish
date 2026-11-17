// Acabamento "LED de vidro" dos pixels da barra:
//  - cada pixel aceso é um LED: reflexo claro em cima, sombra embaixo;
//  - a cor de cada bloco esquenta de baixo para cima (fundo mais claro e quente, topo mais fundo);
//  - os quadradinhos vazios parecem vidro, com um fio de reflexo em cima;
//  - o contorno do bloco tem cantos em degrau, como pixel art.
import { CELL, ROWS } from './geometry';

/* ---------- Degradê de calor por linha ---------- */

const shadeCache = new Map<string, string[]>();

function mix(a: number, b: number, k: number) {
  return Math.round(a + (b - a) * k);
}

/** cor da categoria em cada linha: topo misturado com preto, fundo com branco */
export function rowShades(hex: string): string[] {
  const cached = shadeCache.get(hex);
  if (cached) return cached;
  const n = parseInt(hex.slice(1, 7), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const shades: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    const t = r / (ROWS - 1); // 0 em cima, 1 embaixo
    const [cr, cg, cb] = t < 0.5
      ? rgb.map((c) => mix(c, 0, (0.5 - t) * 0.24))     // topo: até 12% mais escuro
      : rgb.map((c) => mix(c, 255, (t - 0.5) * 0.56));  // fundo: até 28% mais claro
    shades.push(`rgb(${cr},${cg},${cb})`);
  }
  shadeCache.set(hex, shades);
  return shades;
}

/** luz que se acumula no fundo do bloco e vaza para os pixels apagados (0 a 1) */
export const spill = (row: number) => 0.07 + 0.17 * (row / (ROWS - 1)) ** 2;

/* ---------- Pixels ---------- */

/** LED aceso: corpo na cor, reflexo em cima, sombra embaixo (detalhes só em tamanho cheio) */
export function drawLed(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  if (size < CELL - 0.5 || alpha < 0.05) return;
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = alpha * 0.34;
  ctx.fillRect(x + 1, y, size - 2, 1);
  ctx.globalAlpha = alpha * 0.14;
  ctx.fillRect(x, y + 1, 1, size - 2);
  ctx.fillStyle = '#000000';
  ctx.globalAlpha = alpha * 0.2;
  ctx.fillRect(x, y + size - 1, size, 1);
}

const GLASS = 'rgba(255,255,255,0.04)';
const GLASS_EDGE = 'rgba(255,255,255,0.05)';

/** quadradinho vazio: vidro escuro com um fio de reflexo em cima */
export function drawGlass(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = GLASS;
  ctx.fillRect(x, y, CELL, CELL);
  ctx.fillStyle = GLASS_EDGE;
  ctx.fillRect(x + 1, y, CELL - 2, 1);
}

/* ---------- Contorno com cantos em degrau ---------- */

/** retângulo com cantos de pixel art (dois degraus de `s` px) */
export function steppedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s = 2) {
  const r = x + w;
  const b = y + h;
  const d = Math.min(s, w / 4, h / 4);
  ctx.beginPath();
  ctx.moveTo(x + 2 * d, y);
  ctx.lineTo(r - 2 * d, y);
  ctx.lineTo(r - 2 * d, y + d);
  ctx.lineTo(r - d, y + d);
  ctx.lineTo(r - d, y + 2 * d);
  ctx.lineTo(r, y + 2 * d);
  ctx.lineTo(r, b - 2 * d);
  ctx.lineTo(r - d, b - 2 * d);
  ctx.lineTo(r - d, b - d);
  ctx.lineTo(r - 2 * d, b - d);
  ctx.lineTo(r - 2 * d, b);
  ctx.lineTo(x + 2 * d, b);
  ctx.lineTo(x + 2 * d, b - d);
  ctx.lineTo(x + d, b - d);
  ctx.lineTo(x + d, b - 2 * d);
  ctx.lineTo(x, b - 2 * d);
  ctx.lineTo(x, y + 2 * d);
  ctx.lineTo(x + d, y + 2 * d);
  ctx.lineTo(x + d, y + d);
  ctx.lineTo(x + 2 * d, y + d);
  ctx.closePath();
}
