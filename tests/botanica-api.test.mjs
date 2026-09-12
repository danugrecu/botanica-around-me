import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAroundContext,
  getEnvironment,
  getLand,
  normalizeCoords,
} from '../src/frontend/clients/botanica-api.mjs';

test('environment, land and around build the expected API URLs', async () => {
  const calls = [];
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };

  try {
    await getEnvironment({ lat: 42.92, lon: 11.12 });
    await getLand(42.93, 11.13);
    await getAroundContext({ lat: 42.91, lon: 11.14 }, null, 10);
  } finally {
    globalThis.fetch = previous;
  }

  assert.deepEqual(calls.map((c) => c.url), [
    '/api/environment?lat=42.92&lon=11.12',
    '/api/land?lat=42.93&lon=11.13',
    '/api/around?lat=42.91&lon=11.14&radius=10',
  ]);
});

test('invalid coordinate input is rejected before network call', async () => {
  assert.throws(() => normalizeCoords('bad', 11.1), /Coordinate non valide/);
  await assert.rejects(() => getEnvironment('bad', 11.1), /Coordinate non valide/);
  await assert.rejects(() => getEnvironment({ lat: NaN, lon: 11.1 }), /Coordinate non valide/);
  await assert.rejects(() => getLand({ lat: 42.9, lon: undefined }), /Coordinate non valide/);
  await assert.rejects(() => getAroundContext({ lat: 'bad', lon: 11.1 }, null, 5), /Coordinate non valide/);
});

test('all supported radii are encoded and HTTP failures are surfaced', async () => {
  const calls = [];
  const previous = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url.endsWith('radius=25')) return { ok: false, status: 503, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };

  try {
    for (const radius of [5, 10, 25, 50]) {
      if (radius === 25) await assert.rejects(() => getAroundContext({ lat: 42.9, lon: 11.1 }, null, radius), /HTTP 503/);
      else await getAroundContext({ lat: 42.9, lon: 11.1 }, null, radius);
    }
  } finally {
    globalThis.fetch = previous;
  }

  assert.deepEqual(calls, [
    '/api/around?lat=42.9&lon=11.1&radius=5',
    '/api/around?lat=42.9&lon=11.1&radius=10',
    '/api/around?lat=42.9&lon=11.1&radius=25',
    '/api/around?lat=42.9&lon=11.1&radius=50',
  ]);
});
