// Jogos e gráficos: cache de shaders da placa de vídeo e cache web dos launchers.
// Jogos, saves e configurações não são tocados. Auditoria: docs/SAFETY-AUDIT.md
import { join } from 'node:path';
import { LOCAL, chromiumCaches } from '../paths';
import { defineCategory } from '../types';
import { CUT } from './_icon';

const SHADERS = 'Shaders da placa de vídeo; o driver refaz conforme os jogos rodam';

export default defineCategory({
  id: 'games',
  name: 'Jogos e gráficos',
  color: '#FF8A3D',
  icon: `<path d="M7.5 6.5h9a5.5 5.5 0 0 1 5.3 6.9l-.9 3.4a2.6 2.6 0 0 1-4.6.9L14.6 15H9.4l-1.7 2.7a2.6 2.6 0 0 1-4.6-.9l-.9-3.4A5.5 5.5 0 0 1 7.5 6.5z" fill="currentColor"/><path d="M7.5 9.5V13M5.75 11.25h3.5" stroke="${CUT}" stroke-width="1.7" stroke-linecap="round"/><circle cx="15.6" cy="10.2" r="1.1" fill="${CUT}"/><circle cx="17.7" cy="12.3" r="1.1" fill="${CUT}"/>`,
  hint: 'Cache de shaders do DirectX, AMD e NVIDIA, e cache web da Steam e da Epic. Jogos e saves não são tocados.',
  warning: {
    level: 'caution',
    text: 'Feche a Steam e a Epic antes. Os jogos podem engasgar um pouco na primeira vez enquanto refazem os shaders.',
  },
  // Só pastas com fonte na auditoria. AMD VkCache/GLCache, NVIDIA NV_Cache e Intel ficaram de
  // fora por falta de fonte confiável (docs/CLEANUP-CANDIDATES.md).
  targets: [
    { path: join(LOCAL, 'D3DSCache'), note: SHADERS },
    { path: join(LOCAL, 'NVIDIA', 'DXCache'), note: SHADERS },
    { path: join(LOCAL, 'NVIDIA', 'GLCache'), note: SHADERS },
    { path: join(LOCAL, 'AMD', 'DxCache'), note: SHADERS },
    // a htmlcache da Steam é um navegador Chromium: só o cache; cookies e login da loja ficam
    ...chromiumCaches(join(LOCAL, 'Steam', 'htmlcache')).map((t) => ({ ...t, note: 'Navegador interno da Steam' })),
    { path: join(LOCAL, 'EpicGamesLauncher', 'Saved', 'webcache*'), note: 'Navegador interno da Epic' },
  ],
});
