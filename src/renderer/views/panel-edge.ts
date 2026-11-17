// Borda direita da gaveta (☰): pixels LED do tamanho dos da barra, nas cores das categorias (na
// ordem da barra, de cima para baixo, uma cor se misturando na próxima), cada vez mais ralos para
// fora, com o mesmo bloom da barra. Enquanto a gaveta está aberta eles vivem como a barra parada:
// cada pixel pulsa no seu ritmo, de vez em quando um dá um lampejo, e de tempos em tempos um pixel
// da ponta se solta e vai embora flutuando (o símbolo do Vanish se desfazendo).
// Só anima com a gaveta aberta; com "reduzir movimento" fica parada.
import { $ } from '../dom';

const CELL = 6; // mesmo tamanho dos pixels da barra
const PITCH = 8;
/** chance de acender em cada coluna, da que encosta na gaveta para a mais distante */
const DENSITY = [0.72, 0.4, 0.15];
const FPS = 15; // pulso lento: 15 quadros bastam e poupam CPU (5 com a janela sem foco)
/** um pixel se solta a cada DRIFT_EVERY segundos e leva DRIFT_LIFE segundos para sumir */
const DRIFT_EVERY = 1.6;
const DRIFT_LIFE = 2.4;

interface Cell {
  x: number;
  y: number;
  color: string;
  alpha: number;
  hot: boolean;
  phase: number;
  speed: number;
}

/** número fixo para cada (a, b): o desenho não muda entre uma abertura e outra */
function rand(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** cor na altura t (0 em cima, 1 embaixo), misturando as categorias vizinhas */
function colorAt(colors: number[][], t: number): string {
  const x = t * (colors.length - 1);
  const i = Math.min(colors.length - 2, Math.floor(x));
  const k = x - i;
  const [r, g, b] = colors[i].map((c, j) => Math.round(c + (colors[i + 1][j] - c) * k));
  return `rgb(${r},${g},${b})`;
}

let cells: Cell[] = [];
let line: CanvasGradient | null = null;
let size = { width: 0, height: 0 };
let frame = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** escolhe os pixels (sempre os mesmos) para o tamanho atual da janela */
function build(ctx: CanvasRenderingContext2D, hexColors: string[]) {
  const colors = hexColors.map(rgb);
  const gradient = ctx.createLinearGradient(0, 0, 0, size.height);
  hexColors.forEach((c, i) => gradient.addColorStop(i / (hexColors.length - 1), c));
  line = gradient;
  cells = [];
  const rows = Math.ceil(size.height / PITCH);
  for (let col = 0; col < DENSITY.length; col++) {
    for (let row = 0; row < rows; row++) {
      // manchas: a densidade varia ao longo da altura, para não virar uma grade regular
      const patch = 0.6 + 0.8 * rand(Math.floor(row / 4), 991 + col);
      if (rand(col, row) > DENSITY[col] * patch) continue;
      const y = row * PITCH + 1;
      cells.push({
        x: 2 + col * PITCH,
        y,
        color: colorAt(colors, Math.min(1, y / size.height)),
        alpha: (1 - col * 0.16) * (0.75 + 0.25 * rand(col + 7, row)),
        hot: rand(col + 50, row) < 0.07, // um ou outro pixel quente, de núcleo branco, como no gráfico
        phase: rand(col + 300, row) * Math.PI * 2,
        speed: 0.6 + rand(col + 600, row) * 1.4,
      });
    }
  }
}

/** brilho do pixel agora: pulso lento + lampejo raro (igual ao cellLight da barra) */
function level(c: Cell, t: number | null): { a: number; flash: number } {
  if (t === null) return { a: c.alpha, flash: 0 };
  const pulse = 0.72 + 0.28 * Math.sin(t * c.speed + c.phase);
  const flash = Math.max(0, Math.sin(t * c.speed * 0.45 + c.phase * 3)) ** 60;
  return { a: Math.min(1, c.alpha * pulse + flash * 0.4), flash };
}

/** LED nítido: corpo, reflexo em cima, núcleo branco (quente/lampejo) e sombra embaixo */
function led(ctx: CanvasRenderingContext2D, c: Cell, a: number, white: number) {
  ctx.globalAlpha = a;
  ctx.fillStyle = c.color;
  ctx.fillRect(c.x, c.y, CELL, CELL);
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = a * 0.4;
  ctx.fillRect(c.x + 1, c.y, CELL - 2, 1);
  if (white > 0) {
    ctx.globalAlpha = a * white;
    ctx.fillRect(c.x + 1, c.y + 1, CELL - 2, CELL - 2);
  }
  ctx.fillStyle = '#000000';
  ctx.globalAlpha = a * 0.2;
  ctx.fillRect(c.x, c.y + CELL - 1, CELL, 1);
}

interface Loose {
  cell: Cell;
  x: number;
  y: number;
  s: number;
  left: number;
}

/** os pixels da coluna de fora que estão se soltando agora */
function drifting(t: number): Loose[] {
  const outerX = 2 + (DENSITY.length - 1) * PITCH;
  const outer = cells.filter((c) => c.x >= outerX);
  if (!outer.length) return [];
  const out: Loose[] = [];
  const newest = Math.floor(t / DRIFT_EVERY);
  for (let k = newest; k >= newest - Math.ceil(DRIFT_LIFE / DRIFT_EVERY); k--) {
    const age = t - k * DRIFT_EVERY;
    if (age < 0 || age > DRIFT_LIFE) continue;
    const p = age / DRIFT_LIFE; // 0 → 1
    const cell = outer[Math.floor(rand(k, 77) * outer.length)];
    // sobe e vai para a direita devagar, encolhendo, como os pedaços atrás da faísca da limpeza
    out.push({ cell, x: cell.x + p * 18, y: cell.y - p * 10, s: Math.max(1.5, CELL * (1 - p * 0.7)), left: 1 - p });
  }
  return out;
}

function draw(ctx: CanvasRenderingContext2D, t: number | null) {
  ctx.clearRect(0, 0, size.width, size.height);
  if (line) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = line;
    ctx.fillRect(0, 0, 1, size.height);
  }
  const loose = t === null ? [] : drifting(t);
  const away = new Set(loose.map((d) => d.cell));

  // 1) bloom: halo largo e brilho justo somados por cima, como o applyBloom da barra
  ctx.globalCompositeOperation = 'lighter';
  for (const [blur, strength] of [[14, 0.8], [5, 0.75]] as const) {
    for (const c of cells) {
      if (away.has(c)) continue;
      const { a, flash } = level(c, t);
      ctx.shadowColor = c.color;
      ctx.shadowBlur = blur;
      ctx.globalAlpha = a * strength;
      ctx.fillStyle = c.hot || flash > 0.3 ? '#FFFFFF' : c.color;
      ctx.fillRect(c.x, c.y, CELL, CELL);
    }
    for (const d of loose) {
      ctx.shadowColor = d.cell.color;
      ctx.shadowBlur = blur;
      ctx.globalAlpha = d.left * d.cell.alpha * strength;
      ctx.fillStyle = d.cell.color;
      ctx.fillRect(d.x, d.y, d.s, d.s);
    }
  }
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'source-over';

  // 2) os LEDs nítidos por cima
  for (const c of cells) {
    if (away.has(c)) continue;
    const { a, flash } = level(c, t);
    led(ctx, c, a, c.hot ? 0.6 : flash * 0.8);
  }
  for (const d of loose) {
    ctx.globalAlpha = d.left * d.cell.alpha;
    ctx.fillStyle = d.left < 0.5 ? '#FFE3B3' : d.cell.color; // esquenta antes de sumir
    ctx.fillRect(d.x, d.y, d.s, d.s);
  }
  ctx.globalAlpha = 1;
}

/** Abriu a gaveta (ou a janela mudou de tamanho): monta os pixels e anima */
export function startPanelEdge(hexColors: string[]) {
  const canvas = $<HTMLCanvasElement>('panel-edge');
  const ctx = canvas.getContext('2d');
  size = { width: canvas.clientWidth, height: canvas.clientHeight };
  if (!ctx || !size.width || !size.height || hexColors.length < 2) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(size.width * dpr);
  canvas.height = Math.round(size.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  build(ctx, hexColors);

  cancelAnimationFrame(frame);
  clearTimeout(timer);
  if (reduced()) {
    draw(ctx, null);
    return;
  }
  // desenha um quadro e dorme até o próximo (não acorda a cada atualização da tela)
  const tick = (now: number) => {
    draw(ctx, now / 1000);
    timer = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, 1000 / (document.hasFocus() ? FPS : 5));
  };
  frame = requestAnimationFrame(tick);
}

/** Fechou a gaveta: para de animar */
export function stopPanelEdge() {
  cancelAnimationFrame(frame);
  clearTimeout(timer);
  frame = 0;
}
