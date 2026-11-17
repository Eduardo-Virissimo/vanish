// "Atualizar para 0.5.1" no topo, ao lado de "Analisar de novo": aparece só quando a versão nova
// já foi baixada do GitHub. Clicar reinicia instalando; quem não clicar recebe a atualização
// sozinho na próxima vez que fechar o Vanish.
import { $ } from '../dom';
import { isBusy, type AppState } from '../state';

export function bindUpdate(onInstall: () => void) {
  $('update').addEventListener('click', onInstall);
}

export function renderUpdate(s: AppState) {
  const btn = $<HTMLButtonElement>('update');
  const ready = s.update?.state === 'ready';
  btn.hidden = !ready;
  if (!ready || !s.update) return;
  $('update-label').textContent = `Atualizar para ${s.update.version}`;
  btn.title = `A versão ${s.update.version} já foi baixada. Clique para reiniciar e instalar, ou ela entra sozinha quando você fechar o Vanish.`;
  btn.disabled = isBusy(s);
}
