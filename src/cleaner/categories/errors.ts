// Relatórios de erro: travamentos já enviados ou na fila. Auditoria: docs/SAFETY-AUDIT.md
import { join } from 'node:path';
import { LOCAL, PROGRAMDATA } from '../paths';
import { defineCategory } from '../types';
import { CUT } from './_icon';

export default defineCategory({
  id: 'errors',
  name: 'Relatórios de erro',
  color: '#FFC531',
  icon: `<path d="M10.3 3.4a2 2 0 0 1 3.4 0l8.4 14.5a2 2 0 0 1-1.7 3H3.6a2 2 0 0 1-1.7-3z" fill="currentColor"/><path d="M12 9v4.6M12 17.2v.1" stroke="${CUT}" stroke-width="2.3" stroke-linecap="round"/>`,
  hint: 'Relatórios de travamento e despejos de memória antigos',
  warning: {
    level: 'caution',
    text: 'Relatórios de travamentos antigos somem. Só importa se um suporte técnico pediu algum deles.',
  },
  targets: [
    { path: join(LOCAL, 'CrashDumps') },
    ...['ReportArchive', 'ReportQueue'].flatMap((dir) => [
      { path: join(LOCAL, 'Microsoft', 'Windows', 'WER', dir) },
      { path: join(PROGRAMDATA, 'Microsoft', 'Windows', 'WER', dir) },
    ]),
  ],
});
