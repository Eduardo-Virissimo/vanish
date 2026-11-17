// Estado da tela e consultas sobre ele. As views só leem; quem muda é o controller.
import type { CategoryId, CategoryInfo, CleanResult, DiskInfo, FolderInfo, InitData, UpdateStatus } from '../shared/types';
import type { CleanRecord } from './memory';

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
  disk: DiskInfo | null;
  phase: Phase;
  /** o que deu errado na última ação; a tela nunca mostra uma falha como sucesso */
  problem: 'scan' | 'clean' | null;
  /** limpezas que liberaram algo (guardadas entre sessões; a última é a "última limpeza") */
  history: CleanRecord[];
  /** o app está rodando como administrador (senão algumas categorias precisam dele) */
  isAdmin: boolean;
  /** versão nova do GitHub pronta para instalar (null = nenhuma) */
  update: UpdateStatus | null;
  /** pastas que não abriram no Explorador (sumiram depois da análise) */
  unopened: Set<string>;
  /** arquivo sendo lido/apagado agora */
  path: string;
  result: CleanResult | null;
  /** tamanho que a barra inteira representa (todo o lixo da última análise) */
  scale: number;
  /** aumenta quando pastas ou seleção mudam; o painel só se redesenha quando muda */
  rev: number;
  cats: CategoryState[];
}

/** memory: o que veio do localStorage (histórico e categorias que o usuário desmarcou) */
export const createState = (
  { categories, isAdmin }: InitData,
  memory: { history: CleanRecord[]; unchecked: Set<CategoryId> },
): AppState => ({
  disk: null,
  phase: 'idle', // main.ts chama scan() logo em seguida
  problem: null,
  history: memory.history,
  isAdmin,
  update: null,
  unopened: new Set(),
  path: '',
  result: null,
  scale: 0,
  rev: 0,
  cats: categories.map((c) => {
    // desmarcada da outra vez continua desmarcada (as opt-in já começam assim)
    const unchecked = memory.unchecked.has(c.id);
    return { ...c, bytes: null, denied: false, selected: c.defaultSelected && !unchecked, touched: unchecked, folders: null };
  }),
});

/** não pode ser limpa agora: sem permissão ou bloqueada */
export const isUnavailable = (c: CategoryState) => c.denied || !!c.blocked;
export const isSelectable = (c: CategoryState) => (c.bytes ?? 0) > 0 && !isUnavailable(c);
export const isBusy = (s: AppState) => s.phase === 'scanning' || s.phase === 'cleaning';
export const chosen = (s: AppState) => s.cats.filter((c) => c.selected && isSelectable(c));
export const chosenBytes = (s: AppState) => chosen(s).reduce((sum, c) => sum + (c.bytes ?? 0), 0);
export const cleanableBytes = (s: AppState) =>
  s.cats.reduce((sum, c) => sum + (isUnavailable(c) ? 0 : c.bytes ?? 0), 0);
export const lastClean = (s: AppState): CleanRecord | undefined => s.history[s.history.length - 1];
