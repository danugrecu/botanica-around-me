/**
 * Controller principale dell'interfaccia.
 *
 * Collega navigazione, mappa Leaflet, analisi puntuale, confronto 3x3 e diario.
 * Le previsioni automatiche sono in forecast.mjs; trekking, flora e natura in around.mjs;
 * il calcolo micologico in ecology.mjs. Vedi ARCHITETTURA.md prima di modificare il flusso.
 */
import { percent } from '../shared/display.mjs';
import { setupForecast } from '../forecast/forecast.mjs';
import { setupAround } from '../around/around.mjs';
import { fetchBrowserWeather } from '../clients/weather.mjs';
import { zones, today, level, profiles, habitat, predict, num, hourlySummary } from '../ecology/ecology.mjs';
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
const fmt = (s, o = { day: 'numeric', month: 'short' }) =>
    new Date(s + 'T12:00:00').toLocaleDateString('it-IT', o),
  v = (x, n = 1) => (num(x) === null ? '—' : Number(x).toFixed(n));
const days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(today() + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
});
let species = 'porcini',
  date = today(),
  host = 'auto',
  env = null,
  point = { lat: 42.925, lon: 11.115, name: 'Monti Leoni · centro Maremma' },
  map,
  pointMarker,
  polygon,
  forecastAreas,
  nearLayer,
  gpsLayer,
  radiusLayer,
  request = 0,
  scanRequest = 0,
  controller = null,
  nearby = [],
  busy = false;
let aroundCenter = { lat: 42.82, lon: 11.13, name: 'Centro Maremma' },
  radiusKm = 25,
  forecastUI = null,
  aroundUI = null;
const limits = { south: 42.3, north: 43.25, west: 10.45, east: 11.9 },
  insideMaremma = (lat, lon) =>
    lat >= limits.south && lat <= limits.north && lon >= limits.west && lon <= limits.east;
const classFor = (n) => (n == null ? '' : n >= 70 ? 'good' : n >= 45 ? 'mid' : 'low');
const distanceKm = (a, b) => {
  const p = Math.PI / 180,
    dLat = (b.lat - a.lat) * p,
    dLon = (b.lon - a.lon) * p,
    x =
      Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};
const direction = (a, b) => {
  const p = Math.PI / 180,
    y = Math.sin((b.lon - a.lon) * p) * Math.cos(b.lat * p),
    x =
      Math.cos(a.lat * p) * Math.sin(b.lat * p) -
      Math.sin(a.lat * p) * Math.cos(b.lat * p) * Math.cos((b.lon - a.lon) * p),
    d = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ovest', 'ovest', 'nord-ovest'][
    Math.round(d / 45) % 8
  ];
};
$('#day').innerHTML = days
  .map(
    (d, i) =>
      `<option value="${d}">${i === 0 ? 'Oggi · ' : ''}${fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })}</option>`,
  )
  .join('');
$('#logspecies').innerHTML = $('#species').innerHTML;
$('#logdate').value = today();
$('#logdate').max = today();
$('#zones').innerHTML = zones
  .map(
    (z) =>
      `<button class="zone" data-zone="${z.id}"><span class="zone-info"><span class="zone-name">${z.name}</span><span class="zone-sub">${z.area} · apri la zona</span></span><span>›</span></button>`,
  )
  .join('');
$('#species-guide').innerHTML = Object.entries(profiles)
  .map(
    ([k, p]) =>
      `<details><summary>${p.name}</summary><p>${p.description}</p><p class="forecast-note">Intervallo termico di lavoro: ${p.temp.join('–')} °C. Mesi nel prototipo: ${p.months.join(', ')}. Da calibrare.</p></details>`,
  )
  .join('');
function showView(name) {
  document.querySelectorAll('.view').forEach((v) => (v.hidden = v.id !== name));
  document
    .querySelectorAll('[data-view]')
    .forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  if (name === 'explore' && map) setTimeout(() => map.invalidateSize(), 0);
  if (name === 'diary') {
    stageLog();
    renderLogs();
  }
}
document
  .querySelectorAll('[data-view]')
  .forEach((b) => (b.onclick = () => showView(b.dataset.view)));
function resetNearby() {
  scanRequest++;
  nearby = [];
  $('#nearby').hidden = true;
  if (nearLayer) nearLayer.clearLayers();
}
async function selectPoint(lat, lon, name = 'Punto nel bosco') {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !insideMaremma(lat, lon)) {
    $('#geo-status').textContent =
      'Questo punto è fuori dall’area territoriale coperta dalla versione Maremma.';
    return;
  }
  point = { lat: Number(lat.toFixed(5)), lon: Number(lon.toFixed(5)), name };
  env = null;
  host = 'auto';
  $('#host').value = 'auto';
  resetNearby();
  controller?.abort();
  controller = new AbortController();
  const id = ++request;
  busy = true;
  $('#refresh').disabled = true;
  $('#scan').disabled = true;
  $('#lat').value = point.lat;
  $('#lon').value = point.lon;
  $('#point-label').textContent = `${name} · ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`;
  $('#status').className = 'status';
  $('#status').textContent = 'Interrogo bosco, pedologia, rilievo e meteo del punto…';
  $('#detail').innerHTML = '<p>Analisi delle quattro fonti in corso…</p>';
  $('#evidence-content').innerHTML = '';
  if (polygon) polygon.clearLayers();
  if (map) {
    pointMarker.setLatLng([lat, lon]);
    map.panTo([lat, lon]);
  }
  try {
    const r = await fetch(`/api/environment?lat=${lat}&lon=${lon}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(65000)]),
    });
    if (!r.ok) throw Error('Analisi non disponibile');
    const result = await r.json();
    if (result.weather?.status !== 'ok')
      try {
        result.weather = await fetchBrowserWeather(lat, lon);
      } catch {}
    if (id !== request) return;
    env = result;
    const good = ['forest', 'soil', 'terrain', 'weather'].filter((k) => env[k]?.status === 'ok');
    $('#status').textContent =
      `${good.length}/4 fonti raggiunte · ${new Date().toLocaleString('it-IT')} · modello sperimentale v2`;
    if (good.length < 4) $('#status').className = 'status error';
    render();
    drawPolygon();
  } catch (e) {
    if (id !== request || e.name === 'AbortError') return;
    $('#status').className = 'status error';
    $('#status').textContent =
      'Analisi non disponibile. Controlla la connessione e riprova con Aggiorna punto.';
    $('#detail').innerHTML =
      '<p>Nessun indice calcolato senza le fonti. Mappa e diario restano utilizzabili.</p>';
  } finally {
    if (id === request) {
      busy = false;
      $('#refresh').disabled = false;
      $('#scan').disabled = !env;
    }
  }
}
function drawPolygon() {
  if (!polygon || !env) return;
  polygon.clearLayers();
  const f = habitat(env).land;
  if (f?.geometry) polygon.addData({ type: 'Feature', geometry: f.geometry, properties: {} });
}
function metric(label, value, unit = '', detail = '') {
  return `<div class="metric"><strong>${value}<small> ${unit}</small></strong><span>${label}</span>${detail ? `<small class="metric-note">${detail}</small>` : ''}</div>`;
}
function render() {
  document
    .querySelectorAll('[name="main-species"]')
    .forEach((r) => (r.checked = r.value === (species === 'cucchi' ? 'cucchi' : 'porcini')));
  window.dispatchEvent(new Event('forecast-filter'));
  if (!env) return;
  const r = predict(env, date, species, host),
    h = r.habitat,
    m = r.metrics ?? {},
    t = env.terrain ?? {};
  const weekly = days.map((d) => predict(env, d, species, host));
  let best = -1;
  weekly.forEach((a, i) => {
    if (a.score !== null && (best < 0 || a.score > weekly[best].score)) best = i;
  });
  let start = best,
    end = best;
  if (best >= 0 && weekly[best].score >= 70) {
    while (start > 0 && weekly[start - 1].score >= 70) start--;
    while (end < 6 && weekly[end + 1].score >= 70) end++;
  }
  const window =
    best < 0
      ? 'Nessuna finestra stimabile'
      : weekly[best].score >= 70
        ? `Finestra indicativa: ${fmt(days[start])}${end > start ? ' – ' + fmt(days[end]) : ''}`
        : `Nessuna finestra con condizioni favorevoli ≥70%`;
  const sub =
    best < 0
      ? r.reason
      : weekly[best].score >= 70
        ? 'Condizioni compatibili, non una segnalazione di funghi.'
        : `Giorno relativamente migliore: ${fmt(days[best])} · ${weekly[best].score}%.`;
  $('#detail').innerHTML =
    `<div><p class="eyebrow">${h.scenario ? 'SCENARIO MANUALE' : 'PUNTO INTERROGATO'} / ${esc(r.profile.latin)}</p><div class="detail-title"><h2>${esc(h.label)}</h2><span class="score ${classFor(r.score)}">${percent(r.score)}</span></div><p class="habitat">${esc(h.source)}<br>${v(t.elevation, 0)} m · pendenza ${v(t.slope, 0)}° · esposizione ${aspect(t.aspect)}</p><p class="forecast-note">${r.score === null ? esc(r.reason) : `${level(r.score)} · ${r.score}% di condizioni favorevoli.`} ${esc(r.uncertainty ?? '')}</p><div class="metrics">${metric('Pioggia nei 14 giorni prima', v(m.rain14), 'mm')}${metric('Temperatura suolo · 6 cm', v(m.soilT), '°C', 'Media 3 giorni · modellata')}${metric('Umidità suolo · 3–9 cm', v(m.shallow, 3), 'm³/m³', 'Media 3 giorni · modellata')}</div><div class="window"><strong>${window}</strong>${esc(sub ?? '')}</div><div class="reasons">${r.reasons.map((s) => `<p>${esc(s)}</p>`).join('')}</div></div><div><div class="list-heading"><h2>I prossimi 7 giorni</h2><span>CONDIZIONI FAVOREVOLI</span></div><div class="week">${days.map((d, i) => `<button class="day ${date === d ? 'current' : ''}" data-day="${d}" aria-pressed="${date === d}" aria-label="${fmt(d)} indice ${percent(weekly[i].score)}"><span>${i === 0 ? 'Oggi' : fmt(d, { weekday: 'short' })}</span><span>${fmt(d)}</span><strong>${percent(weekly[i].score)}</strong><div class="bar"><i style="width:${weekly[i].score ?? 0}%"></i></div><small>${v(env.weather?.daily?.precipitation_sum?.[env.weather.daily.time.indexOf(d)])} mm</small></button>`).join('')}</div><p class="forecast-note">La pioggia sotto il giorno è quella prevista in quella data. L’incertezza cresce con l’orizzonte; non è un intervallo statistico di confidenza.</p><div class="factors">${r.factors.map((f) => `<div><span>${f.name} <small>${f.weight}% del modello</small></span><div class="bar"><i style="width:${(f.value ?? 0) * 100}%"></i></div><strong>${f.value === null ? 'n.d.' : Math.round(f.value * 100)}</strong></div>`).join('')}</div><button class="outline" id="record">+ Registra un’uscita in questo punto</button></div>`;
  document.querySelectorAll('[data-day]').forEach(
    (b) =>
      (b.onclick = () => {
        date = b.dataset.day;
        $('#day').value = date;
        render();
        renderNearby();
      }),
  );
  $('#record').onclick = () => {
    stageLog();
    showView('diary');
  };
  $('#scenario-status').textContent =
    host === 'auto'
      ? 'Si usano solo le informazioni disponibili nelle carte.'
      : 'Scenario attivo: il tipo di bosco è una tua ipotesi, non una verifica del modello.';
  const variants = Object.keys(profiles).map((s) => predict(env, date, s, host));
  const soil = env.soil?.features?.[0]?.properties;
  const grid =
    env.weather?.latitude != null
      ? `${v(env.weather.latitude, 4)}, ${v(env.weather.longitude, 4)}`
      : 'non disponibile';
  $('#evidence-content').innerHTML =
    `<div class="list-heading"><h2>Perché questo punto</h2><span>FONTI E LIMITI</span></div><div class="species-comparison">${variants.map((a) => `<button class="variant ${species === a.species ? 'chosen' : ''}" data-species="${a.species}"><span>${a.profile.name}</span><strong>${percent(a.score)}</strong><small>${a.profile.latin}</small></button>`).join('')}</div><div class="evidence-grid"><div><h3>Pioggia e asciugatura</h3><dl>${row('Pioggia · 7 / 14 / 30 giorni', `${v(m.rain7)} / ${v(m.rain14)} / ${v(m.rain30)} mm`)}${row('Bilancio P − ET₀ · 14 giorni', `${v(m.balance)} mm`)}${row('Giorni asciutti consecutivi', v(m.dry, 0))}${row('Ultimo impulso ≥10 mm in 3 giorni', m.pulse == null ? 'Non rilevato / dati assenti' : `${m.pulse} giorni prima`)}${row('Vento · media massime 3 giorni', `${v(m.wind)} km/h`)}${row('Umidità aria / deficit di vapore', `${v(m.rh, 0)}% / ${v(m.vpd)} kPa`)}</dl></div><div><h3>Suolo e rilievo</h3><dl>${row('Umidità · 9–27 cm', `${v(m.deep, 3)} m³/m³`)}${row('Riserva idrica AWC cartografica', `${v(m.awc, 0)} mm`)}${row('Sabbia / limo / argilla', `${v(m.sand, 0)} / ${v(soil?.lim, 0)} / ${v(m.clay, 0)} %`)}${row('Unità pedologica', esc(soil?.nome_uc ?? 'Non disponibile'))}${row('Quota / pendenza', `${v(t.elevation, 0)} m / ${v(t.slope, 1)}°`)}${row('Esposizione del versante', aspect(t.aspect))}</dl><p class="forecast-note">Rilievo da Copernicus DEM 90 m. AWC descrive la capacità del suolo, non quanta acqua contiene oggi. Tessitura: contesto, non fattore indipendente aggiunto.</p></div><div><h3>Qualità dell’informazione</h3><dl>${row('Bosco', env.forest?.status === 'ok' ? 'Carta interrogata' : 'Non disponibile')}${row('Pedologia', soil ? 'Unità cartografica trovata' : 'Non disponibile nel punto')}${row('Cella meteo restituita', grid)}${row('Meteo acquisito', env.weather?.retrievedAt ? new Date(env.weather.retrievedAt * 1000).toLocaleString('it-IT') : 'Non disponibile')}</dl><p class="forecast-note">Meteo dell’ordine dei chilometri: la cella non indica la risoluzione di ogni variabile. Nessun sensore nel sottobosco.</p><p class="forecast-note"><strong>Dati mancanti:</strong> ${esc([...r.missing, 'pH locale', 'micelio presente', 'copertura e gestione attuali del bosco'].join(', '))}.</p></div></div>${rainChart(env.weather)}<p class="forecast-note">Fonti: <a href="https://www502.regione.toscana.it/geoscopio/servizi/wms/USO_E_COPERTURA_DEL_SUOLO.htm" target="_blank" rel="noopener">Regione Toscana · boschi</a> · <a href="https://www502.regione.toscana.it/geoscopio/servizi/wms/PEDOLOGIA.htm" target="_blank" rel="noopener">pedologia</a> · <a href="https://open-meteo.com/en/docs" target="_blank" rel="noopener">Open-Meteo</a>.</p>`;
  document.querySelectorAll('[data-species]').forEach(
    (b) =>
      (b.onclick = () => {
        species = b.dataset.species;
        $('#species').value = species;
        render();
        renderNearby();
      }),
  );
}
function row(a, b) {
  return `<div><dt>${a}</dt><dd>${b}</dd></div>`;
}
function aspect(n) {
  return num(n) === null
    ? 'piano / n.d.'
    : `${['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(n / 45) % 8]} · ${n}°`;
}
function rainChart(w) {
  if (!w?.daily) return '';
  const d = w.daily;
  const max = Math.max(5, ...d.precipitation_sum.filter((n) => num(n) !== null));
  const bars = d.time
    .map((t, i) => {
      const n = d.precipitation_sum[i],
        height = num(n) === null ? 0 : (n / max) * 75;
      return `<rect x="${i * 19 + 30}" y="${95 - height}" width="12" height="${height}" fill="${t < today() ? '#5c866e' : '#adbd68'}"><title>${t}: ${v(n)} mm</title></rect>`;
    })
    .join('');
  return `<div class="rain-history"><h3>La sequenza delle piogge</h3><svg viewBox="0 0 750 122" role="img" aria-label="Pioggia giornaliera nei 30 giorni precedenti e nei 7 futuri"><text x="0" y="15" font-size="12" fill="#63716c">${max.toFixed(0)} mm</text>${bars}<line x1="30" x2="738" y1="96" y2="96" stroke="#bccbbd"/><line x1="595" x2="595" y1="10" y2="99" stroke="#294e40" stroke-dasharray="3 3"/><text x="30" y="117" font-size="12">${fmt(d.time[0])}</text><text x="597" y="117" font-size="12">Oggi → previsioni</text></svg><p class="forecast-note">Verde scuro: dati modellistici passati. Verde chiaro: previsioni. Non sono misure di un pluviometro nel bosco.</p></div>`;
}
async function scan() {
  if (!env || busy) return;
  const original = { ...point },
    weather = env.weather,
    id = ++scanRequest;
  nearby = [];
  $('#nearby').hidden = false;
  $('#nearby').innerHTML =
    '<div class="card">Interrogo 9 punti distanziati di circa 500 m. Il confronto può richiedere circa un minuto…</div>';
  $('#scan').disabled = true;
  const todo = [];
  for (let y = -1; y <= 1; y++)
    for (let x = -1; x <= 1; x++)
      todo.push({
        lat: original.lat + (y * 500) / 111320,
        lon: original.lon + (x * 500) / (111320 * Math.cos((original.lat * Math.PI) / 180)),
        name:
          y === 0 && x === 0
            ? 'Centro'
            : `${y > 0 ? 'Nord' : y < 0 ? 'Sud' : ''}${x > 0 ? ' est' : x < 0 ? ' ovest' : ''}`,
      });
  let next = 0;
  async function worker() {
    while (next < todo.length && id === scanRequest) {
      const p = todo[next++];
      try {
        let e;
        if (p.name === 'Centro') e = env;
        else {
          const res = await fetch(`/api/land?lat=${p.lat}&lon=${p.lon}`, {
            signal: AbortSignal.timeout(90000),
          });
          if (!res.ok) throw Error();
          e = await res.json();
          e.weather = weather;
        }
        if (id !== scanRequest) return;
        nearby.push({ ...p, env: e });
        renderNearby();
      } catch {
        if (id === scanRequest) {
          nearby.push({ ...p, env: {}, failed: true });
          renderNearby();
        }
      }
    }
  }
  await Promise.all([worker(), worker()]);
  if (id === scanRequest) {
    $('#scan').disabled = false;
    renderNearby();
  }
}
function renderNearby() {
  if (!nearby.length) return;
  $('#nearby').hidden = false;
  const sorted = nearby
    .map((p) => ({ ...p, result: predict(p.env, date, species, 'auto') }))
    .sort((a, b) => (b.result.score ?? -1) - (a.result.score ?? -1));
  $('#nearby').innerHTML =
    `<div class="card"><div class="list-heading"><h2>Confronto dei punti vicini</h2><span>${nearby.length}/9 ANALIZZATI</span></div><p class="forecast-note">Passo circa 500 m · stesso meteo centrale, bosco, suolo e rilievo propri di ogni punto. Nessuna interpolazione meteo a 500 m. Scenario manuale escluso dal confronto. Seleziona un punto per caricarne il meteo.</p><div class="nearby-grid">${sorted.map((p, i) => `<button class="nearpoint" data-near="${i}"><span class="score ${classFor(p.result.score)}">${percent(p.result.score)}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.failed ? 'Fonte non raggiungibile' : p.result.habitat.label)}</small><small>${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</small></span></button>`).join('')}</div></div>`;
  document.querySelectorAll('[data-near]').forEach(
    (b) =>
      (b.onclick = () => {
        const p = sorted[Number(b.dataset.near)];
        selectPoint(p.lat, p.lon, p.name);
      }),
  );
  if (nearLayer) {
    nearLayer.clearLayers();
    sorted.forEach((p) =>
      L.circleMarker([p.lat, p.lon], {
        radius: 9,
        color: '#fff',
        weight: 2,
        fillColor:
          p.result.score == null
            ? '#888'
            : p.result.score >= 70
              ? '#416c42'
              : p.result.score >= 45
                ? '#b99039'
                : '#8c8371',
        fillOpacity: 1,
      })
        .addTo(nearLayer)
        .bindTooltip(`${esc(p.name)} · ${percent(p.result.score)}`)
        .on('click', () => selectPoint(p.lat, p.lon, p.name)),
    );
  }
}
function updateRadiusView(fit = false) {
  if (!map || !radiusLayer) return;
  radiusLayer.setLatLng([aroundCenter.lat, aroundCenter.lon]).setRadius(radiusKm * 1000);
  $('#map-context').textContent = `${aroundCenter.name} · raggio ${radiusKm} km`;
  if (fit) {
    map.fitBounds(radiusLayer.getBounds(), { padding: [20, 20], maxZoom: 12 });
    forecastUI?.refreshVisible?.();
  }
  forecastUI?.render();
  aroundUI?.refresh();
}
function setAroundCenter(lat, lon, name = 'Punto scelto') {
  aroundCenter = { lat, lon, name };
  updateRadiusView(true);
}
$('#scan').onclick = scan;
$('#refresh').onclick = () => selectPoint(point.lat, point.lon, point.name);
$('#species').onchange = () => {
  species = $('#species').value;
  render();
  renderNearby();
};
$('#day').onchange = () => {
  date = $('#day').value;
  render();
  renderNearby();
};
$('#host').onchange = () => {
  host = $('#host').value;
  render();
};
$('#coordinates').onsubmit = (e) => {
  e.preventDefault();
  if (map) map.setZoom(14);
  selectPoint(Number($('#lat').value), Number($('#lon').value));
};
$('#set-area-center').onclick = () => setAroundCenter(point.lat, point.lon, point.name);
document.querySelectorAll('[name="radius"]').forEach(
  (r) =>
    (r.onchange = () => {
      radiusKm = Number(r.value);
      updateRadiusView(true);
    }),
);
document.querySelectorAll('[data-zone]').forEach(
  (b) =>
    (b.onclick = () => {
      const z = zones.find((z) => z.id === b.dataset.zone);
      if (map) map.setZoom(13);
      selectPoint(z.lat, z.lon, z.name);
    }),
);
$('#copycoords').onclick = async () => {
  try {
    await navigator.clipboard.writeText(`${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`);
    $('#geo-status').textContent = 'Coordinate copiate.';
  } catch {
    $('#geo-status').textContent =
      `Copia queste coordinate: ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`;
  }
};
$('#locate').onclick = () => {
  if (!navigator.geolocation) {
    $('#geo-status').textContent = 'Geolocalizzazione non disponibile: usa mappa o coordinate.';
    return;
  }
  $('#locate').disabled = true;
  $('#geo-status').textContent = 'Richiesta della posizione al dispositivo…';
  navigator.geolocation.getCurrentPosition(
    (p) => {
      $('#locate').disabled = false;
      const { latitude: lat, longitude: lon, accuracy } = p.coords;
      $('#geo-status').textContent =
        `Precisione dichiarata dal dispositivo: circa ±${Math.round(accuracy)} m. Non è la precisione della previsione.`;
      if (map && insideMaremma(lat, lon)) {
        if (gpsLayer) map.removeLayer(gpsLayer);
        gpsLayer = L.circle([lat, lon], {
          radius: accuracy,
          color: '#5074a1',
          fillOpacity: 0.08,
        }).addTo(map);
        setAroundCenter(lat, lon, 'La mia posizione');
      }
      selectPoint(lat, lon, 'La mia posizione');
    },
    (e) => {
      $('#locate').disabled = false;
      $('#geo-status').textContent =
        e.code === 1
          ? 'Posizione non autorizzata. Puoi scegliere il punto sulla mappa.'
          : 'Posizione non disponibile. Riprova all’aperto oppure inserisci le coordinate.';
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
  );
};
$('#locate-top').onclick = () => {
  $('#locate').click();
};
try {
  map = L.map('map', { zoomControl: false, scrollWheelZoom: true }).setView(
    [point.lat, point.lon],
    13,
  );
  L.control.zoom({ position: 'topright' }).addTo(map);
  const base = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);
  const forest = L.tileLayer.wms(
    'https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms?map=wmsucs',
    {
      layers: 'rt_ucs.iducs.10k.2019.rt.full',
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      opacity: 0.45,
      attribution: 'Regione Toscana · UCS 2019',
    },
  );
  const vegetation = L.tileLayer.wms(
    'https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms?map=wmsucs',
    {
      layers: 'rt_ucs.idvegfor.rt',
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      opacity: 0.5,
      attribution: 'Regione Toscana · vegetazione storica',
    },
  );
  L.control
    .layers(
      { OpenStreetMap: base },
      { 'Copertura del suolo · 2019': forest, 'Vegetazione · carta storica': vegetation },
      { position: 'bottomright' },
    )
    .addTo(map);
  radiusLayer = L.circle([aroundCenter.lat, aroundCenter.lon], {
    radius: radiusKm * 1000,
    color: '#61736c',
    weight: 2,
    dashArray: '7 7',
    fillColor: '#dce7da',
    fillOpacity: 0.05,
    interactive: false,
  }).addTo(map);
  forecastAreas = L.layerGroup().addTo(map);
  polygon = L.geoJSON(null, {
    style: { color: '#173c34', weight: 4, fillColor: '#dcec98', fillOpacity: 0.16 },
    interactive: false,
  }).addTo(map);
  nearLayer = L.layerGroup().addTo(map);
  pointMarker = L.circleMarker([point.lat, point.lon], {
    radius: 8,
    color: '#fff',
    weight: 3,
    fillColor: '#173c34',
    fillOpacity: 1,
  }).addTo(map);
  map.on('click', (e) => selectPoint(e.latlng.lat, e.latlng.lng));
  base.on('tileerror', () => {
    $('#geo-status').textContent = 'Sfondo cartografico non disponibile. Puoi usare le coordinate.';
  });
  for (const layer of [forest, vegetation])
    layer.on('tileerror', () => {
      $('#geo-status').textContent =
        'Questo strato regionale non è al momento disponibile. Le altre fonti restano interrogabili.';
    });
} catch {
  $('#map').textContent = 'Mappa non disponibile: inserisci le coordinate.';
}
let logs = [];
try {
  const saved = JSON.parse(localStorage.getItem('fungapp-logs-v1') || '[]');
  if (Array.isArray(saved)) logs = saved.filter((l) => l && /^\d{4}-\d{2}-\d{2}$/.test(l.date));
} catch {}
let logPoint = { ...point };
function stageLog() {
  logPoint = { ...point };
  $('#logname').value = point.name;
  $('#logpoint').textContent = `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`;
  $('#logspecies').value = species;
}
function renderLogs() {
  $('#logs').innerHTML = logs.length
    ? [...logs]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(
          (l) =>
            `<article class="card log"><h3>${esc(l.name ?? zones.find((z) => z.id === l.zone)?.name ?? 'Uscita')}</h3><small>${esc(fmt(l.date))} · ${esc(profiles[l.species]?.name ?? l.species)} · ${['Nessun ritrovamento', 'Qualche ritrovamento', 'Molti ritrovamenti'][l.result] ?? 'Esito non disponibile'}</small><p>${esc(l.notes)}</p><small>${l.lat != null ? `${v(l.lat, 5)}, ${v(l.lon, 5)} · ` : ''}${l.effort ? `${esc(l.effort)} minuti · ` : ''}${l.score != null ? `Indice salvato: ${esc(l.score)}% (${esc(l.model)})` : 'Nessun indice salvato'}${l.scenario ? ' · scenario manuale' : ''}</small></article>`,
        )
        .join('')
    : '<div class="empty"><h2>Confrontiamo la stima con il bosco.</h2><p>Registra anche le uscite senza ritrovamenti, indicando il tempo di ricerca.</p></div>';
}
$('#logform').onsubmit = (e) => {
  e.preventDefault();
  const d = $('#logdate').value;
  if (d > today()) return;
  const sp = $('#logspecies').value;
  const same = env && env.lat === logPoint.lat && env.lon === logPoint.lon;
  const r = d === today() && same ? predict(env, d, sp, host) : null;
  const entry = {
    name: $('#logname').value,
    lat: logPoint.lat,
    lon: logPoint.lon,
    date: d,
    species: sp,
    result: Number($('#logresult').value),
    notes: $('#lognotes').value,
    effort: $('#effort').value ? Number($('#effort').value) : null,
    score: r?.score ?? null,
    savedAt: new Date().toISOString(),
    weatherAt: env?.weather?.retrievedAt ?? null,
    model: r?.model ?? null,
    scenario: r?.habitat.scenario ?? false,
    snapshot: r
      ? {
          metrics: r.metrics,
          habitat: r.habitat.label,
          habitatSource: r.habitat.source,
          factors: r.factors,
          missing: r.missing,
          uncertainty: r.uncertainty,
        }
      : null,
  };
  try {
    localStorage.setItem('fungapp-logs-v1', JSON.stringify([...logs, entry]));
    logs.push(entry);
    $('#lognotes').value = '';
    $('#logstatus').textContent = 'Uscita salvata solo in questo browser.';
    renderLogs();
  } catch {
    $('#logstatus').textContent = 'Salvataggio non riuscito: conserva le note prima di chiudere.';
  }
};
function download(data, type, name) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#backup').onclick = () =>
  download(
    JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), logs }, null, 2),
    'application/json',
    'fungapp-diario-' + today() + '.json',
  );
$('#export').onclick = () => {
  if (!logs.length) {
    $('#logs').innerHTML = '<div class="empty">Nessuna uscita da esportare.</div>';
    return;
  }
  const quote = (v) =>
    '"' +
    String(v ?? '')
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
    ...logs.map((l) => [
      l.name ?? zones.find((z) => z.id === l.zone)?.name,
      l.lat,
      l.lon,
      l.date,
      l.species,
      l.result,
      l.effort,
      l.notes,
      l.score,
      l.model,
      l.scenario,
      l.savedAt,
    ]),
  ];
  download(
    '\uFEFF' + rows.map((r) => r.map(quote).join(';')).join('\r\n'),
    'text/csv;charset=utf-8',
    'fungapp-uscite-' + today() + '.csv',
  );
};
stageLog();
selectPoint(point.lat, point.lon, point.name);
const forecastMarkers = map ? L.layerGroup().addTo(map) : null;
if (map) map.setView([42.82, 11.13], 9);
// Keep markers stable while weather results and filters update.
const placeMarkers = new Map();
function updatePlaceLabels() {
  for (const { marker } of placeMarkers.values()) {
    marker.getTooltip().options.permanent = map.getZoom() >= 12;
    if (map.hasLayer(marker) && map.getZoom() >= 12) marker.openTooltip();
    else marker.closeTooltip();
  }
}
if (map) map.on('zoomend', updatePlaceLabels);
function focusPlace(lat, lon, name) {
  if (map) map.setView([lat, lon], 15);
  selectPoint(lat, lon, name);
  const entry = [...placeMarkers.values()].find(
    (e) => e.record.lat === lat && e.record.lon === lon,
  );
  entry?.marker.openPopup();
}
function placePopup(r) {
  const coords = `${r.lat.toFixed(5)}, ${r.lon.toFixed(5)}`;
  const url = `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=16/${r.lat}/${r.lon}`;
  const a = r.env ? predict(r.env, date, species) : null,
    m = a?.metrics ?? {},
    t = r.env?.terrain ?? {},
    land = a?.habitat;
  return `<div class="place-popup"><strong>${esc(r.locality ?? r.name)}</strong><p>${r.error ? 'Riferimento di zona · bosco da verificare' : esc(land?.label ?? r.landcover)}</p><div class="place-coordinates">${coords}</div>${r.nearbyReference ? `<p>Nei pressi di ${esc(r.nearbyReference)}. Il riferimento vicino non indica un ingresso al bosco.</p>` : ''}<p><strong>${percent(r.score)}</strong> · condizioni favorevoli per ${fmt(date)}</p>${a?.score != null ? `<dl><div><dt>Pioggia 14 giorni</dt><dd>${v(m.rain14)} mm</dd></div><div><dt>Suolo 3–9 cm</dt><dd>${v(m.shallow, 3)} m³/m³</dd></div><div><dt>Temperatura suolo</dt><dd>${v(m.soilT)} °C</dd></div><div><dt>Quota / pendenza</dt><dd>${v(t.elevation, 0)} m / ${v(t.slope, 1)}°</dd></div></dl>` : ''}<p class="place-note">${r.error ? esc(r.error) : 'Il riempimento segue il poligono di bosco UCS 2019 che contiene il punto campione. Non delimita una fungaia e non segnala un ritrovamento.'}</p><a href="${url}" target="_blank" rel="noopener">Apri queste coordinate ↗</a>${r.referenceUrl ? `<br><a href="${esc(r.referenceUrl)}" target="_blank" rel="noopener">Riferimento locale · OpenStreetMap ↗</a>` : ''}</div>`;
}
forecastUI = setupForecast({
  days,
  getSpecies: () => species,
  getDate: () => date,
  filterRecord: (r) => distanceKm(aroundCenter, r) <= radiusKm,
  selectPoint: focusPlace,
  onMarkers: (records) => {
    if (!forecastMarkers) return;
    const visible = new Set(records.map((r) => r.id));
    for (const [id, entry] of placeMarkers) {
      if (!visible.has(id) && forecastMarkers.hasLayer(entry.marker))
        forecastMarkers.removeLayer(entry.marker);
    }
    forecastAreas.clearLayers();
    for (const r of records) {
      const icon = L.divIcon({
        className: '',
        html: `<div class="marker ${classFor(r.score)}" style="width:48px;height:48px;background-color:${r.score == null ? '#e7ebe3' : ''}">${percent(r.score)}</div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });
      let entry = placeMarkers.get(r.id);
      if (!entry) {
        const marker = L.marker([r.lat, r.lon], {
          icon,
          alt: r.locality ?? r.name,
          bubblingMouseEvents: false,
        }).addTo(forecastMarkers);
        entry = { marker, record: r };
        placeMarkers.set(r.id, entry);
        marker
          .bindTooltip(esc(r.locality ?? r.name), {
            direction: 'bottom',
            offset: [0, 22],
            className: 'place-label',
          })
          .bindPopup(placePopup(r), { maxWidth: 290, offset: [0, -18] });
        marker.on('click', () => {
          const p = entry.record;
          focusPlace(p.lat, p.lon, p.locality ?? p.name);
        });
      } else {
        entry.record = r;
        entry.marker.setIcon(icon);
        entry.marker.setPopupContent(placePopup(r));
        if (!forecastMarkers.hasLayer(entry.marker)) forecastMarkers.addLayer(entry.marker);
      }
      const land = r.env ? habitat(r.env).land : null;
      if (land?.geometry) {
        const color =
          r.score == null
            ? '#7d8782'
            : r.score >= 70
              ? '#5f9049'
              : r.score >= 45
                ? '#c18e31'
                : '#8a7863';
        const area = L.geoJSON(
          { type: 'Feature', geometry: land.geometry, properties: {} },
          {
            style: {
              color,
              weight: 2,
              fillColor: color,
              fillOpacity: 0.24,
              className: 'forecast-area',
            },
            bubblingMouseEvents: false,
          },
        ).addTo(forecastAreas);
        area
          .bindTooltip(`${esc(r.locality ?? r.name)} · ${percent(r.score)}`)
          .bindPopup(placePopup(r), { maxWidth: 310 });
        area.on('click', () => focusPlace(r.lat, r.lon, r.locality ?? r.name));
      }
    }
    aroundUI?.setForecast(records);
    updatePlaceLabels();
  },
});
updateRadiusView(false);
aroundUI = setupAround({
  map,
  getCenter: () => aroundCenter,
  getRadius: () => radiusKm,
  getDate: () => date,
  forecastMarkers,
  forecastAreas,
});

if (document.modelContext?.registerTool) {
  const life = new AbortController();
  addEventListener('pagehide', () => life.abort(), { once: true });
  try {
    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: 'analyze_maremma_point',
          title: 'Analizza un punto in Maremma',
          description:
            'Interroga cartografia, terreno e meteo per un punto e aggiorna l’analisi visibile. Le coordinate vengono inviate ai fornitori dei dati. Non è una segnalazione di funghi.',
          inputSchema: {
            type: 'object',
            properties: {
              latitude: { type: 'number', minimum: 42.3, maximum: 43.25 },
              longitude: { type: 'number', minimum: 10.45, maximum: 11.9 },
              species: { type: 'string', enum: ['porcini', ...Object.keys(profiles)] },
            },
            required: ['latitude', 'longitude', 'species'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          async execute(i) {
            if (
              !i ||
              !Number.isFinite(i.latitude) ||
              !Number.isFinite(i.longitude) ||
              !insideMaremma(i.latitude, i.longitude) ||
              !['porcini', ...Object.keys(profiles)].includes(i.species)
            )
              throw Error('Parametri non validi');
            species = i.species;
            $('#species').value = species;
            showView('explore');
            await selectPoint(i.latitude, i.longitude);
            if (!env) throw Error('Fonti non disponibili');
            const r = predict(env, date, species);
            return {
              point,
              date,
              species,
              score: r.score,
              habitat: r.habitat.label,
              missing: r.missing,
              experimental: true,
            };
          },
        },
        { signal: life.signal },
      ),
    ).catch(() => {});
  } catch {}
}

// Primary species choices match the original compact forecast interface.
document.querySelectorAll('[name="main-species"]').forEach(
  (radio) =>
    (radio.onchange = () => {
      species = radio.value;
      $('#species').value = species;
      render();
      renderNearby();
    }),
);
