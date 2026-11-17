// Surgimento dos blocos ao fim da análise: pixels aparecem de baixo para cima, com "pop" e lampejo.
import { ROWS, rand } from './geometry';

const APPEAR_ROW_DELAY = 0.035; // segundos entre uma linha e a de cima
const APPEAR_JITTER = 0.12;     // variação por pixel, para não subir como uma régua
const APPEAR_DUR = 0.3;         // duração do pop de cada pixel
export const OUTLINE_FADE = 0.45;       // contorno do bloco acende nesse tempo
export const APPEAR_SEG_STAGGER = 0.09; // atraso entre um bloco e o próximo
/** quanto tempo um bloco leva para aparecer por completo */
export const APPEAR_SEG_TOTAL = (ROWS - 1) * APPEAR_ROW_DELAY + APPEAR_JITTER + APPEAR_DUR;

/** progresso (0 a 1) do pixel, dado o tempo desde que o bloco começou a aparecer */
export function cellAppear(elapsed: number, seed: number, col: number, row: number): number {
  const delay = (ROWS - 1 - row) * APPEAR_ROW_DELAY + rand(seed, col, row + 733) * APPEAR_JITTER;
  return Math.min(1, Math.max(0, (elapsed - delay) / APPEAR_DUR));
}

/** cresce passando um pouco do tamanho e volta: dá a sensação de "pop" */
export function easeOutBack(p: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2;
}
