// Número que corre até o valor novo em vez de pular (ex.: "11,7 GB" subindo ao fim da limpeza).
// Com "reduzir movimento" ligado no Windows, o valor aparece direto.
const DURATION = 700;
const easeOut = (t: number) => 1 - (1 - t) ** 4;

interface Tween {
  shown: number;
  target: number;
  frame: number;
}

const tweens = new WeakMap<HTMLElement, Tween>();
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** target null = para de animar este elemento (quem chamou escreve o texto) */
export function tweenNumber(el: HTMLElement, target: number | null, format?: (n: number) => string, from?: number) {
  const prev = tweens.get(el);
  if (target === null || !format) {
    if (prev) cancelAnimationFrame(prev.frame);
    tweens.delete(el);
    return;
  }
  if (prev && prev.target === target && from === undefined) return;
  if (prev) cancelAnimationFrame(prev.frame);

  const start = from ?? prev?.shown ?? target;
  const tween: Tween = { shown: start, target, frame: 0 };
  tweens.set(el, tween);
  if (start === target || reduced()) {
    tween.shown = target;
    el.textContent = format(target);
    return;
  }

  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / DURATION);
    tween.shown = start + (target - start) * easeOut(t);
    el.textContent = format(tween.shown);
    if (t < 1) tween.frame = requestAnimationFrame(step);
  };
  tween.frame = requestAnimationFrame(step);
}
