// Relatórios de erro: travamentos já enviados ou na fila. Auditoria: docs/SAFETY-AUDIT.md
import { join } from 'node:path';
import { LOCAL, PROGRAMDATA } from '../paths';
import { defineCategory } from '../types';
import { CUT } from './_icon';

export default defineCategory({
  id: 'errors',
  name: 'Relatórios de erro',
  color: '#FFC531',
  // folha de relatório com a linha de um travamento (o triângulo ⚠ fica só para avisos)
  icon: `<path d="M6.5 2h7.6L20 7.9v11.6a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="currentColor"/><path d="M6.8 14.2h2.6l1.6-3.4 2.2 6 1.7-2.6h2.3" fill="none" stroke="${CUT}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  hint: 'Relatórios de travamentos antigos e cópias da memória feitas na hora do erro',
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
