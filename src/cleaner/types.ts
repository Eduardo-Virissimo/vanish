import type { CategoryInfo } from '../shared/types';

/**
 * Uma pasta cujo conteúdo pode ser apagado.
 * "*" no caminho: sozinho = qualquer subpasta (ex.: cada perfil); dentro de um nome
 * ("webcache*") = subpastas cujo nome bate com o padrão.
 */
export interface Target {
  path: string;
  /** só conta/apaga arquivos mais velhos que isso */
  minAgeMs?: number;
  /** só arquivos cujo nome bate com o padrão */
  match?: RegExp;
  /** não entra nas subpastas */
  shallow?: boolean;
  /** explicação da regra, mostrada no painel de pastas */
  note?: string;
}

/** Condição verificada antes de analisar/limpar; se falhar, a categoria fica bloqueada */
export type Guard = 'no-pending-reboot';

export type Category = Omit<CategoryInfo, 'defaultSelected'> & {
  /** começa desmarcada: só limpa se o usuário marcar (ver docs/SAFETY-AUDIT.md) */
  optIn?: boolean;
  guard?: Guard;
} & (
  | { targets: Target[]; special?: undefined }
  | { special: 'recycle'; targets?: undefined }
);

/** Ajuda o editor a checar uma categoria escrita no seu próprio arquivo (categories/*.ts) */
export const defineCategory = (category: Category): Category => category;
