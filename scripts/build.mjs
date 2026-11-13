// Compila o TypeScript para dist/ com o esbuild.
// Cada processo do Electron vira um único arquivo .js.
import * as esbuild from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';

const common = { bundle: true, sourcemap: 'linked', target: 'es2022', logLevel: 'warning' };
const node = { ...common, platform: 'node', format: 'cjs', external: ['electron'] };

await rm('dist', { recursive: true, force: true });
await mkdir('dist/renderer', { recursive: true });

await Promise.all([
  esbuild.build({ ...node, entryPoints: ['src/main/index.ts'], outfile: 'dist/main.js' }),
  esbuild.build({ ...node, entryPoints: ['src/preload/index.ts'], outfile: 'dist/preload.js' }),
  esbuild.build({ ...common, platform: 'browser', format: 'iife', entryPoints: ['src/renderer/main.ts'], outfile: 'dist/renderer/app.js' }),
  esbuild.build({
    ...common,
    entryPoints: ['src/renderer/styles/index.css'],
    outfile: 'dist/renderer/app.css',
    // fontes referenciadas no CSS são copiadas para dist/renderer/fonts/
    loader: { '.ttf': 'file' },
    assetNames: 'fonts/[name]',
  }),
  cp('src/renderer/index.html', 'dist/renderer/index.html'),
  cp('assets/mark.svg', 'dist/renderer/mark.svg'),
  cp('assets/icon.png', 'dist/icon.png'),
]);

console.log('Build pronto em dist/');
