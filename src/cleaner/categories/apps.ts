// Cache de apps (a maioria feita em Electron): só as pastas de cache. Auditoria: docs/SAFETY-AUDIT.md
import { join } from 'node:path';
import { LOCAL, ROAMING, electronCaches, partitionCaches } from '../paths';
import { defineCategory } from '../types';

export default defineCategory({
  id: 'apps',
  name: 'Cache de apps',
  color: '#FF4FA3',
  icon: '<rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.4" fill="currentColor"/><rect x="13" y="2.5" width="8.5" height="8.5" rx="2.4" fill="currentColor" opacity=".7"/><rect x="2.5" y="13" width="8.5" height="8.5" rx="2.4" fill="currentColor" opacity=".7"/><rect x="13" y="13" width="8.5" height="8.5" rx="2.4" fill="currentColor"/>',
  hint: 'Cache do Discord, VS Code, Slack, Teams, Spotify, Notion, Obsidian e Postman',
  warning: {
    level: 'caution',
    text: 'Feche esses apps antes. Músicas baixadas no Spotify e páginas offline do Notion não são apagadas.',
  },
  targets: [
    ...electronCaches(join(ROAMING, 'discord')),
    ...electronCaches(join(ROAMING, 'Code')),
    { path: join(ROAMING, 'Code', 'CachedData') },
    ...electronCaches(join(ROAMING, 'Slack')),
    ...electronCaches(join(ROAMING, 'Microsoft', 'Teams')),
    { path: join(LOCAL, 'Spotify', 'Data') },
    ...electronCaches(join(ROAMING, 'obsidian')),
    // Notion e Postman guardam por sessão em Partitions\*; o Service Worker do Notion
    // (arquivos para funcionar offline) fica de fora de propósito
    ...partitionCaches(join(ROAMING, 'Notion')),
    ...partitionCaches(join(ROAMING, 'Postman')),
  ],
});
