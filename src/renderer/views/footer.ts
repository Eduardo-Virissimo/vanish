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
  if (r.removed === 0 && r.skipped === 0) return 'Nada foi apagado. Os arquivos já tinham sido removidos.';
  return r.skipped > 0
    ? `${plural(r.skipped, 'arquivo estava em uso e ficou', 'arquivos estavam em uso e ficaram')} para a próxima limpeza.`
    : `${plural(r.removed, 'arquivo apagado', 'arquivos apagados')}. Os apps recriam o que precisarem.`;
}

function footerCopy(s: AppState): FooterCopy {
  const bytes = chosenBytes(s);
  const cleanLabel = bytes > 0 ? `Limpar ${formatBytes(bytes)}` : 'Limpar selecionados';

  // depois de um erro o botão principal leva para a saída: analisar de novo
  if (s.problem && (s.phase === 'idle' || s.phase === 'done')) {
    const message = s.problem === 'scan'
      ? 'A análise não terminou, então não dá para saber o que liberar. Analise de novo.'
      : `A limpeza parou no meio${s.result?.freed ? `, depois de liberar ${formatBytes(s.result.freed)}` : ''}. Analise de novo para ver o que sobrou.`;
    return { message, button: 'Analisar de novo', disabled: false };
  }

  switch (s.phase) {
    case 'scanning':
      return { message: 'Procurando arquivos temporários e caches que podem ser apagados.', button: 'Limpar selecionados', disabled: true };
    case 'confirm':
      // a confirmação acontece no diálogo (views/confirm.ts)
      return { message: idleMessage(s), button: cleanLabel, disabled: true };
    case 'cleaning':
      return { message: 'Arquivos abertos em outros programas são pulados e ficam para a próxima limpeza.', button: 'Limpando…', disabled: true };
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
  $('clean-label').textContent = copy.button;
  main.disabled = copy.disabled;
  $('app').classList.toggle('has-problem', !!s.problem);
}
