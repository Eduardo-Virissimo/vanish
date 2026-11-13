// Lixeira: são arquivos do usuário. Começa desmarcada e pede "Entendi" antes de apagar.
// O tamanho e o esvaziamento ficam em recycle-bin.ts. Auditoria: docs/SAFETY-AUDIT.md
import { defineCategory } from '../types';
import { CUT } from './_icon';

export default defineCategory({
  id: 'trash',
  name: 'Lixeira',
  color: '#FF4D4D',
  icon: `<path d="M4.6 7.2h14.8l-1.1 12.4a2.2 2.2 0 0 1-2.2 2H7.9a2.2 2.2 0 0 1-2.2-2z" fill="currentColor"/><path d="M3 5h18M9.2 5V3.4h5.6V5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6.5M14 11v6.5" stroke="${CUT}" stroke-width="1.7" stroke-linecap="round"/>`,
  hint: 'Tudo o que está na lixeira, em todos os discos. É apagado de vez, por isso começa desmarcada.',
  optIn: true,
  warning: {
    level: 'danger',
    text: 'Tudo o que está na lixeira é apagado de vez. Não dá para recuperar depois.',
  },
  special: 'recycle',
});
