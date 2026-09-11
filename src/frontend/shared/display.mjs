// Presentation only: ecological scores remain unchanged and are not calibrated probabilities.
export const percent = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : '—';
