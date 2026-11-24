/** Guarda só o último valor e chama fn no máximo a cada `ms` (bom para "caminho atual") */
export function latest<T>(fn: (value: T) => void, ms: number): (value: T) => void {
  let last: T;
  let timer: NodeJS.Timeout | null = null;
  return (value) => {
    last = value;
    timer ??= setTimeout(() => {
      timer = null;
      fn(last);
    }, ms);
  };
}

/** Chama fn no máximo a cada `ms`, descartando o que vier no meio */
export function throttle<T>(fn: (value: T) => void, ms: number): (value: T) => void {
  let lastAt = 0;
  return (value) => {
    const now = Date.now();
    if (now - lastAt < ms) return;
    lastAt = now;
    fn(value);
  };
}

type Task = 'scan' | 'clean';
let running: Task | null = null;

/** tem análise ou limpeza rodando agora (a atualização espera terminar) */
export const isBusy = () => running !== null;
/** o que está rodando agora (fechar no meio de uma limpeza pede confirmação) */
export const currentTask = () => running;

/** Impede que uma análise e uma limpeza rodem ao mesmo tempo */
export async function exclusive<T>(task: Task, work: () => Promise<T>): Promise<T> {
  if (running) throw new Error('Já existe uma tarefa em andamento');
  running = task;
  try {
    return await work();
  } finally {
    running = null;
  }
}
