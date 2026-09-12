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
});
