import assert from 'node:assert/strict';
import {access, readFile, readdir, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {buildAssets} from '../scripts/build-assets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const requiredAssets = [
  'index.html',
  'style.css',
  'app/main.mjs',
  'analysis/grid-scan.mjs',
  'around/around.mjs',
  'clients/botanica-api.mjs',
  'clients/weather.mjs',
  'diary/diary.mjs',
  'ecology/ecology.mjs',
  'ecology/model.mjs',
  'forecast/forecast.mjs',
  'map/map.mjs',
  'shared/display.mjs',
  'shared/geo.mjs',
  'forecast-points.json',
  'trekking-fallback.json',
  'vendor/leaflet.js',
  'vendor/leaflet.css',
  'vendor/images/layers.png',
  'vendor/images/layers-2x.png',
  'vendor/LEAFLET-LICENSE.txt',
];

async function exists(relativePath) {
  await access(path.join(dist, relativePath));
}

async function sourceModules(directory) {
  const modules = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) modules.push(...(await sourceModules(entryPath)));
    else if (entry.name.endsWith('.mjs')) modules.push(entryPath);
  }
  return modules;
}

test('build-assets creates a complete dist tree from zero', async () => {
  await rm(dist, {recursive: true, force: true});
  await buildAssets();

  for (const asset of requiredAssets) {
    await exists(asset);
  }

  const html = await readFile(path.join(dist, 'index.html'), 'utf8');
  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((reference) => !/^(?:https?:|#|\/)/.test(reference));

  for (const reference of references) {
    await exists(reference.replace(/^\.\//, ''));
  }

  for (const sourcePath of await sourceModules(path.join(root, 'src', 'frontend'))) {
    const source = await readFile(sourcePath, 'utf8');
    for (const [, reference] of source.matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g)) {
      const sourceRelative = path.relative(path.join(root, 'src', 'frontend'), sourcePath);
      const importedSource = path.resolve(path.dirname(sourcePath), reference);
      const importedRelative = path.relative(path.join(root, 'src', 'frontend'), importedSource);
      await access(importedSource);
      await exists(importedRelative.replaceAll(path.sep, '/'));
      assert.ok(!sourceRelative.startsWith('dist' + path.sep));
    }
  }
});