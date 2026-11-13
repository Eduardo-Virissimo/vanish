// Barra de pixels: guarda o estado e roda o loop de animação. O desenho fica em paint.ts/cells.ts
// e o cálculo dos tamanhos em layout.ts. (Passa um pouco das ~150 linhas de propósito: é só a
// orquestração, e dividir mais espalharia o estado da barra entre arquivos.)
//
// Modos:
//  - 'scanning': barra vazia com uma onda de luz passando (enquanto analisa)
//  - 'ready':    blocos coloridos com pixels pulsando; ao entrar, os blocos se materializam
//                pixel a pixel, de baixo para cima, em cascata (reveal)
// Na limpeza, a faísca "come" o bloco da direita para a esquerda.
import type { CategoryId } from '../../shared/types';
import { APPEAR_SEG_STAGGER, APPEAR_SEG_TOTAL } from './cells';
import { BAR_H, PITCH, TOP_ROOM, type Pass, type Segment } from './geometry';
import { layoutSegments, stepSegments, type BarItem } from './layout';
import { applyBloom, drawSegment, drawSweep, drawTrack } from './paint';
import { drawParticles, spawnParticles, stepParticles, type Particle } from './particles';

export type { BarItem } from './layout';

const IDLE_FPS = 30; // parado, o pulso dos pixels não precisa de 60 fps

type Mode = 'empty' | 'scanning' | 'ready';

export class PixelBar {
  private readonly ctx: CanvasRenderingContext2D;
  /** camada só com o que brilha; é borrada e somada por cima (bloom) */
  private readonly glow = document.createElement('canvas');
  private readonly gctx: CanvasRenderingContext2D;
  private readonly reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  private mode: Mode = 'empty';
  private segs: Segment[] = [];
  private particles: Particle[] = [];
  private items: BarItem[] = [];
  private total = 0;
  private hover: CategoryId | null = null;
  /** quando os blocos começaram a surgir, em segundos (null = sem surgimento em andamento) */
  private revealStart: number | null = null;

  private dpr = 1;
  private width = 0;
  private cols = 0;
  private running = false;
  private lastDraw = 0;
  private time = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    const gctx = this.glow.getContext('2d');
    if (!ctx || !gctx) throw new Error('Canvas 2D indisponível');
    this.ctx = ctx;
    this.gctx = gctx;
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement ?? canvas);
    this.resize();
  }

  /* ---------- API ---------- */

  /** Esvazia a barra e mostra a onda de análise */
  startScanning() {
    this.mode = 'scanning';
    this.segs = [];
    this.revealStart = null;
    this.kick();
  }

  /** total = quanto a barra inteira representa */
  setData(total: number, items: BarItem[]) {
    this.total = total;
    this.items = items;
    this.layout(false);
    this.kick();
  }

  /** Mostra os blocos, que se materializam pixel a pixel */
  reveal() {
    this.mode = 'ready';
    this.layout(true);
    this.revealStart = this.reduceMotion ? null : performance.now() / 1000;
    this.kick();
  }

  setHover(id: CategoryId | null) {
    if (this.hover === id) return;
    this.hover = id;
    this.kick();
  }

  startClearing(id: CategoryId) {
    const s = this.find(id);
    if (!s) return;
    s.clearing = true;
    this.kick();
  }

  /** fraction = quanto do bloco já foi apagado (0 a 1) */
  progress(id: CategoryId, fraction: number) {
    const s = this.find(id);
    if (!s?.clearing) return;
    s.litTarget = s.targetW * (1 - Math.min(1, Math.max(0, fraction)));
    if (this.reduceMotion) s.lit = s.litTarget;
    this.kick();
  }

  finishClearing(id: CategoryId) {
    const s = this.find(id);
    if (s) s.clearing = false;
    this.kick();
  }

  /* ---------- Tamanho ---------- */

  private find(id: CategoryId) {
    return this.segs.find((s) => s.id === id);
  }

  private layout(snap: boolean) {
    this.segs = layoutSegments(this.segs, this.items, this.total, this.cols, snap || this.reduceMotion);
  }

  private resize() {
    const dpr = (this.dpr = window.devicePixelRatio || 1);
    const height = TOP_ROOM + BAR_H;
    this.width = this.canvas.parentElement?.clientWidth ?? 0;
    for (const [canvas, ctx] of [[this.canvas, this.ctx], [this.glow, this.gctx]] as const) {
      canvas.width = Math.round(this.width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.canvas.style.height = `${height}px`;
    this.cols = Math.floor((this.width - 2) / PITCH);
    this.layout(true);
    // Mudar o tamanho do canvas apaga o desenho. Redesenha na hora: se a janela estiver
    // encoberta, o Chromium pausa o requestAnimationFrame e a barra ficaria em branco.
    if (this.width > 0) this.draw();
    this.kick();
  }

  /* ---------- Animação ---------- */

  /** Pulso dos pixels e onda de análise rodam sem parar (exceto com "reduzir movimento") */
  private get ambient() {
    return !this.reduceMotion && (this.mode === 'scanning' || (this.mode === 'ready' && this.segs.length > 0));
  }

  private kick() {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.time = now / 1000;
    const moving = this.step();
    const keepGoing = moving || this.ambient;
    // Parado, desenha só a ~30 fps para poupar CPU
    if (moving || !keepGoing || now - this.lastDraw >= 1000 / IDLE_FPS) {
      this.lastDraw = now;
      this.draw();
    }
    if (keepGoing) requestAnimationFrame(this.frame);
    else this.running = false;
  };

  /** Avança um quadro; devolve true enquanto algo ainda se mexe (fora o pulso) */
  private step(): boolean {
    let moving = stepSegments(this.segs);
    if (this.revealStart !== null) {
      const visible = this.segs.filter((s) => s.W >= 0.05).length;
      const total = Math.max(0, visible - 1) * APPEAR_SEG_STAGGER + APPEAR_SEG_TOTAL;
      if (this.time - this.revealStart > total) this.revealStart = null;
      else moving = true;
    }
    this.particles = stepParticles(this.particles);
    return moving || this.particles.length > 0;
  }

  private draw() {
    const height = TOP_ROOM + BAR_H;
    this.ctx.clearRect(0, 0, this.width, height);
    this.gctx.clearRect(0, 0, this.width, height);
    const t = this.reduceMotion ? null : this.time;
    const scanT = this.mode === 'scanning' ? t : null;
    this.paint(this.ctx, 'base', scanT, t);
    this.paint(this.gctx, 'glow', scanT, t);
    this.spawnSparks();
    applyBloom(this.ctx, this.glow, this.dpr);
  }

  /** Desenha a cena numa passada (base nítida ou camada de brilho) */
  private paint(ctx: CanvasRenderingContext2D, pass: Pass, scanT: number | null, t: number | null) {
    drawTrack(ctx, pass, this.width, this.cols, scanT);
    if (this.mode === 'ready') {
      let x = 1;
      let order = 0;
      for (const s of this.segs) {
        if (s.W < 0.05) continue;
        // cada bloco começa a surgir um pouco depois do anterior (cascata da esquerda para a direita)
        const appear = this.revealStart === null ? null : this.time - this.revealStart - order * APPEAR_SEG_STAGGER;
        const edge = drawSegment(ctx, pass, s, x, this.hover, t, appear);
        if (s.clearing && edge < x + s.W * PITCH - 0.5) drawSweep(ctx, pass, edge);
        x += s.W * PITCH;
        order++;
      }
    }
    drawParticles(ctx, this.particles);
  }

  /** Fagulhas só na faísca da limpeza */
  private spawnSparks() {
    if (this.reduceMotion) return;
    let x = 1;
    for (const s of this.segs) {
      const edge = x + Math.min(s.lit, s.W) * PITCH;
      if (s.clearing && edge < x + s.W * PITCH - 0.5) spawnParticles(this.particles, edge, s.color);
      x += s.W * PITCH;
    }
  }
}
