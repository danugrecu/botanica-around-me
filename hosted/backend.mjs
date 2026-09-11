/**
 * Backend HTTP della versione ospitata.
 * Mantiene lo stesso contratto JSON di server.py per /api/environment, /api/land e /api/around.
 * La copia eseguibile in dist/server/index.js viene generata: non modificarla direttamente.
 */
const WMS = 'https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms';
const SOIL = 'https://www502.regione.toscana.it/ows2/com.rt.wms.RTmap/wms';
const cache = new Map();
const round = (v, n) => Number(v.toFixed(n));
const decode = (s) =>
  s.replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi, (m, n, k) =>
    n
      ? String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n))
      : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[k] ?? m),
  );
// Small bounded XML tree reader; rejects declarations/DTDs and never resolves entities.
function xmlTree(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error('Dichiarazione XML non supportata');
  const root = { name: 'root', children: [], text: '' },
    stack = [root];
  for (const token of xml.matchAll(
    /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<([^>]+)>|([^<]+)/g,
  )) {
    if (token[1] !== undefined) {
      stack.at(-1).text += token[1];
      continue;
    }
    if (token[3] !== undefined) {
      stack.at(-1).text += decode(token[3]);
      continue;
    }
    if (!token[2]) continue;
    const tag = token[2].trim();
    if (tag.startsWith('/')) {
      if (stack.length < 2 || stack.at(-1).tag !== tag.slice(1).trim())
        throw Error('XML non valido');
      stack.pop();
      continue;
    }
    const full = tag.match(/^[\w:.-]+/)?.[0];
    if (!full) throw Error('XML non valido');
    const child = { tag: full, name: full.split(':').at(-1), children: [], text: '' };
    stack.at(-1).children.push(child);
    if (!tag.endsWith('/')) stack.push(child);
  }
  if (stack.length !== 1) throw Error('XML incompleto');
  return root.children[0];
}
const descendants = (n, name) =>
  n.children.flatMap((c) => [...(c.name === name ? [c] : []), ...descendants(c, name)]);
export function parseGml(raw) {
  const match = raw.match(/<ogr:FeatureCollection[\s\S]*?<\/ogr:FeatureCollection>/);
  if (!match) throw Error('Formato cartografico non riconosciuto');
  const root = xmlTree(match[0]);
  const ring = (n) =>
    n.text
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => {
        const xy = p.split(',').slice(0, 2).map(Number);
        if (xy.length !== 2 || !xy.every(Number.isFinite)) throw Error('Coordinate GML non valide');
        return xy.map((v) => round(v, 6));
      });
  return root.children
    .filter((n) => n.name === 'featureMember')
    .map((member) => {
      const f = member.children[0];
      if (!f) throw Error('Feature incompleta');
      const polygons = descendants(f, 'Polygon')
        .map((p) => {
          const outer = descendants(p, 'outerBoundaryIs').flatMap((n) =>
            descendants(n, 'coordinates'),
          )[0];
          const inner = descendants(p, 'innerBoundaryIs').flatMap((n) =>
            descendants(n, 'coordinates'),
          );
          return outer ? [ring(outer), ...inner.map(ring)] : [];
        })
        .filter((p) => p.length);
      return {
        layer: f.name,
        properties: Object.fromEntries(
          f.children
            .filter((c) => !c.name.includes('geometry'))
            .map((c) => [c.name, c.text || null]),
        ),
        geometry: polygons.length ? { type: 'MultiPolygon', coordinates: polygons } : null,
      };
    });
}
function insideRing(lon, lat, coords) {
  let inside = false;
  for (let i = 0; i < coords.length; i++) {
    const a = coords[i],
      b = coords[(i + coords.length - 1) % coords.length];
    if (a[1] > lat !== b[1] > lat && lon < ((b[0] - a[0]) * (lat - a[1])) / (b[1] - a[1]) + a[0])
      inside = !inside;
  }
  return inside;
}
export function contains(f, lat, lon) {
  return !!f.geometry?.coordinates.some(
    (p) => insideRing(lon, lat, p[0]) && !p.slice(1).some((r) => insideRing(lon, lat, r)),
  );
}
async function upstream(url, ttl = 3600, timeout = 25000) {
  const now = Date.now(),
    hit = cache.get(url);
  if (hit && now - hit.at < ttl * 1000) return hit.value;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Botanica-private-research/3.0' },
    signal: AbortSignal.timeout(timeout),
    redirect: 'manual',
  });
  if (!res.ok) throw Error(`Fonte non disponibile (${res.status})`);
  const reader = res.body.getReader(),
    decoder = new TextDecoder();
  let value = '',
    size = 0;
  for (;;) {
    const { value: chunk, done } = await reader.read();
    if (done) break;
    size += chunk.length;
    if (size > 8000000) {
      await reader.cancel();
      throw Error('Risposta troppo grande');
    }
    value += decoder.decode(chunk, { stream: true });
  }
  value += decoder.decode();
  // Bound isolate memory as well as individual upstream responses.
  let bytes = 0;
  for (const e of cache.values()) bytes += e.value.length * 2;
  if (cache.size >= 100 || bytes + value.length * 2 > 16000000) cache.clear();
  cache.set(url, { at: now, value });
  return value;
}
export async function cartography(lat, lon, soil = false) {
  const layers = soil
    ? 'awc_available_water_capacity'
    : 'rt_ucs.iducs.10k.2019.rt.full,rt_ucs.idvegfor.rt,rt_ucs.idift.rt.all';
  const q = new URLSearchParams({
    map: soil ? 'owspedologia' : 'wmsucs',
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetFeatureInfo',
    LAYERS: layers,
    QUERY_LAYERS: layers,
    STYLES: '',
    SRS: 'EPSG:4326',
    BBOX: `${lon - 0.0005},${lat - 0.0005},${lon + 0.0005},${lat + 0.0005}`,
    WIDTH: 101,
    HEIGHT: 101,
    X: 50,
    Y: 50,
    INFO_FORMAT: 'text/gml',
    FEATURE_COUNT: 12,
  });
  const features = parseGml(await upstream((soil ? SOIL : WMS) + '?' + q, 86400)).filter((f) =>
    contains(f, lat, lon),
  );
  if (soil) for (const f of features) f.geometry = null;
  return { features, retrievedAt: Date.now() / 1000, source: 'Regione Toscana', status: 'ok' };
}
export async function terrain(lat, lon) {
  const dy = 90 / 111320,
    dx = dy / Math.cos((lat * Math.PI) / 180),
    pts = [
      [lat, lon],
      [lat + dy, lon],
      [lat - dy, lon],
      [lat, lon + dx],
      [lat, lon - dx],
    ];
  const q = new URLSearchParams({
    latitude: pts.map((p) => p[0]).join(','),
    longitude: pts.map((p) => p[1]).join(','),
  });
  const result = JSON.parse(
    await upstream('https://api.open-meteo.com/v1/elevation?' + q, 86400),
  ).elevation;
  if (!Array.isArray(result) || result.length !== 5 || !result.every(Number.isFinite))
    throw Error('Quota incompleta');
  const [c, n, s, e, w] = result,
    gx = (e - w) / 180,
    gy = (n - s) / 180,
    slope = (Math.atan(Math.hypot(gx, gy)) * 180) / Math.PI,
    aspect = slope >= 2 ? ((Math.atan2(-gx, -gy) * 180) / Math.PI + 360) % 360 : null;
  return {
    elevation: c,
    slope: round(slope, 1),
    aspect: aspect === null ? null : Math.round(aspect),
    resolution: 90,
    source: 'Copernicus DEM GLO-90 / Open-Meteo',
    status: 'ok',
  };
}
export async function weather(lat, lon) {
  const q = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    timezone: 'Europe/Rome',
    past_days: 30,
    forecast_days: 7,
    daily:
      'weather_code,precipitation_sum,temperature_2m_mean,temperature_2m_min,temperature_2m_max,wind_speed_10m_max,et0_fao_evapotranspiration',
    hourly:
      'soil_temperature_6cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,relative_humidity_2m,vapour_pressure_deficit',
  });
  const r = JSON.parse(await upstream('https://api.open-meteo.com/v1/forecast?' + q));
  if (!r.daily) throw Error('Meteo incompleto');
  return { ...r, retrievedAt: Date.now() / 1000, status: 'ok' };
}
const safe = async (fn) => {
  try {
    return await fn();
  } catch (error) {
    return { status: 'unavailable', error: String(error?.message ?? error).slice(0, 180) };
  }
};
const distanceKm = (a, b) => {
  const p = Math.PI / 180,
    dLat = (b.lat - a.lat) * p,
    dLon = (b.lon - a.lon) * p,
    x =
      Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};
function bounds(lat, lon, radius) {
  const dy = radius / 111.32,
    dx = radius / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [lat - dy, lon - dx, lat + dy, lon + dx];
}
export async function overpassContext(lat, lon, radius) {
  const box = bounds(lat, lon, radius)
      .map((v) => v.toFixed(5))
      .join(','),
    query = `[out:json][timeout:20];(rel["type"="route"]["route"="hiking"](${box});nwr["leisure"="nature_reserve"](${box});nwr["boundary"="protected_area"](${box}););out tags center 140;`;
  let raw, lastError;
  for (const endpoint of [
    'https://overpass-api.de/api/interpreter?',
    'https://overpass.kumi.systems/api/interpreter?',
  ]) {
    try {
      raw = JSON.parse(await upstream(endpoint + new URLSearchParams({ data: query }), 3600, 8000));
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!raw) throw lastError;
  const trails = [],
    nature = [],
    seenTrails = new Set(),
    seenNature = new Set();
  for (const e of raw.elements ?? []) {
    const c = e.center ?? (e.lat != null ? { lat: e.lat, lon: e.lon } : null);
    if (!c || ![c.lat, c.lon].every(Number.isFinite)) continue;
    const distance = distanceKm({ lat, lon }, c);
    if (distance > radius) continue;
    const tags = e.tags ?? {},
      url = `https://www.openstreetmap.org/${e.type}/${e.id}`;
    if (tags.route === 'hiking') {
      const key = `${e.type}/${e.id}`;
      if (seenTrails.has(key)) continue;
      seenTrails.add(key);
      const name = tags.name ?? (tags.ref ? `Sentiero ${tags.ref}` : 'Itinerario escursionistico');
      trails.push({
        id: key,
        name,
        ref: tags.ref ?? null,
        operator: tags.operator ?? null,
        difficulty: tags.sac_scale ?? null,
        surface: tags.surface ?? null,
        lat: round(c.lat, 6),
        lon: round(c.lon, 6),
        distanceKm: round(distance, 2),
        url,
      });
    } else if (tags.name) {
      const key = tags.name.toLocaleLowerCase('it');
      if (seenNature.has(key)) continue;
      seenNature.add(key);
      nature.push({
        id: `${e.type}/${e.id}`,
        name: tags.name,
        kind: tags.leisure === 'nature_reserve' ? 'Riserva naturale' : 'Area protetta',
        protectClass: tags.protect_class ?? null,
        lat: round(c.lat, 6),
        lon: round(c.lon, 6),
        distanceKm: round(distance, 2),
        url,
      });
    }
  }
  trails.sort((a, b) => a.distanceKm - b.distanceKm);
  nature.sort((a, b) => a.distanceKm - b.distanceKm);
  return {
    trails: trails.slice(0, 40),
    nature: nature.slice(0, 30),
    status: 'ok',
    source: 'OpenStreetMap / Overpass',
  };
}
export async function floraContext(lat, lon, radius) {
  const [south, west, north, east] = bounds(lat, lon, radius),
    year = Number(
      new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Europe/Rome' }).format(
        new Date(),
      ),
    ),
    q = new URLSearchParams({
      taxon_key: '6',
      has_coordinate: 'true',
      occurrence_status: 'present',
      decimal_latitude: `${south.toFixed(5)},${north.toFixed(5)}`,
      decimal_longitude: `${west.toFixed(5)},${east.toFixed(5)}`,
      year: `${year - 5},${year}`,
      limit: '300',
    });
  const raw = JSON.parse(await upstream('https://api.gbif.org/v1/occurrence/search?' + q, 1800)),
    bySpecies = new Map();
  for (const e of raw.results ?? []) {
    const la = e.decimalLatitude,
      lo = e.decimalLongitude,
      name = e.species ?? e.scientificName,
      key = e.speciesKey ?? name;
    if (![la, lo].every(Number.isFinite) || !name || !key) continue;
    const distance = distanceKm({ lat, lon }, { lat: la, lon: lo });
    if (distance > radius) continue;
    const item = {
        id: String(e.key),
        scientificName: name,
        family: e.family ?? null,
        eventDate: e.eventDate?.slice(0, 10) ?? null,
        year: e.year ?? null,
        lat: round(la, 6),
        lon: round(lo, 6),
        distanceKm: round(distance, 2),
        uncertaintyMeters: e.coordinateUncertaintyInMeters ?? null,
        basisOfRecord: e.basisOfRecord ?? null,
        url: `https://www.gbif.org/occurrence/${e.key}`,
      },
      old = bySpecies.get(key);
    if (!old || item.distanceKm < old.distanceKm) bySpecies.set(key, item);
  }
  const flora = [...bySpecies.values()].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 35);
  return {
    flora,
    floraSpeciesCount: bySpecies.size,
    floraSampleSize: (raw.results ?? []).length,
    status: 'ok',
    source: 'GBIF Occurrence',
  };
}
function outdoorScore(rain, tmax, wind) {
  if (![rain, tmax, wind].every(Number.isFinite)) return null;
  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        100 -
          Math.min(45, rain * 9) -
          Math.max(0, wind - 18) * 1.8 -
          Math.max(0, 8 - tmax) * 5 -
          Math.max(0, tmax - 30) * 4,
      ),
    ),
  );
}
export async function aroundContext(lat, lon, radius) {
  const [osm, flora, w] = await Promise.all([
    safe(() => overpassContext(lat, lon, radius)),
    safe(() => floraContext(lat, lon, radius)),
    safe(() => weather(lat, lon)),
  ]);
  let daily = null;
  if (w.status === 'ok' && w.daily) {
    const d = w.daily,
      today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date()),
      start = Math.max(0, d.time.indexOf(today)),
      end = start + 7,
      keys = [
        'time',
        'precipitation_sum',
        'temperature_2m_min',
        'temperature_2m_max',
        'wind_speed_10m_max',
        'weather_code',
      ];
    daily = Object.fromEntries(keys.map((k) => [k, (d[k] ?? []).slice(start, end)]));
    daily.outdoor_score = daily.time.map((_, i) =>
      outdoorScore(
        daily.precipitation_sum[i],
        daily.temperature_2m_max[i],
        daily.wind_speed_10m_max[i],
      ),
    );
  }
  return {
    lat,
    lon,
    radiusKm: radius,
    trails: osm.trails ?? [],
    nature: osm.nature ?? [],
    flora: flora.flora ?? [],
    floraSpeciesCount: flora.floraSpeciesCount ?? 0,
    floraSampleSize: flora.floraSampleSize ?? 0,
    weather: daily ? { daily, status: 'ok' } : { status: 'unavailable' },
    sources: { trails: osm.status, flora: flora.status, weather: w.status },
    retrievedAt: Date.now() / 1000,
  };
}
export async function environment(lat, lon, withWeather = true) {
  const jobs = {
    forest: () => cartography(lat, lon),
    soil: () => cartography(lat, lon, true),
    terrain: () => terrain(lat, lon),
  };
  if (withWeather) jobs.weather = () => weather(lat, lon);
  return {
    lat,
    lon,
    ...Object.fromEntries(
      await Promise.all(Object.entries(jobs).map(async ([k, fn]) => [k, await safe(fn)])),
    ),
  };
}
export async function handle(request, assets) {
  const url = new URL(request.url),
    headers = {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
  const response = (body, status = 200, type = 'text/plain; charset=utf-8') =>
    new Response(request.method === 'HEAD' ? null : body, {
      status,
      headers: { ...headers, 'Content-Type': type },
    });
  // The Sites dispatcher authenticates visitors and enforces the owner + one viewer policy
  // before any Worker or static resource is served. No app-owned login or public route.
  if (!['GET', 'HEAD'].includes(request.method)) return response('Metodo non consentito', 405);
  if (url.pathname.startsWith('/api/')) {
    if (!['/api/environment', '/api/land', '/api/around'].includes(url.pathname))
      return response('Non trovato', 404);
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return response('Accesso negato', 403);
    const q = url.searchParams,
      lat = Number(q.get('lat')),
      lon = Number(q.get('lon'));
    if (
      !q.has('lat') ||
      !q.has('lon') ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < 42.35 ||
      lat > 43.25 ||
      lon < 10.55 ||
      lon > 11.85
    )
      return response('Coordinate non valide', 400);
    if (request.method === 'HEAD') return response('', 200, 'application/json');
    const a = round(lat, 5),
      o = round(lon, 5);
    if (url.pathname === '/api/around') {
      const radius = Number(q.get('radius') ?? 25);
      if (![5, 10, 25, 50].includes(radius)) return response('Raggio non valido', 400);
      return response(
        JSON.stringify(await aroundContext(a, o, radius)),
        200,
        'application/json; charset=utf-8',
      );
    }
    return response(
      JSON.stringify(await environment(a, o, url.pathname === '/api/environment')),
      200,
      'application/json; charset=utf-8',
    );
  }
  const asset = assets[url.pathname === '/' ? '/index.html' : url.pathname];
  if (!asset) return response('Non trovato', 404);
  const binary = Uint8Array.from(atob(asset.data), (c) => c.charCodeAt(0));
  return response(binary, 200, asset.type);
}
