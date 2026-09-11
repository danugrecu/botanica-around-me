/**
 * Diary storage and export helpers.
 *
 * Purpose:
 * - preserve the legacy browser `localStorage` contract;
 * - normalize incoming entries from older backups;
 * - keep CSV export and JSON backup compatible with the current UI.
 *
 * Inputs:
 * - plain diary records from the app or imported JSON;
 * - optional fallback coordinates when the record was created before the point was set.
 *
 * Outputs:
 * - normalized records for the rest of the app;
 * - CSV/JSON strings for download and backup;
 * - storage writes that keep the historical key `fungapp-logs-v1`.
 */

export const STORAGE_KEY = 'fungapp-logs-v1';

const isValidDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

export function normalizeDiaryEntry(record = {}, fallbackPoint = {}) {
  const lat = Number(record.lat ?? fallbackPoint.lat ?? NaN);
  const lon = Number(record.lon ?? fallbackPoint.lon ?? NaN);
  const date = isValidDate(record.date) ? record.date : isValidDate(fallbackPoint.date) ? fallbackPoint.date : null;
  const result = Number(record.result);
  const effort = record.effort == null || record.effort === '' ? null : Number(record.effort);
  const score = record.score == null || record.score === '' ? null : Number(record.score);
  const scenario = Boolean(record.scenario);

  return {
    name: String(record.name ?? fallbackPoint.name ?? 'Uscita'),
    lat: Number.isFinite(lat) ? lat : fallbackPoint.lat ?? null,
    lon: Number.isFinite(lon) ? lon : fallbackPoint.lon ?? null,
    date,
    species: String(record.species ?? 'porcini'),
    result: Number.isInteger(result) ? result : 0,
    notes: String(record.notes ?? ''),
    effort: Number.isFinite(effort) ? effort : null,
    score: Number.isFinite(score) ? score : null,
    savedAt: record.savedAt ?? new Date().toISOString(),
    weatherAt: record.weatherAt ?? null,
    model: record.model ?? null,
    scenario,
    snapshot: record.snapshot ?? null,
  };
}

export function readDiaryEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && isValidDate(entry.date))
      .map((entry) => normalizeDiaryEntry(entry));
  } catch {
    return [];
  }
}

export function writeDiaryEntries(entries = []) {
  const normalized = Array.isArray(entries)
    ? entries
        .filter((entry) => entry && isValidDate(entry.date))
        .map((entry) => normalizeDiaryEntry(entry))
    : [];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // keep the in-memory list usable even when storage is unavailable.
  }
  return normalized;
}

export function exportDiaryCsv(logs = []) {
  const quote = (value) =>
    '"' +
    String(value ?? '')
      .replace(/^[\s]*[=+@-]/, "'$&")
      .replace(/"/g, '""') +
    '"';

  const rows = [
    [
      'luogo',
      'latitudine',
      'longitudine',
      'data',
      'specie',
      'esito',
      'minuti',
      'note',
      'indice',
      'modello',
      'scenario',
      'salvato_il',
    ],
    ...logs.map((entry) => [
      entry.name,
      entry.lat,
      entry.lon,
      entry.date,
      entry.species,
      entry.result,
      entry.effort,
      entry.notes,
      entry.score,
      entry.model,
      entry.scenario,
      entry.savedAt,
    ]),
  ];

  return '\uFEFF' + rows.map((row) => row.map(quote).join(';')).join('\r\n');
}

export function backupDiaryJson(logs = [], version = 2) {
  return JSON.stringify(
    {
      version,
      exportedAt: new Date().toISOString(),
      logs: Array.isArray(logs) ? logs.map((entry) => normalizeDiaryEntry(entry)) : [],
    },
    null,
    2,
  );
}

export function restoreDiaryJson(text) {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map((entry) => normalizeDiaryEntry(entry));
    if (parsed && Array.isArray(parsed.logs)) return parsed.logs.map((entry) => normalizeDiaryEntry(entry));
    return [];
  } catch {
    return [];
  }
}
