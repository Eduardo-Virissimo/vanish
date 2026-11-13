// Temporários: arquivos que programas criam e deveriam apagar. Auditoria: docs/SAFETY-AUDIT.md
import { join } from 'node:path';
import { DAY, TEMP, WINDIR } from '../paths';
import { defineCategory } from '../types';
import { CUT } from './_icon';

export default defineCategory({
  id: 'temp',
  name: 'Temporários',
  color: '#3D8BFF',
  icon: `<circle cx="12" cy="12" r="9.5" fill="currentColor"/><path d="M12 6.8V12l3.4 2.2" fill="none" stroke="${CUT}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  hint: 'Arquivos temporários com mais de 24 horas',
  targets: [
    { path: TEMP, minAgeMs: DAY },
    { path: join(WINDIR, 'Temp'), minAgeMs: DAY },
  ],
});
