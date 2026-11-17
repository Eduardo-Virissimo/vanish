// Navegadores: só o cache. Histórico, senhas, cookies e logins ficam. Auditoria: docs/SAFETY-AUDIT.md
import { join } from 'node:path';
import { LOCAL, chromiumCaches } from '../paths';
import { defineCategory } from '../types';
import { CUT } from './_icon';

export default defineCategory({
  id: 'browsers',
  name: 'Navegadores',
  color: '#2FD467',
  icon: `<circle cx="12" cy="12" r="9.5" fill="currentColor"/><path d="M2.8 12h18.4M12 2.6c3.4 3.4 3.4 15.4 0 18.8M12 2.6c-3.4 3.4-3.4 15.4 0 18.8" fill="none" stroke="${CUT}" stroke-width="1.7"/>`,
  hint: 'Cache do Chrome, Edge, Brave, Opera e Firefox. Histórico, senhas e logins não são tocados.',
  closeFirst: 'Navegadores',
  warning: {
    level: 'caution',
    text: 'Senhas, histórico e logins continuam. Os sites abrem um pouco mais devagar na primeira vez.',
  },
  targets: [
    ...chromiumCaches(join(LOCAL, 'Google', 'Chrome', 'User Data')),
    ...chromiumCaches(join(LOCAL, 'Microsoft', 'Edge', 'User Data')),
    ...chromiumCaches(join(LOCAL, 'BraveSoftware', 'Brave-Browser', 'User Data')),
    { path: join(LOCAL, 'Opera Software', 'Opera Stable', 'Cache') },
    { path: join(LOCAL, 'Mozilla', 'Firefox', 'Profiles', '*', 'cache2') },
  ],
});
