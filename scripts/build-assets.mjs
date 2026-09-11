import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const assets = [
  ['src/frontend/index.html', 'index.html'],
  ['src/frontend/styles/main.css', 'style.css'],
  ['src/frontend/app/main.mjs', 'app/main.mjs'],
  ['src/frontend/around/around.mjs', 'around/around.mjs'],
  ['src/frontend/clients/weather.mjs', 'clients/weather.mjs'],
  ['src/frontend/diary/diary.mjs', 'diary/diary.mjs'],
  ['src/frontend/ecology/ecology.mjs', 'ecology/ecology.mjs'],
  ['src/frontend/ecology/model.mjs', 'ecology/model.mjs'],
  ['src/frontend/forecast/forecast.mjs', 'forecast/forecast.mjs'],
  ['src/frontend/shared/display.mjs', 'shared/display.mjs'],
  ['data/catalog/trekking-fallback.json', 'trekking-fallback.json'],
  ['data/forecast/forecast-points.json', 'forecast-points.json'],
  ['vendor/leaflet', 'vendor'],
];

export async function buildAssets() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  for (const [source, target] of assets) {
    const destination = path.join(dist, target);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, source), destination, { recursive: true });
  }
  console.log(`Frontend assets ready: ${assets.length} source groups copied.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildAssets();
}
