// Faíscas que sobem da linha de limpeza.
import { BAR_H, TOP_ROOM } from './geometry';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  max: number;
}

const WARM = ['#FFE3B3', '#FFB45E', '#FFF4E0'];

export function spawnParticles(list: Particle[], x: number, accent: string, count = 4) {
  const colors = [...WARM, accent];
  for (let n = 0; n < count; n++) {
    const max = 40 + Math.random() * 60;
    list.push({
      x: x + (Math.random() - 0.5) * 6,
      y: TOP_ROOM + BAR_H * (1 - Math.random() ** 2), // mais faíscas saindo de baixo
      vx: (Math.random() - 0.35) * 0.7,
      vy: -(0.5 + Math.random() * 1.6),
      size: 1.5 + Math.random() * 1.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: max,
      max,
    });
  }
}

/** Move as partículas e devolve só as que ainda estão vivas */
export function stepParticles(list: Particle[]): Particle[] {
  for (const p of list) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy *= 0.985;
    p.vx += (Math.random() - 0.5) * 0.06;
    p.life--;
  }
  return list.filter((p) => p.life > 0);
}

export function drawParticles(ctx: CanvasRenderingContext2D, list: Particle[]) {
  for (const p of list) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}
