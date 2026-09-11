import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

async function copyRecursive(sourceDir, targetDir) {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await copyRecursive(sourcePath, targetPath);
      continue;
    }
    await mkdir(path.dirname(targetPath), { recursive: true });
    await cp(sourcePath, targetPath, { recursive: false });
  }
}

async function copyFrontEndModules() {
  const sourceDir = path.join(root, 'src/frontend');
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    if (entry.name === 'index.html') {
      await mkdir(dist, { recursive: true });
      await cp(sourcePath, path.join(dist, 'index.html'), { recursive: false });
      continue;
    }
    if (entry.name === 'styles') {
      const cssPath = path.join(sourcePath, 'main.css');
      await cp(cssPath, path.join(dist, 'style.css'), { recursive: false });
      continue;
    }
    if (entry.isDirectory()) {
      await copyRecursive(sourcePath, path.join(dist, entry.name));
    } else {
      await mkdir(path.dirname(path.join(dist, entry.name)), { recursive: true });
      await cp(sourcePath, path.join(dist, entry.name), { recursive: false });
    }
  }
}

const assets = [
  { source: 'data/catalog', target: '.' },
  { source: 'data/forecast', target: '.' },
  { source: 'vendor/leaflet', target: 'vendor' },
];

export async function buildAssets() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await copyFrontEndModules();
  let copied = 1;
  for (const { source, target } of assets) {
    const sourcePath = path.join(root, source);
    const destination = path.join(dist, target);
    await mkdir(destination, { recursive: true });
    await copyRecursive(sourcePath, destination);
    copied += (await readdir(sourcePath, { recursive: true })).length;
  }
  console.log(`Frontend assets ready: ${copied} source entries copied.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildAssets();
}
