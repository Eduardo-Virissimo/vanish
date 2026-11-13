// Windows Update: downloads de atualizações já instaladas. Começa desmarcada e fica bloqueada
// enquanto houver atualização esperando reiniciar. Auditoria: docs/SAFETY-AUDIT.md
import { join } from 'node:path';
import { DAY, WINDIR } from '../paths';
import { defineCategory } from '../types';
import { CUT } from './_icon';

export default defineCategory({
  id: 'update',
  name: 'Windows Update',
  color: '#B8BCC6',
  icon: `<circle cx="12" cy="12" r="9.5" fill="currentColor"/><path d="M12 6.8v8.6m-3.8-3.8 3.8 3.8 3.8-3.8" fill="none" stroke="${CUT}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`,
  hint: 'Atualizações já instaladas que ficaram baixadas. Bloqueado enquanto houver atualização esperando reiniciar. Precisa rodar como administrador.',
  optIn: true,
  guard: 'no-pending-reboot',
  warning: {
    level: 'caution',
    text: 'Se o Windows precisar de alguma dessas atualizações de novo, ele baixa outra vez.',
  },
  targets: [{ path: join(WINDIR, 'SoftwareDistribution', 'Download'), minAgeMs: DAY }],
});
