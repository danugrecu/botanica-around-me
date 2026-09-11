/**
 * Modello ecologico sperimentale.
 * Traduce habitat e serie meteo in fattori leggibili e in un indice 0-100.
 * Non contiene codice della mappa o richieste HTTP.
 */
export { zones, today, level } from './model.mjs';
export const profiles = {
  aereus: {
    name: 'Porcino nero',
    latin: 'Boletus aereus',
    temp: [16, 24],
    months: [5, 6, 7, 8, 9, 10, 11],
    hosts: { oak: 1, chestnut: 0.9, beech: 0.45, conifer: 0.15, broadleaf: 0.7, mixed: 0.55 },
    description:
      'Boschi caldi di querce e castagni; profilo mediterraneo, dalla tarda primavera all’autunno.',
  },
  reticulatus: {
    name: 'Porcino estivo',
    latin: 'Boletus reticulatus / aestivalis',
    temp: [16, 23],
    months: [5, 6, 7, 8, 9, 10],
    hosts: { oak: 0.95, chestnut: 1, beech: 0.85, conifer: 0.25, broadleaf: 0.75, mixed: 0.6 },
    description:
      'Querce, castagni e faggi; soprattutto nella parte calda della stagione, se il terreno conserva umidità.',
  },
  edulis: {
    name: 'Porcino comune',
    latin: 'Boletus edulis',
    temp: [11, 19],
    months: [6, 7, 8, 9, 10, 11],
    hosts: { oak: 0.65, chestnut: 0.95, beech: 1, conifer: 0.9, broadleaf: 0.7, mixed: 0.8 },
    description:
      'Latifoglie e conifere; più legato a condizioni fresche e umide, con fenologia variabile secondo la quota.',
  },
  pinophilus: {
    name: 'Porcino rosso',
    latin: 'Boletus pinophilus',
    temp: [10, 18],
    months: [5, 6, 7, 8, 9, 10, 11],
    hosts: { oak: 0.35, chestnut: 0.85, beech: 0.9, conifer: 1, broadleaf: 0.55, mixed: 0.8 },
    description:
      'Conifere, castagneti e faggete, spesso in ambienti freschi. Il nome non implica un legame esclusivo con i pini.',
  },
  cucchi: {
    name: 'Cucchi / ovoli buoni',
    latin: 'Amanita caesarea',
    temp: [18, 25],
    months: [6, 7, 8, 9, 10, 11],
    hosts: { oak: 1, chestnut: 0.95, beech: 0.2, conifer: 0.05, broadleaf: 0.65, mixed: 0.4 },
    description:
      'Latifoglie termofile, soprattutto querce e castagni. La presenza del bosco ospite è essenziale; il caldo da solo non basta.',
  },
};
export const vegLabels = {
  1: 'Leccete',
  2: 'Sugherete',
  3: 'Querceti di roverella',
  4: 'Cerrete',
  5: 'Ostrieti',
  6: 'Castagneti',
  7: 'Robinieti',
  8: 'Faggete',
  9: 'Abetine',
  10: 'Sclerofille',
  11: 'Latifoglie termofile',
  12: 'Latifoglie mesoigrofile',
  13: 'Latifoglie mesofile',
  14: 'Pinete',
  15: 'Altre conifere',
  16: 'Sclerofille e conifere',
  17: 'Sclerofille e latifoglie',
  18: 'Latifoglie e conifere',
};
export const num = (x) =>
  x === null || x === undefined || x === '' ? null : Number.isFinite(Number(x)) ? Number(x) : null;
export const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
function dailyValues(d, k, i, n) {
  const a = d?.[k]?.slice(i - n + 1, i + 1);
  return a?.length === n && a.every((v) => num(v) !== null) ? a : null;
}
function rolling(d, k, i, n) {
  const a = dailyValues(d, k, i, n);
  return a ? mean(a) : null;
}
export function habitat(env, override = 'auto') {
  const fs = env?.forest?.features ?? [];
  const land = fs.find((f) => f.layer.includes('iducs.10k.2019'));
  const old = fs.find((f) => f.layer.includes('idift'));
  const veg = fs.find((f) => f.layer.includes('idvegfor'));
  const code = land?.properties.ucs2019 ?? null;
  const woodland = code ? ['311', '312', '313'].some((c) => code.startsWith(c)) : null;
  let host = code?.startsWith('311')
    ? 'broadleaf'
    : code?.startsWith('312')
      ? 'conifer'
      : code?.startsWith('313')
        ? 'mixed'
        : null;
  let label = land?.properties.des2019 ?? 'Copertura non disponibile',
    specific = false,
    source = 'UCS 2019 · scala 1:10.000';
  const warnings = [];
  if (veg && woodland) {
    const n = Number(veg.layer.split('.').at(-1));
    if (vegLabels[n]) {
      label = vegLabels[n];
      host = [1, 2, 3, 4].includes(n)
        ? 'oak'
        : n === 6
          ? 'chestnut'
          : n === 8
            ? 'beech'
            : [9, 14, 15].includes(n)
              ? 'conifer'
              : n >= 16
                ? 'mixed'
                : 'broadleaf';
      specific = true;
      source = 'Carta vegetazione · celle 250 m, scala nominale 1:250.000';
    }
  }
  const trees = old
    ? [old.properties.SPECFOR_1, old.properties.SPECFOR_2, old.properties.SPECFOR_3]
        .filter((t) => t && t !== '-')
        .join(', ')
    : '';
  if (!specific && woodland && trees) {
    const s = trees.toLowerCase();
    host = /castagn|castanea/.test(s)
      ? 'chestnut'
      : /faggio|fagus/.test(s)
        ? 'beech'
        : /querc|cerro|leccio|roverella|sugher/.test(s)
          ? 'oak'
          : /pinus|pino|abete|picea/.test(s)
            ? 'conifer'
            : host;
    specific = ['oak', 'chestnut', 'beech'].includes(host);
    label = trees;
    source = 'IFT storico · maglia 400 m, rilievi anni ’90';
    warnings.push('Specie arboree da inventario storico: verificare il bosco attuale.');
  }
  if (
    old &&
    woodland &&
    old.properties.UCS &&
    !/bosc|castagn|forest|conifer|latifog|fagg|querc|lecc|sugher|cerret/i.test(old.properties.UCS)
  )
    warnings.push(
      'UCS 2019 e inventario storico descrivono coperture diverse. Prevale la carta più recente.',
    );
  if (
    override !== 'auto' &&
    ['oak', 'chestnut', 'beech', 'conifer', 'mixed', 'none'].includes(override)
  ) {
    host = override;
    label = {
      oak: 'Querce / leccio / sughera',
      chestnut: 'Castagni',
      beech: 'Faggi',
      conifer: 'Conifere',
      mixed: 'Bosco misto',
      none: 'Assenza di alberi ospiti',
    }[override];
    source = 'Scenario inserito dall’utente, non verificato';
    specific = override !== 'mixed';
    return {
      woodland: override !== 'none',
      host,
      label,
      specific,
      source,
      land,
      warnings,
      scenario: true,
      trees,
    };
  }
  return { woodland, host, label, specific, source, land, warnings, scenario: false, trees };
}
export function hourlySummary(w, date, n = 3) {
  const h = w?.hourly;
  if (!h?.time) return {};
  const end = new Date(date + 'T12:00:00Z');
  end.setUTCDate(end.getUTCDate() - (n - 1));
  const start = end.toISOString().slice(0, 10);
  const ids = h.time
    .map((t, i) => (t.slice(0, 10) >= start && t.slice(0, 10) <= date ? i : -1))
    .filter((i) => i >= 0);
  const out = {};
  for (const k of [
    'soil_temperature_6cm',
    'soil_moisture_3_to_9cm',
    'soil_moisture_9_to_27cm',
    'relative_humidity_2m',
    'vapour_pressure_deficit',
  ]) {
    const a = ids.map((i) => h[k]?.[i]).filter((v) => num(v) !== null);
    out[k] = a.length >= n * 18 ? mean(a) : null;
  }
  return out;
}
function comfort(t, range) {
  if (t === null) return null;
  return t < range[0]
    ? clamp(1 - (range[0] - t) / 9)
    : t > range[1]
      ? clamp(1 - (t - range[1]) / 9)
      : 1;
}
export function predict(env, date, species, override = 'auto') {
  if (species === 'porcini') {
    const variants = Object.keys(profiles)
      .filter((k) => k !== 'cucchi')
      .map((k) => predict(env, date, k, override));
    return (
      variants.filter((r) => r.score !== null).sort((a, b) => b.score - a.score)[0] ?? variants[0]
    );
  }
  const p = profiles[species];
  if (!p) throw Error('Specie non valida');
  const h = habitat(env, override),
    w = env?.weather,
    d = w?.daily,
    i = d?.time?.indexOf(date) ?? -1;
  const base = {
    species,
    profile: p,
    habitat: h,
    score: null,
    reasons: [],
    missing: [],
    factors: [],
    model: 'ecology-v2.0',
  };
  if (i < 30) {
    base.reason = 'Meteo insufficiente: servono 30 giorni precedenti.';
    return base;
  }
  const rain30 = rolling(d, 'precipitation_sum', i - 1, 30),
    rain14 = rolling(d, 'precipitation_sum', i - 1, 14),
    rain7 = rolling(d, 'precipitation_sum', i - 1, 7),
    air = rolling(d, 'temperature_2m_mean', i, 5);
  if ([rain30, rain14, rain7, air].some((x) => x === null)) {
    base.reason = 'Serie meteo incompleta: nessun indice calcolato.';
    return base;
  }
  const hourly = hourlySummary(w, date),
    soilT = hourly.soil_temperature_6cm ?? null,
    shallow = hourly.soil_moisture_3_to_9cm ?? null,
    deep = hourly.soil_moisture_9_to_27cm ?? null,
    rh = hourly.relative_humidity_2m ?? null,
    vpd = hourly.vapour_pressure_deficit ?? null;
  const soil = env.soil?.features?.[0]?.properties ?? {};
  const awc = num(soil.awc),
    sand = num(soil.sab),
    clay = num(soil.arg),
    organic = num(soil.sostorg);
  const et = rolling(d, 'et0_fao_evapotranspiration', i - 1, 14),
    balance = et === null ? null : rain14 * 14 - et * 14;
  let dry = 0;
  for (let j = i - 1; j >= Math.max(0, i - 30); j--) {
    if (d.precipitation_sum[j] >= 1) break;
    dry++;
  }
  let pulse = null;
  for (let j = i - 2; j >= i - 22; j--) {
    const event = d.precipitation_sum.slice(j - 2, j + 1).reduce((a, b) => a + b, 0);
    if (event >= 10) {
      pulse = i - j;
      break;
    }
  }
  const soilWater = shallow === null ? null : clamp((shallow - 0.08) / 0.2);
  const deepWater = deep === null ? null : clamp((deep - 0.1) / 0.22);
  const antecedent = clamp((rain14 * 14 * 0.7 + rain30 * 30 * 0.3) / 55);
  let hydration =
    soilWater === null
      ? antecedent
      : 0.45 * antecedent + 0.4 * soilWater + 0.15 * (deepWater ?? soilWater);
  // Coarse soil properties only modulate drying; they are not measurements of today's moisture.
  const retention = awc === null ? 0.5 : clamp((awc - 50) / 180);
  if (balance !== null && balance < 0)
    hydration *= 1 - clamp(-balance / 100) * (0.2 - 0.1 * retention);
  const thermal = comfort(soilT ?? air, p.temp);
  const host = h.host ? (p.hosts[h.host] ?? 0) : null;
  const month = Number(date.slice(5, 7));
  const seasonal = p.months.includes(month) ? 1 : 0.25;
  const terrain = env.terrain ?? {};
  const south = terrain.aspect == null ? 0 : -Math.cos((terrain.aspect * Math.PI) / 180);
  const slope = num(terrain.slope),
    relief = slope === null ? 0.5 : clamp(0.7 - slope / 100);
  const sunModifier =
    ((south * Math.min(slope ?? 0, 35)) / 35) *
    (air > p.temp[1] ? -0.06 : air < p.temp[0] ? 0.04 : -0.01);
  let drying =
    (vpd === null ? 0 : clamp((vpd - 0.8) / 2.2) * 0.12) +
    (rh === null ? 0 : clamp((55 - rh) / 40) * 0.06);
  const wind = rolling(d, 'wind_speed_10m_max', i, 3);
  if (wind !== null) drying += clamp((wind - 18) / 35) * 0.05;
  const freeze = dailyValues(d, 'temperature_2m_min', i, 3)?.some((t) => t <= 0) ?? false;
  const timing = pulse === null ? 0.15 : pulse < 4 ? 0.45 : pulse <= 16 ? 1 : 0.6;
  const waterGate = rain14 * 14 < 5 && (shallow === null || shallow < 0.16) ? 0.4 : 1;
  let score = Math.round(
    100 *
      clamp(
        (0.35 * hydration +
          0.25 * thermal +
          0.25 * (host ?? 0.4) +
          0.1 * timing +
          0.05 * relief +
          sunModifier -
          drying) *
          seasonal *
          waterGate *
          (freeze ? 0.35 : 1),
      ),
  );
  if (!h.specific) score = Math.min(score, 69); // Broad leaf cover alone cannot justify a strong habitat claim.
  if (h.woodland !== true) score = null;
  const metrics = {
    rain7: rain7 * 7,
    rain14: rain14 * 14,
    rain30: rain30 * 30,
    air,
    soilT,
    shallow,
    deep,
    rh,
    vpd,
    wind,
    balance,
    et14: et === null ? null : et * 14,
    awc,
    sand,
    clay,
    organic,
    dry,
    pulse,
    freeze,
  };
  const factors = [
    { name: 'Acqua disponibile', value: hydration, weight: 35 },
    { name: 'Temperatura', value: thermal, weight: 25 },
    { name: 'Alberi ospiti', value: host, weight: 25 },
    { name: 'Sequenza delle piogge', value: timing, weight: 10 },
    { name: 'Rilievo', value: slope === null ? null : relief, weight: 5 },
  ];
  const missing = [];
  if (soilT === null) missing.push('Temperatura del suolo');
  if (shallow === null) missing.push('Umidità superficiale');
  if (deep === null) missing.push('Umidità profonda');
  if (!h.specific) missing.push('Specie arboree confermate');
  if (awc === null) missing.push('Riserva idrica del terreno');
  if (slope === null) missing.push('Pendenza ed esposizione');
  if (rh === null || vpd === null) missing.push('Stress evaporativo');
  const reasons = [...h.warnings];
  if (dry >= 7)
    reasons.push(`${dry} giorni consecutivi con meno di 1 mm di pioggia prima della data scelta.`);
  if (balance !== null && balance < 0)
    reasons.push(
      'La pioggia delle ultime due settimane non compensa l’evapotraspirazione di riferimento.',
    );
  if (shallow !== null && shallow < 0.15)
    reasons.push('Il modello indica poco contenuto idrico nello strato superficiale.');
  if (!h.specific)
    reasons.push('Alberi ospiti non confermati: condizioni favorevoli limitate al 69%.');
  if (freeze) reasons.push('Minime sotto zero: forte penalità per gelo.');
  if (seasonal < 1) reasons.push('Data fuori dalla finestra stagionale indicativa del profilo.');
  if (h.scenario)
    reasons.push('Stima di scenario: include il tipo di bosco dichiarato manualmente.');
  const horizon = Math.max(
    0,
    Math.round((new Date(date + 'T12:00:00') - new Date(d.time[30] + 'T12:00:00')) / 86400000),
  );
  return {
    ...base,
    score,
    metrics,
    factors,
    missing,
    reasons,
    reason:
      h.woodland === false
        ? 'Il punto non risulta boscato nella carta UCS 2019. Nessuna previsione micologica.'
        : h.woodland === null
          ? 'Copertura del suolo sconosciuta: scegli un punto con dati cartografici.'
          : null,
    uncertainty:
      horizon >= 4
        ? 'Elevata: previsione a 4–6 giorni'
        : missing.length
          ? 'Elevata: dati locali incompleti'
          : 'Resta elevata: modello non validato',
    horizon,
  };
}
