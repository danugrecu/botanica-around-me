import assert from 'node:assert/strict';
import {
  backupDiaryJson,
  exportDiaryCsv,
  normalizeDiaryEntry,
  readDiaryEntries,
  restoreDiaryJson,
  writeDiaryEntries,
} from '../src/frontend/diary/diary.mjs';

const storage = new Map();
globalThis.localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
  removeItem(key) {
    storage.delete(key);
  },
};

const legacyRecord = {
  name: 'Maremma 1',
  date: '2024-06-03',
  species: 'porcini',
  result: 2,
  notes: '=cmd|calc("x")',
  effort: '90',
  score: 82,
  model: 'v2',
  scenario: true,
};

const normalized = normalizeDiaryEntry(legacyRecord, { lat: 42.925, lon: 11.115, name: 'Punto base' });
assert.equal(normalized.name, 'Maremma 1');
assert.equal(normalized.lat, 42.925);
assert.equal(normalized.lon, 11.115);
assert.equal(normalized.result, 2);
assert.equal(normalized.species, 'porcini');
assert.equal(normalized.model, 'v2');
assert.equal(normalized.scenario, true);

const csv = exportDiaryCsv([normalized]);
assert.match(csv, /luogo/);
assert.match(csv, /'\=cmd\|calc\(""x""\)/);
assert.ok(csv.includes('Maremma 1'));

writeDiaryEntries([normalized]);
const saved = readDiaryEntries();
assert.equal(saved.length, 1);
assert.equal(saved[0].name, 'Maremma 1');
assert.equal(saved[0].species, 'porcini');

storage.set('fungapp-logs-v1', '{corrotto');
assert.deepEqual(readDiaryEntries(), []);
assert.equal(normalizeDiaryEntry({ date: 'bad', effort: 'x', score: '' }).date, null);
assert.equal(normalizeDiaryEntry({ date: '2024-06-03', effort: '', score: null }).effort, null);
assert.equal(normalizeDiaryEntry({ date: '2024-06-03', effort: '', score: null }).score, null);

const quoted = normalizeDiaryEntry({
  name: 'Bosco "alto"',
  date: '2024-06-03',
  notes: 'linea 1\n😀',
  result: 1,
});
const quotedCsv = exportDiaryCsv([quoted]);
assert.match(quotedCsv, /Bosco ""alto""/);
assert.match(quotedCsv, /linea 1\n😀/);
for (const prefix of ['=', '+', '-', '@']) {
  assert.match(exportDiaryCsv([normalizeDiaryEntry({ date: '2024-06-03', notes: `${prefix}formula` })]), new RegExp(`"'\\${prefix}formula"`));
}

const backup = backupDiaryJson([quoted]);
assert.equal(JSON.parse(backup).version, 2);
assert.equal(restoreDiaryJson(backup)[0].notes, 'linea 1\n😀');
assert.equal(restoreDiaryJson('[]').length, 0);
assert.equal(restoreDiaryJson('{bad').length, 0);

console.log('PASS: diary storage and CSV compatibility are stable.');
