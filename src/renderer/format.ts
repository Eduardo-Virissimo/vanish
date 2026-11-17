const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * 1536 → "1,5 KB" (base 1024, como o Explorador de Arquivos). Troca de unidade a partir de
 * 1000, para nunca mostrar quatro dígitos ("1.021,3 MB" vira "1,0 GB").
 */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const number = unit < 2
    ? Math.round(value).toLocaleString('pt-BR')
    : value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${number} ${UNITS[unit]}`;
}

/** plural(3, 'arquivo', 'arquivos') → "3 arquivos" */
export const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString('pt-BR')} ${n === 1 ? one : many}`;

/** Corta o meio de caminhos maiores que maxLength, mantendo o começo e o fim */
export function shortPath(path: string, maxLength = 72): string {
  if (!path) return '';
  return path.length > maxLength ? `${path.slice(0, 18)}…${path.slice(-(maxLength - 20))}` : path;
}

const DAY = 24 * 60 * 60 * 1000;

/** "hoje", "ontem", "há 9 dias" (conta dias do calendário, não blocos de 24 horas) */
export function daysAgo(at: number, now = Date.now()): string {
  const midnight = (t: number) => new Date(t).setHours(0, 0, 0, 0);
  const days = Math.round((midnight(now) - midnight(at)) / DAY);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
}
