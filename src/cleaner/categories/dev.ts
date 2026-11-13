// Desenvolvimento: caches de ferramentas que baixam tudo de novo quando precisam.
// Nunca apagar à mão: .nuget\packages, Yarn\Berry, pnpm\store e a cache do uv (o próprio uv diz que
// só é seguro com `uv cache clean`). Ver docs/CLEANUP-CANDIDATES.md. Auditoria: docs/SAFETY-AUDIT.md
import { join } from 'node:path';
import { LOCAL } from '../paths';
import { defineCategory } from '../types';
import { CUT } from './_icon';

export default defineCategory({
  id: 'dev',
  name: 'Desenvolvimento',
  color: '#8B6CFF',
  icon: `<rect x="2" y="3.5" width="20" height="17" rx="3.5" fill="currentColor"/><path d="m6.8 9.5 3.2 2.5-3.2 2.5M12.5 15.5h4.7" fill="none" stroke="${CUT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  hint: 'Cache do npm, Yarn, pip, NuGet, Go e Electron. Tudo é baixado de novo quando necessário.',
  warning: {
    level: 'caution',
    text: 'O próximo npm, pip ou dotnet install baixa os pacotes de novo e demora mais. Sem internet, ele falha.',
  },
  targets: [
    { path: join(LOCAL, 'npm-cache') },
    { path: join(LOCAL, 'Yarn', 'Cache') },
    { path: join(LOCAL, 'pip', 'Cache') },
    { path: join(LOCAL, 'NuGet', 'v3-cache') },
    { path: join(LOCAL, 'go-build') },
    { path: join(LOCAL, 'electron', 'Cache'), note: 'Versões do Electron baixadas pelo npm install' },
  ],
});
