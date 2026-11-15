import {build} from 'esbuild';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await build({
  entryPoints: [path.join(root, 'components/canonical-public-landing/cinematic-v3/scene/main.mjs')],
  outfile: path.join(root, 'public/assets/landing-cinematic-v3/main.js'),
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2022',
});
