import assert from 'node:assert/strict';
import { buildGridScanPoints } from '../src/frontend/analysis/grid-scan.mjs';

const center = { lat: 42.925, lon: 11.115 };
const points = buildGridScanPoints(center, 500);

assert.equal(points.length, 9);

const expected = [
  { lat: 42.92051, lon: 11.10887 },
  { lat: 42.92051, lon: 11.115 },
  { lat: 42.92051, lon: 11.12113 },
  { lat: 42.925, lon: 11.10887 },
  { lat: 42.925, lon: 11.115 },
  { lat: 42.925, lon: 11.12113 },
  { lat: 42.92949, lon: 11.10887 },
  { lat: 42.92949, lon: 11.115 },
  { lat: 42.92949, lon: 11.12113 },
];

assert.deepEqual(
  points.map((p) => ({ lat: Number(p.lat.toFixed(5)), lon: Number(p.lon.toFixed(5)) })),
  expected,
);
assert.ok(points.every((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)));
assert.ok(points[4].name.includes('Centro'));
assert.equal(points.filter((p) => p.name === 'Centro').length, 1);
assert.equal(points.filter((p) => p.name.toLowerCase().includes('nord')).length, 3);
assert.equal(points.filter((p) => p.name.toLowerCase().includes('sud')).length, 3);
assert.equal(points.filter((p) => p.name.toLowerCase().includes('ovest')).length, 3);
console.log('PASS: grid scan generation is stable.');
