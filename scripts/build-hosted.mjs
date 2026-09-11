import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { buildAssets } from './build-assets.mjs';
const root = path.resolve(import.meta.dirname, '..');
const assets = {};
const types = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};
async function collect(dir, prefix = '') {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'server') continue;
    const rel = prefix + '/' + e.name;
    if (e.isDirectory()) await collect(path.join(dir, e.name), rel);
    else
      assets[rel] = {
        type: types[path.extname(e.name)] ?? 'application/octet-stream',
        data: (await readFile(path.join(dir, e.name))).toString('base64'),
      };
  }
}
await buildAssets();
await collect(path.join(root, 'dist'));
const manifest = JSON.parse(await readFile(path.join(root, '.openai/hosting.json'), 'utf8'));
const code = await readFile(path.join(root, 'src/backend/hosted/backend.mjs'), 'utf8');
await mkdir(path.join(root, 'dist/server'), { recursive: true });
await mkdir(path.join(root, 'dist/.openai'), { recursive: true });
await writeFile(
  path.join(root, 'dist/server/index.js'),
  code +
    '\nconst assets=' +
    JSON.stringify(assets) +
    ';\nexport default {fetch(request){return handle(request,assets);}};\n',
);
await writeFile(path.join(root, 'dist/.openai/hosting.json'), JSON.stringify(manifest) + '\n');
console.log(`Hosted Worker ready: ${Object.keys(assets).length} assets; local UI unchanged.`);
