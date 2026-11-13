const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** 1536 → "1,5 KB" (base 1024, como o Explorador de Arquivos) */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
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

/** Troca a pasta do usuário por "~" e corta o meio de caminhos maiores que maxLength */
export function shortPath(path: string, home: string, maxLength = 72): string {
  if (!path) return '';
  let s = path;
  if (home && s.toLowerCase().startsWith(home.toLowerCase())) s = '~' + s.slice(home.length);
  return s.length > maxLength ? `${s.slice(0, 18)}…${s.slice(-(maxLength - 20))}` : s;
}
