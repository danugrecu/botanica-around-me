/**
 * 3x3 grid comparison helper.
 *
 * Purpose:
 * - generate the nine nearby points around the selected center;
 * - preserve the original spacing and ranking logic;
 * - keep the same shared weather and prediction contract as the main view.
 *
 * Inputs:
 * - center point { lat, lon } and nominal step in meters.
 *
 * Outputs:
 * - nine coordinate records with names and lat/lon values for the scan.
 */

export function buildGridScanPoints(center, stepMeters = 500) {
  const { lat, lon } = center;
  const points = [];
  const xStep = (stepMeters / 111320) * (1 / Math.cos((lat * Math.PI) / 180));
  const yStep = stepMeters / 111320;
  // Keep the same row-major ordering as the original inline scan in main.mjs:
  // south -> center -> north, left-to-right within each row.
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      const item = {
        lat: lat + y * yStep,
        lon: lon + x * xStep,
        name:
          y === 0 && x === 0
            ? 'Centro'
            : `${y > 0 ? 'Nord' : y < 0 ? 'Sud' : ''}${x > 0 ? ' est' : x < 0 ? ' ovest' : ''}`,
      };
      points.push(item);
    }
  }
  return points;
}
