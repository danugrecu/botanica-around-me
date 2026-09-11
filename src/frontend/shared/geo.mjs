/**
 * Shared geo helpers used by the frontend.
 *
 * Purpose:
 * - keep point-in-bounds and geodesic distance logic in one place;
 * - avoid drift between map and around-me calculations.
 *
 * Inputs:
 * - lat/lon pairs and the Maremma bounds.
 *
 * Outputs:
 * - numeric distances in kilometers;
 * - cardinal direction labels;
 * - whether a point falls inside the territorial bounds.
 */

export const MAREMMA_BOUNDS = {
  south: 42.3,
  north: 43.25,
  west: 10.45,
  east: 11.9,
};

export function insideMaremma(lat, lon) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= MAREMMA_BOUNDS.south &&
    lat <= MAREMMA_BOUNDS.north &&
    lon >= MAREMMA_BOUNDS.west &&
    lon <= MAREMMA_BOUNDS.east
  );
}

export function distanceKm(a, b) {
  const p = Math.PI / 180;
  const dLat = (b.lat - a.lat) * p;
  const dLon = (b.lon - a.lon) * p;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function directionFrom(a, b) {
  const p = Math.PI / 180;
  const y = Math.sin((b.lon - a.lon) * p) * Math.cos(b.lat * p);
  const x =
    Math.cos(a.lat * p) * Math.sin(b.lat * p) -
    Math.sin(a.lat * p) * Math.cos(b.lat * p) * Math.cos((b.lon - a.lon) * p);
  const d = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ovest', 'ovest', 'nord-ovest'][
    Math.round(d / 45) % 8
  ];
}
