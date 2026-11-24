// Tipos de dados usados tanto no processo principal quanto na tela.

/** id de uma categoria (o nome do arquivo em src/cleaner/categories/, ex.: "browsers") */
export type CategoryId = string;

/** O que acontece quando a categoria é limpa (mostrado no diálogo de confirmação) */
export interface CategoryWarning {
  /** danger = perda que não volta (exige "Entendi"); caution = efeito colateral */
  level: 'danger' | 'caution';
  text: string;
}

/** O que a tela precisa saber sobre uma categoria (sem os caminhos). */
export interface CategoryInfo {
  id: CategoryId;
  name: string;
  color: string;
  /** desenho do ícone: conteúdo de um <svg viewBox="0 0 24 24">, pintado com currentColor */
  icon: string;
  hint: string;
  /** false = começa desmarcada (o usuário precisa escolher; ex.: Lixeira) */
  defaultSelected: boolean;
  warning?: CategoryWarning;
  /** programas que precisam estar fechados para a limpeza render tudo (ex.: "Steam e Epic") */
  closeFirst?: string;
}

export interface DiskInfo {
  drive: string;
  total: number;
  free: number;
}

/** Uma pasta real encontrada no PC, dentro de uma categoria */
export interface FolderInfo {
  path: string;
  bytes: number;
  files: number;
  denied: boolean;
  /** regra extra, ex.: "Só arquivos com mais de 24 horas" */
  note?: string;
}

/** Categoria que não pode ser limpa agora: texto curto na linha e explicação completa */
export interface Blocked {
  /** ex.: "Reinicie antes" */
  label: string;
  /** frase completa para o tooltip e a gaveta, sem ponto final */
  reason: string;
}

export interface ScanResult {
  bytes: number;
  files: number;
  /** true quando nada pôde ser lido por falta de permissão (precisa de admin) */
  denied: boolean;
  /** a categoria está bloqueada agora (ex.: atualização esperando reiniciar, pasta fora do lugar) */
  blocked?: Blocked;
  folders: FolderInfo[];
}

export interface CleanResult {
  freed: number;
  removed: number;
  /** arquivos que não puderam ser apagados (em uso ou sem permissão) */
  skipped: number;
  /** o que sobrou em cada pasta depois da limpeza */
  folders?: FolderInfo[];
  /** nomes das categorias cuja limpeza deu erro no meio (as outras continuaram) */
  failed?: string[];
}

export interface InitData {
  home: string;
  categories: CategoryInfo[];
  /** já roda como administrador (senão algumas categorias mostram "Precisa de admin") */
  isAdmin: boolean;
}

/** Atualização pelo GitHub: baixando em segundo plano ou pronta para instalar ao reiniciar */
export interface UpdateStatus {
  state: 'downloading' | 'ready';
  version: string;
}
