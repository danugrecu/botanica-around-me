/**
 * Graduatoria automatica dei boschi campione per specie e giorno.
 * Carica forecast-points.json, ottiene l'ambiente di ogni punto e usa ecology.predict().
 */
import { percent } from './display.mjs';
import { zones, predict, today, level } from './ecology.mjs';
import { fetchBrowserWeather } from './weather.mjs';
export function summarizeForecast(env, days, species, date) {
  const daily = days.map((day) => ({ day, ...predict(env, day, species) }));
  const usable = daily.filter((r) => r.score !== null);
  const best = [...usable].sort((a, b) => b.score - a.score)[0] ?? null;
  let window = null;
  if (best && best.score >= 70) {
    let a = daily.indexOf(best),
      b = a;
    while (a > 0 && daily[a - 1].score !== null && daily[a - 1].score >= 70) a--;
    while (b < daily.length - 1 && daily[b + 1].score !== null && daily[b + 1].score >= 70) b++;
    window = [daily[a].day, daily[b].day];
  }
  return { current: daily.find((r) => r.day === date) ?? null, best, window, daily };
}
export function setupForecast({
  days,
  getSpecies,
  getDate,
  selectPoint,
  onMarkers,
  filterRecord = () => true,
}) {
  const $ = (s) => document.querySelector(s),
    esc = (s) =>
      String(s ?? '').replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
      );
  const fmt = (d) =>
      new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
    classes = (n) => (n == null ? '' : n >= 70 ? 'good' : n >= 45 ? 'mid' : 'low');
  let records = [],
    loading = false,
    completed = 0,
    run = 0;
  const age = 60 * 60 * 1000;
  function ranked() {
    return records
      .filter(filterRecord)
      .map((r) => ({
        ...r,
        summary: r.env ? summarizeForecast(r.env, days, getSpecies(), getDate()) : null,
      }))
      .sort((a, b) => (b.summary?.current?.score ?? -1) - (a.summary?.current?.score ?? -1));
  }
  function render() {
    const list = ranked(),
      valid = list.filter((r) => r.summary?.current?.score != null),
      top = valid[0];
    const future = list
      .filter((r) => r.summary?.best)
      .sort((a, b) => b.summary.best.score - a.summary.best.score)[0];
    $('#forecast-state').textContent = loading
      ? `Previsioni in aggiornamento · ${completed}/${list.length} boschi analizzati nel raggio`
      : `${valid.length}/${list.length} boschi nel raggio con indice per ${fmt(getDate())} · dati meteo modellistici · cache locale massima 1 ora`;
    const target = top ?? future;
    $('#forecast-summary-body').innerHTML = target
      ? `<div class="forecast-main"><p class="eyebrow">${top?.summary.current.score >= 70 ? 'LA ZONA PIÙ FAVOREVOLE' : top ? 'LA SCELTA RELATIVAMENTE MIGLIORE' : 'IL PROSSIMO SEGNALE DISPONIBILE'}${loading ? ' · CONFRONTO PARZIALE' : ''}</p><h2>${esc(target.name)}</h2><p>${top ? `Per ${fmt(getDate())}: <strong>${top.summary.current.score}% · ${level(top.summary.current.score).toLowerCase()}</strong>.` : 'Nessuna stima disponibile per il giorno selezionato.'} ${top && top.summary.current.score < 45 ? 'Al momento conviene attendere condizioni migliori.' : top && top.summary.current.score < 70 ? 'Da tenere d’occhio: le condizioni non sono ancora nettamente favorevoli.' : ''}</p><button class="outline" data-open-forecast="${target.id}">Esplora il bosco previsto →</button></div><div class="forecast-window"><p class="eyebrow">QUANDO ANDARE · PROSSIMI 7 GIORNI</p><h3>${
          future?.summary.window
            ? future.summary.window
                .map(fmt)
                .filter((x, i, a) => i === 0 || x !== a[0])
                .join(' – ')
            : 'Nessuna finestra nettamente favorevole'
        }</h3><p>${future ? `Il segnale migliore è a <strong>${esc(future.name)}</strong>, ${fmt(future.summary.best.day)}: <strong>${future.summary.best.score}%</strong>.` : ''}</p><p class="forecast-note">${future?.summary.window ? 'Finestra con condizioni favorevoli almeno al 70% nel bosco indicato.' : 'Il massimo relativo non è una raccomandazione di raccolta.'} Previsione sperimentale, non ritrovamenti segnalati.</p></div>`
      : `<div class="forecast-main"><p class="eyebrow">PREVISIONE PER LA MAREMMA</p><h2>${loading ? 'Sto confrontando i boschi…' : 'Previsioni non disponibili'}</h2><p>${loading ? 'Incrocio meteo, alberi ospiti, terreno e rilievo dei sei punti campione.' : 'Le fonti non hanno restituito dati sufficienti. Riprova con Aggiorna previsioni; l’analisi puntuale rimane disponibile.'}</p></div>`;
    $('#zones').innerHTML = list
      .map((r) => {
        const current = r.summary?.current,
          best = r.summary?.best;
        return `<button class="zone" data-open-forecast="${r.id}"><span class="score ${classes(current?.score)}">${percent(current?.score)}</span><span class="zone-info"><span class="zone-name">${esc(r.name)}</span><span class="zone-sub">${current?.score != null ? `${esc(r.area)} · ${level(current.score)}` : r.state === 'loading' ? 'Analisi in corso…' : r.state === 'failed' ? 'Fonte non disponibile' : 'Nessun indice calcolabile'}</span><span class="zone-sub">${best ? `Meglio ${fmt(best.day)} · ${best.score}%` : esc(r.landcover ?? r.area)}</span></span><span>›</span></button>`;
      })
      .join('');
    document.querySelectorAll('[data-open-forecast]').forEach(
      (b) =>
        (b.onclick = () => {
          const r = records.find((r) => r.id === b.dataset.openForecast);
          if (r) {
            document
              .querySelectorAll('#zones .zone')
              .forEach((z) => z.classList.toggle('selected', z.dataset.openForecast === r.id));
            selectPoint(r.lat, r.lon, r.locality ?? r.name);
          }
        }),
    );
    onMarkers?.(list.map((r) => ({ ...r, score: r.summary?.current?.score ?? null })));
  }
  async function refresh(force = false) {
    const id = ++run,
      targets = records.filter(filterRecord);
    loading = true;
    completed = targets.filter((r) => r.env && !force).length;
    $('#refresh-forecast').disabled = true;
    const queue = targets.filter((r) => force || !r.env);
    queue.forEach((r) => {
      r.state = 'loading';
      if (force) r.env = null;
    });
    render();
    let next = 0;
    async function worker() {
      while (next < queue.length && id === run) {
        const rec = queue[next++];
        try {
          const key = `fungapp-prediction-v2:${rec.id}:${rec.lat}:${rec.lon}`;
          let cached;
          try {
            cached = JSON.parse(localStorage.getItem(key) || 'null');
          } catch {}
          if (cached && cached.day === today() && Date.now() - cached.at < age)
            rec.env = cached.env;
          else {
            const response = await fetch(`/api/environment?lat=${rec.lat}&lon=${rec.lon}`, {
              signal: AbortSignal.timeout(70000),
            });
            if (!response.ok) throw Error();
            rec.env = await response.json();
            if (rec.env.weather?.status !== 'ok')
              rec.env.weather = await fetchBrowserWeather(rec.lat, rec.lon);
            if (rec.env.weather?.status === 'ok' && rec.env.forest?.status === 'ok')
              try {
                localStorage.setItem(
                  key,
                  JSON.stringify({ at: Date.now(), day: today(), env: rec.env }),
                );
              } catch {}
          }
          rec.state = 'ready';
        } catch {
          rec.state = 'failed';
          rec.env = null;
        }
        completed++;
        render();
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    if (id !== run) return;
    loading = false;
    $('#refresh-forecast').disabled = false;
    render();
  }
  async function init() {
    try {
      const response = await fetch('forecast-points.json');
      if (!response.ok) throw Error();
      const pts = await response.json();
      records = zones.map((z) => ({ ...z, ...pts.find((p) => p.id === z.id), state: 'loading' }));
      await refresh();
    } catch {
      $('#forecast-state').textContent = 'Elenco dei boschi non disponibile. Ricarica la pagina.';
    }
  }
  $('#refresh-forecast').onclick = () => {
    for (const r of records)
      try {
        localStorage.removeItem(`fungapp-prediction-v2:${r.id}:${r.lat}:${r.lon}`);
      } catch {}
    refresh(true);
  };
  window.addEventListener('forecast-filter', render);
  init();
  return { render, refreshVisible: () => refresh(false) };
}
