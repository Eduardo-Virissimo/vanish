// Desenho da barra: a trilha (com a onda de análise), cada bloco, a faísca e o bloom.
// Só desenha; quem decide tamanhos e tempos é pixel-bar.ts.
import type { CategoryId } from '../../shared/types';
import { OUTLINE_FADE } from './appear';
import { drawCells } from './cells';
import { DORMANT } from './effects';
import { BAR_H, BG, CELL, PITCH, ROWS, TOP_ROOM, cellY, rand, roundRect, type Pass, type Segment } from './geometry';
import { drawGlass, steppedRect } from './led';

/** Onda do "scanner" que passa pelos pontinhos vazios durante a análise (0 a 1) */
function scanWave(col: number, row: number, cols: number, t: number): number {
  const span = cols + 40;
  const pos = ((t * 42) % span) - 20;
  const d = col - pos;
  const band = Math.exp(-(d * d) / 40);
  if (band < 0.02) return 0;
  // ruído que muda ~12 vezes por segundo: a onda "chia" em pixels, não é um degradê liso
  return band * (0.35 + 0.65 * rand(col, row, Math.floor(t * 12)));
}

/**
 * Fundo da barra com os pontinhos do espaço vazio.
 * scanT = tempo em segundos enquanto analisa (mostra a onda), ou null.
 */
export function drawTrack(ctx: CanvasRenderingContext2D, pass: Pass, width: number, cols: number, scanT: number | null) {
  if (pass === 'base') {
    roundRect(ctx, 0.5, TOP_ROOM + 0.5, width - 1, BAR_H - 1, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.012)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (let i = 0; i < cols; i++) {
    for (let r = 0; r < ROWS; r++) {
      const wave = scanT === null ? 0 : scanWave(i, r, cols, scanT);
      if (pass === 'glow') {
        if (wave < 0.1) continue;
        ctx.fillStyle = `rgba(200,220,255,${wave * 0.55})`;
      } else if (!wave) {
        drawGlass(ctx, 2 + i * PITCH, cellY(r)); // vazio: vidro escuro
        continue;
      } else {
        ctx.fillStyle = `rgba(225,235,255,${0.045 + wave * 0.3})`;
      }
      ctx.fillRect(2 + i * PITCH, cellY(r), CELL, CELL);
    }
  }
}

/**
 * Desenha um bloco de categoria e devolve o x onde termina a parte cheia.
 * t = tempo para o pulso (ou null); appear = segundos desde que o bloco começou a surgir (ou null = já pronto)
 */
export function drawSegment(
  ctx: CanvasRenderingContext2D, pass: Pass, s: Segment, x: number, hover: CategoryId | null,
  t: number | null, appear: number | null,
): number {
  const dim = hover !== null && hover !== s.id;
  // desmarcada: contorno e luz de fundo quase somem junto com os pixels
  const shown = (appear === null ? 1 : Math.min(1, Math.max(0, appear / OUTLINE_FADE))) * (0.22 + 0.78 * s.on);
  const alpha = dim ? 0.3 : 1;
  const rippleAge = t === null || s.hoverAt === null ? null : t - s.hoverAt;
  const width = s.W * PITCH;
  const litCols = Math.min(s.lit, s.W);
  const litWidth = litCols * PITCH;
  const glowAlpha = pass === 'glow' ? alpha * (hover === s.id ? 1 : 0.8) : alpha;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, TOP_ROOM + 1, width, BAR_H - 2);
  ctx.clip();
  if (pass === 'base') {
    ctx.fillStyle = BG;
    ctx.fillRect(x, TOP_ROOM + 1, width, BAR_H - 2);
    if (litWidth > 0) {
      // Brilho que sobe de baixo, como luz acumulada no fundo do bloco
      const grad = ctx.createLinearGradient(0, TOP_ROOM, 0, TOP_ROOM + BAR_H);
      grad.addColorStop(0, `${s.color}00`);
      grad.addColorStop(0.55, `${s.color}0F`);
      grad.addColorStop(1, `${s.color}40`);
      ctx.globalAlpha = alpha * shown;
      ctx.fillStyle = grad;
      ctx.fillRect(x, TOP_ROOM + 1, litWidth, BAR_H - 2);
      ctx.globalAlpha = 1;
    }
  }
  drawCells(ctx, pass, {
    x, count: Math.ceil(s.W), litCount: Math.round(litCols), litEdge: litCols, clearing: s.clearing,
    seed: s.index + 11, color: s.color, alpha: glowAlpha, t, appear,
    on: s.on, waking: s.onTarget > s.on, rippleAge,
  });
  ctx.restore();

  if (litWidth > 1.5 && shown > 0) {
    ctx.save();
    ctx.globalAlpha = glowAlpha * shown;
    // contorno com cantos em degrau (pixel art), no lugar da linha arredondada
    steppedRect(ctx, x + 0.75, TOP_ROOM + 0.75, litWidth - 1.5, BAR_H - 1.5, 2.5);
    ctx.strokeStyle = s.on < 0.5 ? DORMANT : s.color;
    ctx.lineWidth = pass === 'glow' ? 2.5 : 1.5;
    ctx.stroke();
    ctx.restore();
  }
  return x + litWidth;
}

/** Linha brilhante que aparece onde a limpeza está acontecendo */
export function drawSweep(ctx: CanvasRenderingContext2D, pass: Pass, x: number) {
  const w = pass === 'glow' ? 5 : 2;
  ctx.fillStyle = pass === 'glow' ? '#FFD9A0' : '#FFF8EC';
  ctx.fillRect(x - w / 2, TOP_ROOM - 3, w, BAR_H + 6);
}

/** Bloom: [raio do desfoque em px, intensidade] — um véu bem largo, um halo e um brilho justo */
const BLOOM_PASSES: Array<[blur: number, strength: number]> = [[30, 0.4], [14, 0.95], [4, 0.8]];

/**
 * Borra a camada de brilho e soma por cima da imagem (luz somada = bloom).
 * O desfoque é a parte cara do quadro. Ele é feito em meia resolução (um quarto dos pixels) num
 * canvas auxiliar e depois ampliado: como é luz borrada, a diferença não aparece.
 */
const BLOOM_SCALE = 0.5;
const small = document.createElement('canvas');
const sctx = small.getContext('2d');

export function applyBloom(ctx: CanvasRenderingContext2D, glow: HTMLCanvasElement, dpr: number) {
  if (!glow.width || !glow.height || !sctx) return; // drawImage falha com canvas de tamanho 0
  const w = Math.max(1, Math.round(glow.width * BLOOM_SCALE));
  const h = Math.max(1, Math.round(glow.height * BLOOM_SCALE));
  if (small.width !== w || small.height !== h) {
    small.width = w;
    small.height = h;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  for (const [blur, strength] of BLOOM_PASSES) {
    sctx.clearRect(0, 0, w, h);
    sctx.filter = `blur(${blur * dpr * BLOOM_SCALE}px)`;
    sctx.drawImage(glow, 0, 0, w, h);
    ctx.globalAlpha = strength;
    ctx.drawImage(small, 0, 0, glow.width, glow.height);
  }
  ctx.restore();
}

/**
 * "Tudo limpo": a barra fica só com o vidro vazio e um pixel piscando devagar no meio, embaixo,
 * como um cursor esperando. t = null (reduzir movimento): o pixel fica aceso, parado.
 */
export function drawRestingPixel(ctx: CanvasRenderingContext2D, pass: Pass, cols: number, t: number | null) {
  const col = Math.floor(cols / 2);
  const pulse = t === null ? 0.7 : 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 2.2)) ** 2;
  ctx.globalAlpha = pulse * (pass === 'glow' ? 0.8 : 1);
  ctx.fillStyle = '#DDE6FF';
  ctx.fillRect(2 + col * PITCH, cellY(ROWS - 1), CELL, CELL);
  ctx.globalAlpha = 1;
}
