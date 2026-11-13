// Miniaturas: o Explorador de Arquivos recria sozinho. Auditoria: docs/SAFETY-AUDIT.md
import { join } from 'node:path';
import { LOCAL } from '../paths';
import { defineCategory } from '../types';
import { CUT } from './_icon';

export default defineCategory({
  id: 'thumbs',
  name: 'Miniaturas',
  color: '#22D3EE',
  icon: `<rect x="2" y="3.5" width="20" height="17" rx="3.5" fill="currentColor"/><circle cx="8" cy="9" r="1.9" fill="${CUT}"/><path d="m3 18.5 5.6-5.2 3.6 3.2 3.4-3.6L21 18" fill="none" stroke="${CUT}" stroke-width="2" stroke-linejoin="round"/>`,
  hint: 'Miniaturas e ícones que o Explorador de Arquivos gera de novo sozinho',
  warning: {
    level: 'caution',
    text: 'Pastas com muitas fotos e vídeos demoram para mostrar as miniaturas na próxima vez.',
  },
  targets: [{
    path: join(LOCAL, 'Microsoft', 'Windows', 'Explorer'),
    match: /^(thumbcache|iconcache)_.*\.db$/i,
    shallow: true,
    note: 'Só os arquivos thumbcache_*.db e iconcache_*.db',
  }],
});
