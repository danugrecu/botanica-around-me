/**
 * Local Botanica API client.
 *
 * Purpose:
 * - centralize /api/* request composition;
 * - keep fetch logic and request parameters in one place;
 * - preserve the current runtime URLs and response handling.
 *
 * Inputs:
 * - latitude, longitude, and optional radius for the API calls;
 * - fetch options such as AbortSignal.
 *
 * Outputs:
 * - parsed JSON for environment, land, and around responses.
 * - no UI rendering and no Ecology logic.
 */

async function getJson(url, init = {}) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

export function normalizeCoords(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Coordinate non valide');
  }
  return { lat: latitude, lon: longitude };
}

export async function getEnvironment(latOrPoint, lon, init = {}) {
  const { lat, lon: lng } =
    typeof latOrPoint === 'object'
      ? normalizeCoords(latOrPoint?.lat, latOrPoint?.lon)
      : normalizeCoords(latOrPoint, lon);
  return getJson(`/api/environment?lat=${lat}&lon=${lng}`, init);
}

export async function getLand(latOrPoint, lon, init = {}) {
  const { lat, lon: lng } =
    typeof latOrPoint === 'object'
      ? normalizeCoords(latOrPoint?.lat, latOrPoint?.lon)
      : normalizeCoords(latOrPoint, lon);
  return getJson(`/api/land?lat=${lat}&lon=${lng}`, init);
}

export async function getAroundContext(latOrPoint, lon, radius, init = {}) {
  const point =
    typeof latOrPoint === 'object'
      ? normalizeCoords(latOrPoint?.lat, latOrPoint?.lon)
      : normalizeCoords(latOrPoint, lon);
  const radiusKm = Number(radius ?? 25);
  return getJson(`/api/around?lat=${point.lat}&lon=${point.lon}&radius=${radiusKm}`, init);
}
