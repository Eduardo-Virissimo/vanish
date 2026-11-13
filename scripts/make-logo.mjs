// Gera a marca do Vanish: uma grade de pixels que se desfaz na diagonal.
// Embaixo à esquerda os pixels são sólidos e brilham; para o alto à direita ficam menores e mais
// transparentes até sumir: bytes sumindo (Vanish). Inspirada na barra de pixels do app (pixels
// quadrados, brilho, "mais aceso embaixo"), sem copiar o desenho dela.
//  - assets/logo.svg  ícone do app (marca sobre o quadrado escuro) → npm run icon gera o PNG
//  - assets/mark.svg  só a marca, fundo transparente: tela de abertura e menu
// Rodar: npm run logo
import { writeFileSync } from 'node:fs';

const N = 4;                       // grade 4 × 4
const PITCH = 116;                 // distância entre centros dos pixels
const CELL = 104;                  // pixels inteiros quase encostados: o canto sólido é um bloco
const RADIUS = 16;
const SPAN = (N - 1) * PITCH + CELL;

// azul → ciano claro (cores do app; sem violeta na identidade)
const FROM = [61, 139, 255];       // #3D8BFF
const TO = [125, 236, 255];        // ciano claro
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (c) => `rgb(${c.join(',')})`;

/**
 * Cada pixel tem uma "presença" de 1 (sólido) a 0 (sumiu), conforme a distância do canto de
 * baixo à esquerda. Pixel com presença baixa encolhe e fica transparente.
 */
function pixels(ox, oy) {
  const out = [];
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const d = (col + (N - 1 - row)) / (2 * (N - 1)); // 0 embaixo-esquerda → 1 alto-direita
      // metade de baixo à esquerda inteira; depois desfaz rápido até sumir no canto
      const t = Math.min(1, Math.max(0, (d - 0.3) / 0.62));
      const presence = 1 - t * t * (3 - 2 * t);       // smoothstep
      if (presence < 0.08) continue;                    // o canto já sumiu
      const size = CELL * (0.2 + 0.8 * presence);
      const cx = ox + col * PITCH + CELL / 2;
      const cy = oy + row * PITCH + CELL / 2;
      out.push({
        x: cx - size / 2,
        y: cy - size / 2,
        size,
        opacity: 0.55 + 0.45 * presence,
        color: rgb(mix(FROM, TO, d)),
        solid: presence > 0.9,
      });
    }
  }
  return out;
}

const rect = (p, extra = '') =>
  `<rect x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" width="${p.size.toFixed(1)}" height="${p.size.toFixed(1)}" rx="${(RADIUS * p.size / CELL).toFixed(1)}" fill="${p.color}" fill-opacity="${p.opacity.toFixed(2)}"${extra}/>`;

function markLayers(ox, oy) {
  const px = pixels(ox, oy);
  const glow = px.filter((p) => p.solid).map((p) => rect({ ...p, opacity: 1 })).join('');
  return `
  <g filter="url(#bloom)" opacity=".5">${glow}</g>
  ${px.map((p) => rect(p)).join('')}`;
}

const FILTER = `<filter id="bloom" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="26"/></filter>`;

// ícone: marca centralizada no quadrado escuro, puxada um pouco para o alto à direita
// para compensar o peso visual (que fica embaixo à esquerda)
const SIZE = 1024;
const O = (SIZE - SPAN) / 2;
const NUDGE = 22;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">
  <!-- Gerado por scripts/make-logo.mjs: não edite à mão -->
  <defs>${FILTER}</defs>
  <rect x="16" y="16" width="992" height="992" rx="226" fill="#16171A"/>
  <rect x="17.5" y="17.5" width="989" height="989" rx="224.5" fill="none" stroke="#FFFFFF" stroke-opacity=".08" stroke-width="3"/>${markLayers(O + NUDGE, O - NUDGE)}
</svg>
`;
writeFileSync(new URL('../assets/logo.svg', import.meta.url), icon);
console.log('assets/logo.svg gerado');

// só a marca (fundo transparente), com folga para o brilho
const PAD = 70;
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PAD} ${-PAD} ${SPAN + PAD * 2} ${SPAN + PAD * 2}">
  <!-- Gerado por scripts/make-logo.mjs: não edite à mão -->
  <defs>${FILTER}</defs>${markLayers(0, 0)}
</svg>
`;
writeFileSync(new URL('../assets/mark.svg', import.meta.url), mark);
console.log('assets/mark.svg gerado');
