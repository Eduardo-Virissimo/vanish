// Medidas, tipos e utilitários compartilhados pelos arquivos da barra de pixels.
import type { CategoryId } from '../../shared/types';

export const PITCH = 8;      // distância entre quadradinhos
export const CELL = 6;       // tamanho do quadradinho
export const ROWS = 15;
const INSET = 4;             // margem vertical dentro da barra
export const TOP_ROOM = 96;  // espaço acima para as partículas (igual a --bar-top-room no CSS)
export const BAR_H = ROWS * PITCH + INSET * 2;

export const BG = '#1B1C1F';

/**
 * Cada coisa é desenhada em duas "passadas":
 *  - 'base': a imagem nítida normal
 *  - 'glow': só o que brilha; essa camada é borrada e somada por cima (bloom)
 */
export type Pass = 'base' | 'glow';

export interface Segment {
  id: CategoryId;
  index: number;
  color: string;
  /** largura atual e alvo, em colunas (animadas) */
  W: number;
  targetW: number;
  /** quantas colunas ainda estão "cheias"; na limpeza diminui da direita para a esquerda */
  lit: number;
  litTarget: number;
  clearing: boolean;
  /** 1 = marcada (acesa), 0 = desmarcada (adormecida); anda até onTarget pixel a pixel */
  on: number;
  onTarget: number;
  /** quando o hover começou neste bloco, em segundos (onda de luz) */
  hoverAt: number | null;
}

/** y do quadradinho da linha `row` */
export const cellY = (row: number) => TOP_ROOM + INSET + row * PITCH + 1;

/** Número pseudoaleatório fixo para cada (a, b, c): o desenho não "pisca" entre quadros */
export function rand(a: number, b: number, c: number): number {
  let h = 2166136261 ^ a;
  h = Math.imul(h ^ b, 16777619);
  h = Math.imul(h ^ c, 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}
