// Tela de abertura (símbolo + "vanish" sobre preto). Some sozinha ou com um clique.
import { $ } from '../dom';

const SHOW_MS = 1900;   // tempo na tela antes de sumir
const LEAVE_MS = 480;   // duração do fade (igual ao transition de .splash)

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runSplash(): Promise<void> {
  const splash = $('splash');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // espera o tempo de exibição ou um clique, o que vier primeiro
  await Promise.race([
    wait(reduce ? 900 : SHOW_MS),
    new Promise((resolve) => splash.addEventListener('click', resolve, { once: true })),
  ]);

  splash.classList.add('leaving');
  void window.cleaner.invoke('window:splash-done'); // barra de título volta à cor do app
  await wait(LEAVE_MS);
  splash.remove();
}
