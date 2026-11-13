// Estado da tela e consultas sobre ele. As views só leem; quem muda é o controller.
import type { CategoryInfo, CleanResult, DiskInfo, FolderInfo, InitData } from '../shared/types';

export type Phase = 'scanning' | 'idle' | 'confirm' | 'cleaning' | 'done';

export interface CategoryState extends CategoryInfo {
  /** null = ainda analisando */
  bytes: number | null;
  denied: boolean;
  /** motivo do bloqueio (ex.: atualização esperando reiniciar); bloqueada não pode ser limpa */
  blocked?: string;
  selected: boolean;
  /** o usuário mexeu na seleção; não resetar na próxima análise */
  touched: boolean;
  /** pastas reais encontradas no PC (null = ainda analisando) */
  folders: FolderInfo[] | null;
}

export interface AppState {
  home: string;
  disk: DiskInfo | null;
  phase: Phase;
  /** arquivo sendo lido/apagado agora */
  path: string;
  result: CleanResult | null;
  /** tamanho que a barra inteira representa (todo o lixo da última análise) */
  scale: number;
  /** aumenta quando pastas ou seleção mudam; o painel só se redesenha quando muda */
  rev: number;
  cats: CategoryState[];
}

export const createState = ({ home, categories }: InitData): AppState => ({
  home,
  disk: null,
  phase: 'idle', // main.ts chama scan() logo em seguida
  path: '',
  result: null,
  scale: 0,
  rev: 0,
  cats: categories.map((c) => ({
    ...c, bytes: null, denied: false, selected: c.defaultSelected, touched: false, folders: null,
  })),
});

/** não pode ser limpa agora: sem permissão ou bloqueada */
export const isUnavailable = (c: CategoryState) => c.denied || !!c.blocked;
export const isSelectable = (c: CategoryState) => (c.bytes ?? 0) > 0 && !isUnavailable(c);
export const isBusy = (s: AppState) => s.phase === 'scanning' || s.phase === 'cleaning';
export const chosen = (s: AppState) => s.cats.filter((c) => c.selected && isSelectable(c));
export const chosenBytes = (s: AppState) => chosen(s).reduce((sum, c) => sum + (c.bytes ?? 0), 0);
export const cleanableBytes = (s: AppState) =>
  s.cats.reduce((sum, c) => sum + (isUnavailable(c) ? 0 : c.bytes ?? 0), 0);
