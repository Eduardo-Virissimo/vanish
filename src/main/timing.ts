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

let busy = false;

/** Impede que uma análise e uma limpeza rodem ao mesmo tempo */
export async function exclusive<T>(task: () => Promise<T>): Promise<T> {
  if (busy) throw new Error('Já existe uma tarefa em andamento');
  busy = true;
  try {
    return await task();
  } finally {
    busy = false;
  }
}
