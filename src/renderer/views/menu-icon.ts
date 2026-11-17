// O ☰: três linhas que giram e viram o X ao abrir a gaveta (panel.css). Cada linha ganha a cor de
// uma categoria (--lc) e um deslocamento próprio (--jx): no hover elas se soltam para os lados e
// acendem nessas cores, e ao abrir piscam na cor no meio do giro.
import { $ } from '../dom';

/** deslocamento horizontal de cada linha no hover: uma para cada lado, a do meio mais */
const SHIFT = ['-3px', '4px', '-2px'];
/** qual categoria (na ordem da barra) colore cada linha: azul, rosa e ciano */
const COLOR_INDEX = [0, 2, 5];

/** colors = cores das categorias, na ordem da barra */
export function mountMenuIcon(colors: string[]) {
  const lines = [0, 1, 2].map((n) => {
    const line = document.createElement('span');
    line.style.setProperty('--jx', SHIFT[n]);
    line.style.setProperty('--lc', colors[COLOR_INDEX[n] % Math.max(1, colors.length)] ?? 'currentColor');
    line.style.setProperty('--n', String(n));
    return line;
  });
  $('menu-icon').replaceChildren(...lines);
}
