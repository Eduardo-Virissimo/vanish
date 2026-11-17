// O que a tela lembra entre uma sessão e outra (localStorage deste app):
//  - histórico de limpezas (data e quanto liberou), para "última limpeza" e o gráfico da gaveta;
//  - categorias que o usuário DESMARCOU, para continuarem desmarcadas.
// Nunca lembra uma categoria marcada: as arriscadas (Lixeira, Windows Update) sempre começam
// desmarcadas. localStorage pode falhar (perfil bloqueado, dado corrompido); aí só não lembra.
import type { CategoryId } from '../shared/types';

export interface CleanRecord {
  at: number;
  freed: number;
}

const HISTORY = 'vanish:history';
const LEGACY_LAST = 'vanish:last-clean'; // versão anterior guardava só a última limpeza
const UNCHECKED = 'vanish:unchecked';
const MAX_RECORDS = 400;

function read<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* sem memória, só não lembra */ }
}

const isRecord = (r: unknown): r is CleanRecord =>
  typeof (r as CleanRecord)?.at === 'number' && typeof (r as CleanRecord).freed === 'number';

export function loadHistory(): CleanRecord[] {
  const list = read<unknown[]>(HISTORY);
  if (Array.isArray(list)) return list.filter(isRecord);
  const legacy = read<unknown>(LEGACY_LAST);
  return isRecord(legacy) ? [{ at: legacy.at, freed: legacy.freed }] : [];
}

export function saveHistory(list: CleanRecord[]) {
  write(HISTORY, list.slice(-MAX_RECORDS));
}

export function loadUnchecked(): Set<CategoryId> {
  const list = read<unknown[]>(UNCHECKED);
  return new Set(Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : []);
}

export function saveUnchecked(ids: Iterable<CategoryId>) {
  write(UNCHECKED, [...ids]);
}
