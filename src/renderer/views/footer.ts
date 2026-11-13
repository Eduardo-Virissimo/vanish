// Rodapé: mensagem do momento + botão de limpar (com confirmação em dois passos).
import type { CleanResult } from '../../shared/types';
import { $ } from '../dom';
import { formatBytes, plural } from '../format';
import { chosen, chosenBytes, cleanableBytes, type AppState } from '../state';

interface FooterCopy {
  message: string;
  button: string;
  disabled: boolean;
}

function idleMessage(s: AppState): string {
  const sel = chosen(s);
  const bytes = chosenBytes(s);
  if (sel.length === 0) {
    return cleanableBytes(s) > 0
      ? 'Escolha pelo menos uma categoria para limpar.'
      : 'Não há caches nem arquivos temporários para apagar agora.';
  }
  // categorias com perda que não volta (aviso "danger", ex.: Lixeira)
  const permanent = sel.filter((c) => c.warning?.level === 'danger').map((c) => c.name);
  return permanent.length
    ? `${formatBytes(bytes)} selecionados. ${permanent.join(' e ')}: apagado de vez; o resto os apps recriam.`
    : `${formatBytes(bytes)} selecionados. Os apps recriam esses arquivos quando precisam.`;
}

function doneMessage(r: CleanResult | null): string {
  if (!r) return '';
  return r.skipped > 0
    ? `${plural(r.skipped, 'arquivo estava em uso e ficou', 'arquivos estavam em uso e ficaram')} para a próxima limpeza.`
    : `${plural(r.removed, 'arquivo apagado', 'arquivos apagados')}. Os apps recriam o que precisarem.`;
}

function footerCopy(s: AppState): FooterCopy {
  const bytes = chosenBytes(s);
  const cleanLabel = bytes > 0 ? `Limpar ${formatBytes(bytes)}` : 'Limpar selecionados';

  switch (s.phase) {
    case 'scanning':
      return { message: 'Procurando arquivos temporários e caches que podem ser apagados.', button: 'Limpar selecionados', disabled: true };
    case 'confirm':
      // a confirmação acontece no diálogo (views/confirm.ts)
      return { message: idleMessage(s), button: cleanLabel, disabled: true };
    case 'cleaning':
      return { message: 'Arquivos abertos em outros programas são pulados. Feche os navegadores para liberar mais.', button: 'Limpando…', disabled: true };
    case 'done':
      return { message: doneMessage(s.result), button: cleanLabel, disabled: bytes === 0 };
    case 'idle':
      return { message: idleMessage(s), button: cleanLabel, disabled: bytes === 0 };
  }
}

export function bindFooter(onClean: () => void) {
  $('clean').addEventListener('click', onClean);
}

export function renderFooter(s: AppState) {
  const copy = footerCopy(s);
  const main = $<HTMLButtonElement>('clean');
  $('msg').textContent = copy.message;
  main.textContent = copy.button;
  main.disabled = copy.disabled;
}
