/**
 * Esperienza "Intorno a me": centro, raggio, trekking, flora, natura e meteo per uscire.
 * Riceve dal controller solo mappa e stato corrente; carica i dati da /api/around.
 */
import { fetchBrowserWeather, sevenDayWeather } from '../clients/weather.mjs';

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const fmtDate = (s) =>
  s
    ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'data non disponibile';
const distanceLabel = (n) =>
  Number.isFinite(n) ? `${n < 10 ? n.toFixed(1) : Math.round(n)} km` : 'distanza n.d.';
const distanceKm = (a, b) => {
  const p = Math.PI / 180,
    dLat = (b.lat - a.lat) * p,
    dLon = (b.lon - a.lon) * p,
    x =
      Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};
const weatherText = (w) => {
  if (!w) return 'Dati meteo non disponibili';
  const rain = w.precipitation ?? 0,
    wind = w.wind ?? 0,
    t = w.maxTemperature;
  return `${rain.toFixed(1)} mm · ${Number.isFinite(t) ? Math.round(t) + ' °C' : 'temperatura n.d.'} · vento ${Math.round(wind)} km/h`;
};
const weatherLevel = (w) =>
  !w
    ? 'Meteo non disponibile'
    : w.outdoorScore >= 75
      ? 'Meteo favorevole'
      : w.outdoorScore >= 50
        ? 'Meteo da valutare'
        : 'Meteo poco favorevole';

export function setupAround({
  map,
  getCenter,
  getRadius,
  getDate,
  forecastMarkers,
  forecastAreas,
}) {
  const $ = (s) => document.querySelector(s);
  let active = 'overview',
    data = null,
    forecast = [],
    request = 0,
    controller = null,
    catalogCache = null;
  const layers = { trekking: L.layerGroup(), flora: L.layerGroup(), natura: L.layerGroup() };
  const markerIndex = { trails: [], flora: [], nature: [] };
  const regional = 'https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms?map=wmsarprot';
  const regionalTrails =
    'https://www502.regione.toscana.it/ows_sentieristica/com.rt.wms.RTmap/wms?map=owssentieristica';
  const overlays = {
    trekking: L.layerGroup([
      L.tileLayer.wms(regional, {
        layers: 'rt_arprot.itnato.rt.trek',
        format: 'image/png',
        transparent: true,
        version: '1.1.1',
        opacity: 0.72,
        attribution: 'Regione Toscana · Itinerario Naturalistico Toscano',
      }),
      L.tileLayer.wms(regionalTrails, {
        layers: 'rt_sent.idsentrei.rt',
        format: 'image/png',
        transparent: true,
        version: '1.1.1',
        opacity: 0.9,
        attribution: 'Regione Toscana · sentieri REI validati CAI',
      }),
    ]),
    flora: L.tileLayer.wms(regional, {
      layers: 'rt_arprot.rilievi_specie_habitat_natnet2_veg',
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      opacity: 0.8,
      attribution: 'Regione Toscana · NatNet2',
    }),
    natura: L.tileLayer.wms(regional, {
      layers: 'rt_arprot.idrisnatreg.rt.poly,rt_arprot.idsir.rt.poly',
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      opacity: 0.35,
      attribution: 'Regione Toscana · aree protette e Natura 2000',
    }),
  };
  Object.values(overlays).forEach((layer) =>
    layer.on('tileerror', () => {
      $('#around-state').textContent =
        'Uno strato regionale non risponde; gli altri dati rimangono disponibili.';
    }),
  );

  function selectedWeather() {
    const d = data?.weather?.daily;
    if (!d) return null;
    const i = d.time.indexOf(getDate());
    if (i < 0) return null;
    return {
      precipitation: d.precipitation_sum?.[i],
      minTemperature: d.temperature_2m_min?.[i],
      maxTemperature: d.temperature_2m_max?.[i],
      wind: d.wind_speed_10m_max?.[i],
      weatherCode: d.weather_code?.[i],
      outdoorScore: d.outdoor_score?.[i],
    };
  }
  function bestFungus() {
    return (
      [...forecast].filter((r) => r.score != null).sort((a, b) => b.score - a.score)[0] ?? null
    );
  }
  async function mergeCatalog(c, r) {
    if (!catalogCache) {
      const response = await fetch('trekking-fallback.json');
      if (!response.ok) return;
      catalogCache = await response.json();
    }
    const prepare = (x) => {
      const distance = distanceKm(c, x);
      return {
        ...x,
        distanceKm: Number(distance.toFixed(2)),
        url: x.url ?? `https://www.openstreetmap.org/${x.id}`,
        difficulty: x.difficulty ?? null,
        surface: x.surface ?? null,
        protectClass: x.protectClass ?? null,
      };
    };
    const merge = (live = [], stable = []) => {
      const byId = new Map();
      for (const x of [...stable.map(prepare).filter((x) => x.distanceKm <= r), ...live])
        byId.set(x.id ?? `${x.name}:${x.lat}:${x.lon}`, x);
      return [...byId.values()].sort((a, b) => a.distanceKm - b.distanceKm);
    };
    data.trails = merge(data.trails, catalogCache.trails);
    data.nature = merge(data.nature, catalogCache.nature);
    data.catalog = {
      scope: catalogCache.scope,
      verifiedAt: catalogCache.verifiedAt,
      stats: catalogCache.stats,
      sources: catalogCache.sources,
    };
  }
  function clearMapData() {
    Object.values(layers).forEach((l) => l.clearLayers());
    Object.values(markerIndex).forEach((a) => a.splice(0));
  }
  function dot(type, icon) {
    return L.divIcon({
      className: '',
      html: `<div class="map-dot ${type}">${icon}</div>`,
      iconSize: [31, 31],
      iconAnchor: [15, 15],
    });
  }
  function addMarkers() {
    clearMapData();
    if (!data) return;
    data.trails.forEach((x, i) => {
      const details = [
        x.lengthKm ? `${x.lengthKm} km` : null,
        x.difficulty ? `difficoltà ${x.difficulty}` : null,
        x.ref ? `rif. ${x.ref}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      const m = L.marker([x.lat, x.lon], {
        icon: dot('trekking', '🥾'),
        alt: x.name,
        bubblingMouseEvents: false,
      })
        .bindTooltip(esc(x.name))
        .bindPopup(
          `<div class="place-popup"><strong>${esc(x.name)}</strong><p>${esc(x.operator ?? x.territory ?? 'Gestore non indicato')} · ${distanceLabel(x.distanceKm)}</p>${details ? `<p>${esc(details)}</p>` : ''}<p class="place-note">Il punto è il centro cartografico dell’itinerario, non necessariamente la partenza. Le linee in mappa provengono dai catasti regionali ITN e REI/CAI.</p>${x.officialUrl ? `<a href="${esc(x.officialUrl)}" target="_blank" rel="noopener">Scheda dell’ente gestore ↗</a><br>` : ''}<a href="${esc(x.url)}" target="_blank" rel="noopener">Geometria OpenStreetMap ↗</a></div>`,
        )
        .addTo(layers.trekking);
      markerIndex.trails[i] = m;
    });
    data.flora.forEach((x, i) => {
      const m = L.marker([x.lat, x.lon], {
        icon: dot('flora', '✿'),
        alt: x.scientificName,
        bubblingMouseEvents: false,
      })
        .bindTooltip(esc(x.scientificName))
        .bindPopup(
          `<div class="place-popup"><strong class="observation-name">${esc(x.scientificName)}</strong><p>${esc(x.family ?? 'Famiglia non indicata')} · osservata ${fmtDate(x.eventDate)}</p><p>${distanceLabel(x.distanceKm)} dal centro · incertezza coordinate ${x.uncertaintyMeters == null ? 'n.d.' : Math.round(x.uncertaintyMeters) + ' m'}</p><p class="place-note">È un’osservazione archiviata, non una previsione di fioritura né una conferma della presenza attuale.</p><a href="${esc(x.url)}" target="_blank" rel="noopener">Record GBIF ↗</a></div>`,
        )
        .addTo(layers.flora);
      markerIndex.flora[i] = m;
    });
    data.nature.forEach((x, i) => {
      const m = L.marker([x.lat, x.lon], {
        icon: dot('natura', '◆'),
        alt: x.name,
        bubblingMouseEvents: false,
      })
        .bindTooltip(esc(x.name))
        .bindPopup(
          `<div class="place-popup"><strong>${esc(x.name)}</strong><p>${esc(x.kind)} · ${distanceLabel(x.distanceKm)}</p><p>${esc(x.territory ?? 'Maremma')}</p><p class="place-note">Il punto aiuta a localizzare l’area; i perimetri verdi ufficiali di Regione Toscana restano la fonte per i confini. Verifica regolamenti e accessi presso il gestore.</p><a href="${esc(x.url)}" target="_blank" rel="noopener">Riferimento cartografico ↗</a></div>`,
        )
        .addTo(layers.natura);
      markerIndex.nature[i] = m;
    });
  }
  function showLayer(type, on) {
    for (const layer of [layers[type], overlays[type]]) {
      if (on && !map.hasLayer(layer)) layer.addTo(map);
      if (!on && map.hasLayer(layer)) map.removeLayer(layer);
    }
  }
  function syncLayers() {
    ['trekking', 'flora', 'natura'].forEach((t) =>
      showLayer(t, active === 'overview' || active === t),
    );
    const fungi = active === 'overview' || active === 'funghi';
    for (const layer of [forecastMarkers, forecastAreas]) {
      if (!layer) continue;
      if (fungi && !map.hasLayer(layer)) layer.addTo(map);
      if (!fungi && map.hasLayer(layer)) map.removeLayer(layer);
    }
  }
  function focus(type, i) {
    const item = data?.[type]?.[i],
      m = markerIndex[type]?.[i];
    if (!item || !m) return;
    map.setView([item.lat, item.lon], Math.max(map.getZoom(), 13));
    m.openPopup();
  }
  function item(icon, title, sub, type, index) {
    return `<button class="activity-item" data-kind="${type}" data-index="${index}"><span class="activity-icon">${icon}</span><span class="activity-copy"><strong>${esc(title)}</strong><small>${esc(sub)}</small></span><span>›</span></button>`;
  }
  function renderOverview() {
    const w = selectedWeather(),
      trail = data?.trails?.[0],
      plant = data?.flora?.[0],
      nature = data?.nature?.[0],
      fungus = bestFungus();
    const headline =
      trail && w?.outdoorScore >= 50
        ? `Giornata adatta a esplorare verso ${esc(trail.name)}`
        : fungus?.score >= 70
          ? `${esc(fungus.locality ?? fungus.name)} ha il segnale funghi più favorevole`
          : 'Scegli un’attività e valuta le condizioni prima di partire';
    $('#around-summary').innerHTML =
      `<div class="around-lead"><p class="eyebrow">OGGI VICINO A TE</p><h2>${headline}</h2><p>${weatherLevel(w)} · ${weatherText(w)}. Centro: ${esc(getCenter().name)}.</p></div><button class="around-card" data-open-activity="trekking"><span>Trekking nel raggio</span><strong>${data?.trails.length ?? '—'}</strong><p>${trail ? `${esc(trail.name)} · ${distanceLabel(trail.distanceKm)}` : 'Nessun itinerario OSM trovato.'}</p></button><button class="around-card" data-open-activity="flora"><span>Specie vegetali osservate</span><strong>${data?.floraSpeciesCount ?? '—'}</strong><p>${plant ? `${esc(plant.scientificName)} · ${distanceLabel(plant.distanceKm)}` : 'Nessuna osservazione nel campione.'}</p></button><button class="around-card" data-open-activity="natura"><span>Luoghi naturali</span><strong>${data?.nature.length ?? '—'}</strong><p>${nature ? `${esc(nature.name)} · ${distanceLabel(nature.distanceKm)}` : 'Nessuna area nominata trovata.'}</p></button>`;
    $('#activity-list').innerHTML =
      [
        trail
          ? item(
              '🥾',
              'Trekking consigliato',
              `${trail.name} · ${weatherLevel(w).toLowerCase()}`,
              'trekking',
              0,
            )
          : '',
        fungus
          ? item(
              '●',
              'Area interessante per funghi',
              `${fungus.locality ?? fungus.name} · ${fungus.score}% condizioni favorevoli`,
              'funghi',
              0,
            )
          : '',
        plant
          ? item(
              '✿',
              'Osservazioni botaniche',
              `${plant.scientificName} · osservazione del ${fmtDate(plant.eventDate)}`,
              'flora',
              0,
            )
          : '',
        nature
          ? item(
              '◆',
              'Luogo naturale da visitare',
              `${nature.name} · ${distanceLabel(nature.distanceKm)}`,
              'natura',
              0,
            )
          : '',
      ].join('') ||
      '<p class="around-empty">Le fonti non hanno restituito suggerimenti nel raggio scelto.</p>';
    const areas = [
      ...new Set(
        [...(data?.trails ?? []), ...(data?.nature ?? [])].map((x) => x.territory).filter(Boolean),
      ),
    ];
    $('#activity-panel').innerHTML =
      `<div class="coverage-card"><div><p class="eyebrow">COPERTURA TERRITORIALE</p><h3>${areas.length} settori maremmani presenti nel raggio</h3><p>${esc(data?.catalog?.scope ?? 'Catalogo territoriale filtrato sulla distanza dal centro scelto.')}</p></div><div class="coverage-chips">${areas.map((a) => `<span>${esc(a)}</span>`).join('')}</div><p class="source-line">Catalogo locale verificato ${esc(data?.catalog?.verifiedAt ?? '—')}: ${data?.catalog?.stats?.trails ?? '—'} itinerari e ${data?.catalog?.stats?.nature ?? '—'} luoghi naturali nell’intera provincia; la mappa aggiunge i perimetri e i sentieri regionali.</p></div>`;
  }
  function renderTrekking() {
    const w = selectedWeather(),
      best = data?.trails?.[0];
    $('#activity-list').innerHTML =
      data?.trails
        .map((x, i) =>
          item(
            '🥾',
            x.name,
            `${distanceLabel(x.distanceKm)} · ${x.territory ?? x.operator ?? 'settore n.d.'}`,
            'trails',
            i,
          ),
        )
        .join('') ||
      '<p class="around-empty">Nessun itinerario escursionistico classificato nel raggio.</p>';
    $('#activity-panel').innerHTML =
      `<div class="activity-detail"><article class="lead-card"><p class="eyebrow">TREKKING PIÙ VICINO</p><h2>${esc(best?.name ?? 'Nessun itinerario disponibile')}</h2><p>${best ? `${distanceLabel(best.distanceKm)} dal centro${best.lengthKm ? ` · ${best.lengthKm} km di percorso` : ''}${best.difficulty ? ` · difficoltà ${esc(best.difficulty)}` : ''}.` : ''}</p></article><article><h3>Condizioni per l’uscita</h3><p><span class="weather-chip">${weatherLevel(w)}</span></p><p>${weatherText(w)}. Il meteo è riferito al centro scelto; non valuta dislivello, fondo, esposizione o capacità personale.</p></article><article><h3>Tracce realmente delineate</h3><p>Le linee sovrappongono l’Itinerario Naturalistico Toscano e i sentieri REI validati da operatori certificati CAI. I ${data?.trails?.length ?? 0} punti nel raggio localizzano anche le relazioni escursionistiche OSM.</p><p class="source-line"><a href="https://www502.regione.toscana.it/geoscopio/servizi/wms/SENTIERISTICA.htm" target="_blank" rel="noopener">Regione Toscana · REI/CAI</a> · <a href="https://parco-maremma.it/itinerari/a-piedi/" target="_blank" rel="noopener">Parco della Maremma</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a></p></article></div>`;
  }
  function renderFlora() {
    const first = data?.flora?.[0];
    $('#activity-list').innerHTML =
      data?.flora
        .map((x, i) =>
          item(
            '✿',
            x.scientificName,
            `${fmtDate(x.eventDate)} · ${distanceLabel(x.distanceKm)}`,
            'flora',
            i,
          ),
        )
        .join('') ||
      '<p class="around-empty">Nessuna osservazione vegetale nel campione restituito.</p>';
    $('#activity-panel').innerHTML =
      `<div class="activity-detail"><article class="lead-card"><p class="eyebrow">FLORA OSSERVATA</p><h2>${data?.floraSpeciesCount ?? 0} specie distinte nel campione</h2><p>${first ? `L’osservazione più vicina mostrata è ${esc(first.scientificName)}, a ${distanceLabel(first.distanceKm)}.` : 'Nessun record disponibile.'}</p></article><article><h3>Che cosa significa</h3><p>Sono record georeferenziati presenti in GBIF negli ultimi cinque anni. Non indicano che la pianta sia visibile oggi e non costituiscono un censimento completo.</p></article><article><h3>Precisione e periodo</h3><p>Ogni popup riporta data e incertezza delle coordinate. La mappa mostra al massimo ${data?.floraSampleSize ?? 0} record recenti e li filtra sulla distanza reale dal centro.</p><p class="source-line"><a href="https://www.gbif.org/occurrence/search" target="_blank" rel="noopener">GBIF Occurrence</a> · rilievi regionali NatNet2 come strato di contesto</p></article></div>`;
  }
  function renderNatura() {
    const first = data?.nature?.[0];
    $('#activity-list').innerHTML =
      data?.nature
        .map((x, i) => item('◆', x.name, `${x.kind} · ${distanceLabel(x.distanceKm)}`, 'nature', i))
        .join('') || '<p class="around-empty">Nessuna area naturale nominata nel campione OSM.</p>';
    $('#activity-panel').innerHTML =
      `<div class="activity-detail"><article class="lead-card"><p class="eyebrow">NATURA NEL RAGGIO</p><h2>${esc(first?.name ?? 'Nessuna area nominata disponibile')}</h2><p>${first ? `${esc(first.kind)} · ${distanceLabel(first.distanceKm)} dal centro.` : ''}</p></article><article><h3>Aree delineate</h3><p>Lo strato verde mostra riserve naturali regionali e siti Natura 2000. I punti sono aree protette nominate in OpenStreetMap e servono per aprire il riferimento cartografico.</p></article><article><h3>Prima della visita</h3><p>La presenza in mappa non prova accessibilità, apertura o assenza di restrizioni. Controlla sempre il regolamento e il sito dell’ente gestore.</p><p class="source-line"><a href="https://www502.regione.toscana.it/geoscopio/servizi/wms/AREE_PROTETTE.htm" target="_blank" rel="noopener">Regione Toscana · aree protette</a></p></article></div>`;
  }
  function bindList() {
    document.querySelectorAll('[data-kind]').forEach(
      (b) =>
        (b.onclick = () => {
          const kind = b.dataset.kind,
            index = Number(b.dataset.index);
          if (kind === 'funghi') {
            setActivity('funghi');
            return;
          }
          if (kind === 'trekking') {
            setActivity('trekking');
            focus('trails', index);
            return;
          }
          if (kind === 'natura') {
            setActivity('natura');
            focus('nature', index);
            return;
          }
          if (kind === 'flora' && active === 'overview') {
            setActivity('flora');
            focus('flora', index);
            return;
          }
          focus(kind, index);
        }),
    );
    document
      .querySelectorAll('[data-open-activity]')
      .forEach((b) => (b.onclick = () => setActivity(b.dataset.openActivity)));
  }
  function render() {
    const labels = {
      overview: ['Oggi vicino a te', 'SUGGERIMENTI'],
      trekking: ['Percorsi trekking', `${data?.trails.length ?? 0} TROVATI`],
      funghi: ['Zone da esplorare', 'CONDIZIONI FAVOREVOLI'],
      flora: ['Osservazioni botaniche', `${data?.floraSpeciesCount ?? 0} SPECIE`],
      natura: ['Aree naturali', `${data?.nature.length ?? 0} LUOGHI`],
    };
    const [title, meta] = labels[active];
    $('#panel-title').textContent = title;
    $('#panel-meta').textContent = meta;
    $('#zones').hidden = active !== 'funghi';
    $('#activity-list').hidden = active === 'funghi';
    $('#fungi-module').hidden = active !== 'funghi';
    $('#forecast-state').hidden = active !== 'funghi';
    $('#around-state').hidden = active === 'funghi';
    $('#around-summary').hidden = active !== 'overview';
    if (active === 'overview') renderOverview();
    else if (active === 'trekking') renderTrekking();
    else if (active === 'flora') renderFlora();
    else if (active === 'natura') renderNatura();
    else $('#activity-panel').innerHTML = '';
    $('#panel-note').textContent =
      active === 'funghi'
        ? 'Le percentuali misurano condizioni ambientali favorevoli, non probabilità di ritrovamento.'
        : active === 'flora'
          ? 'Osservazioni archiviate: posizione e data non garantiscono presenza attuale.'
          : active === 'trekking'
            ? 'Tracce cartografiche: verifica percorribilità, difficoltà e accessi prima di partire.'
            : active === 'natura'
              ? 'I confini non sostituiscono i regolamenti delle aree protette.'
              : 'I suggerimenti incrociano distanza, meteo e territorio; non sono indicazioni di sicurezza.';
    $('.map-legend').innerHTML =
      active === 'overview'
        ? '<span class="legend-token trail"><i></i> trekking</span><span class="legend-token plant"><i></i> flora</span><span class="legend-token nature"><i></i> natura</span><span>Tratteggio: raggio</span>'
        : active === 'trekking'
          ? '<span class="legend-token trail"><i></i> sentieri e tappe trekking</span><span>Tratteggio: raggio</span>'
          : active === 'flora'
            ? '<span class="legend-token plant"><i></i> osservazioni vegetali</span><span>Coordinate con incertezza nel popup</span>'
            : active === 'natura'
              ? '<span class="legend-token nature"><i></i> aree protette e Natura 2000</span>'
              : '<i class="area-key high"></i> ≥70 <i class="area-key medium"></i> 45–69 <i class="area-key low"></i> &lt;45 <span>Contorno scuro: bosco selezionato</span>';
    document.querySelectorAll('[data-activity]').forEach((b) => {
      const on = b.dataset.activity === active;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    syncLayers();
    bindList();
  }
  function setActivity(next) {
    active = next;
    render();
  }
  async function refresh(force = false) {
    controller?.abort();
    controller = new AbortController();
    const id = ++request,
      c = getCenter(),
      r = getRadius();
    $('#around-state').hidden = false;
    $('#around-state').textContent = 'Interrogo sentieri, aree protette, flora osservata e meteo…';
    const key = `botanica-around-v3:${c.lat.toFixed(3)}:${c.lon.toFixed(3)}:${r}`;
    let cached = null;
    try {
      cached = JSON.parse(localStorage.getItem(key) || 'null');
    } catch {}
    try {
      if (!force && cached && Date.now() - cached.at < 30 * 60 * 1000) data = cached.data;
      else {
        const res = await fetch(`/api/around?lat=${c.lat}&lon=${c.lon}&radius=${r}`, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(65000)]),
        });
        if (!res.ok) throw Error();
        data = await res.json();
        if (data.weather?.status !== 'ok')
          try {
            data.weather = sevenDayWeather(await fetchBrowserWeather(c.lat, c.lon));
          } catch {}
      }
      await mergeCatalog(c, r);
      try {
        localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
      } catch {}
      if (id !== request) return;
      addMarkers();
      $('#around-state').textContent =
        `Territorio aggiornato · ${data.trails.length} itinerari · ${data.floraSpeciesCount} specie osservate · ${data.nature.length} luoghi naturali`;
      render();
    } catch (e) {
      if (id !== request || e.name === 'AbortError') return;
      data = { trails: [], flora: [], nature: [], floraSpeciesCount: 0, floraSampleSize: 0 };
      try {
        await mergeCatalog(c, r);
        $('#around-state').textContent =
          `Fonti live parziali · catalogo territoriale disponibile: ${data.trails.length} itinerari e ${data.nature.length} luoghi naturali`;
      } catch {
        $('#around-state').textContent =
          'I dati Around Me non sono disponibili. Le previsioni Funghi restano utilizzabili.';
      }
      addMarkers();
      render();
    }
  }
  document
    .querySelectorAll('[data-activity]')
    .forEach((b) => (b.onclick = () => setActivity(b.dataset.activity)));
  $('#refresh-forecast').addEventListener('click', () => refresh(true));
  refresh();
  render();
  return {
    refresh,
    setForecast(records) {
      forecast = records;
      render();
    },
    setActivity,
  };
}
