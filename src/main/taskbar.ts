// Progresso no ícone do Vanish na barra de tarefas do Windows (a faixa verde por baixo do ícone).
// Analisando: faixa "andando" (sem porcentagem). Limpando: avança a cada categoria.
import { BrowserWindow, type WebContents } from 'electron';

export function taskbar(wc: WebContents) {
  const apply = (value: number, mode?: 'indeterminate') => {
    const win = BrowserWindow.fromWebContents(wc);
    if (win && !win.isDestroyed()) win.setProgressBar(value, mode ? { mode } : undefined);
  };
  return {
    busy: () => apply(2, 'indeterminate'),
    set: (fraction: number) => apply(Math.min(1, Math.max(0, fraction))),
    /** -1 tira a faixa do ícone */
    done: () => apply(-1),
  };
}
