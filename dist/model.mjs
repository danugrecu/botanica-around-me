/**
 * Catalogo statico delle aree pilota e modello storico v1 mantenuto per compatibilita'.
 * Le nuove previsioni dettagliate usano i profili e predict() definiti in ecology.mjs.
 */
export const zones = [
  {
    id: 'montioni',
    name: 'Foresta di Montioni',
    area: 'Colline Metallifere e Montioni',
    lat: 42.985,
    lon: 10.755,
    alt: '100–350 m',
    wood: 'Leccete, sugherete e querceti',
    note: 'Campione territoriale; copertura e specie vengono interrogate nel punto.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/USO_E_COPERTURA_DEL_SUOLO.htm',
  },
  {
    id: 'scarlino',
    name: 'Bandite di Scarlino',
    area: 'Bandite, Tirli e costa nord',
    lat: 42.89,
    lon: 10.8,
    alt: '150–450 m',
    wood: 'Leccete e querceti',
    note: 'Mosaico di bosco e macchia mediterranea.',
    source: 'https://www.comune.scarlino.gr.it/it/news/1671992',
  },
  {
    id: 'massa',
    name: 'Boschi di Massa Marittima',
    area: 'Colline Metallifere e Montioni',
    lat: 43.074,
    lon: 10.904,
    alt: '350–650 m',
    wood: 'Querceti e castagneti',
    note: 'Campione del versante fra Massa e Monterotondo.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/USO_E_COPERTURA_DEL_SUOLO.htm',
  },
  {
    id: 'cornate',
    name: 'Cornate e Fosini',
    area: 'Colline Metallifere e Montioni',
    lat: 43.154,
    lon: 10.96,
    alt: '600–1.050 m',
    wood: 'Boschi collinari e montani',
    note: 'Riserva naturale; accesso e regolamenti vanno verificati.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/AREE_PROTETTE.htm',
  },
  {
    id: 'roccastrada',
    name: 'Roccastrada e Sassofortino',
    area: 'Maremma grossetana centrale',
    lat: 43.028,
    lon: 11.101,
    alt: '400–700 m',
    wood: 'Querceti e castagneti',
    note: 'Campione sui rilievi di Roccastrada.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/USO_E_COPERTURA_DEL_SUOLO.htm',
  },
  {
    id: 'farma',
    name: 'Farma e Belagaio',
    area: 'Maremma grossetana centrale',
    lat: 43.082,
    lon: 11.183,
    alt: '250–600 m',
    wood: 'Boschi mesofili e ripariali',
    note: 'Il punto non rappresenta accesso né parcheggio.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/AREE_PROTETTE.htm',
  },
  {
    id: 'tirli',
    name: 'Tirli e Poggio Ballone',
    area: 'Bandite, Tirli e costa nord',
    lat: 42.891,
    lon: 10.943,
    alt: '250–550 m',
    wood: 'Latifoglie mediterranee',
    note: 'Versanti con esposizione e umidità molto variabili.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/USO_E_COPERTURA_DEL_SUOLO.htm',
  },
  {
    id: 'monti-leoni',
    name: 'Monti Leoni',
    area: 'Maremma grossetana centrale',
    lat: 42.925,
    lon: 11.115,
    alt: '250–600 m',
    wood: 'Boschi di latifoglie',
    note: 'Settore centrale fra Batignano e Montepescali.',
    source:
      'https://www.regione.toscana.it/documents/10180/12604324/18_Maremma_Grossetana.pdf/961af3dd-f582-40e4-b31c-f58b15cd13b0',
  },
  {
    id: 'uccellina',
    name: 'Monti dell’Uccellina',
    area: 'Uccellina e costa del Parco',
    lat: 42.65,
    lon: 11.09,
    alt: '20–400 m',
    wood: 'Lecceta e macchia mediterranea',
    note: 'Nel Parco valgono accessi, orari e regolamenti specifici.',
    source: 'https://parco-maremma.it/itinerari/a-piedi/',
  },
  {
    id: 'civitella',
    name: 'Civitella e Paganico',
    area: 'Maremma grossetana centrale',
    lat: 42.995,
    lon: 11.28,
    alt: '200–550 m',
    wood: 'Querceti collinari',
    note: 'Campione della fascia interna centrale.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/USO_E_COPERTURA_DEL_SUOLO.htm',
  },
  {
    id: 'cinigiano',
    name: 'Cinigiano e valle dell’Ombrone',
    area: 'Amiata e alta valle dell’Albegna',
    lat: 42.89,
    lon: 11.39,
    alt: '250–600 m',
    wood: 'Querceti e castagneti sparsi',
    note: 'Zona a mosaico: il calcolo si attiva solo sul poligono boscato.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/USO_E_COPERTURA_DEL_SUOLO.htm',
  },
  {
    id: 'scansano',
    name: 'Boschi di Scansano',
    area: 'Bassa Maremma e ripiani tufacei',
    lat: 42.72,
    lon: 11.3,
    alt: '250–600 m',
    wood: 'Querceti e latifoglie termofile',
    note: 'La zona comprende vigneti e pascoli: il punto viene verificato sulla carta.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/USO_E_COPERTURA_DEL_SUOLO.htm',
  },
  {
    id: 'amiata',
    name: 'Amiata · Macinaie',
    area: 'Amiata e alta valle dell’Albegna',
    lat: 42.9,
    lon: 11.6,
    alt: '950–1.500 m',
    wood: 'Faggete e castagneti',
    note: 'Profilo fresco e montano; diverso dalle leccete costiere.',
    source:
      'https://www.regione.toscana.it/-/documentazione-relativa-al-volume-il-vulcano-di-monte-amiata',
  },
  {
    id: 'pescinello',
    name: 'Pescinello e Monte Labbro',
    area: 'Amiata e alta valle dell’Albegna',
    lat: 42.82,
    lon: 11.49,
    alt: '600–1.150 m',
    wood: 'Boschi montani e mosaico aperto',
    note: 'Il calcolo è escluso se il punto ricade in prato o pascolo.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/AREE_PROTETTE.htm',
  },
  {
    id: 'castellazzara',
    name: 'Monte Penna e Castell’Azzara',
    area: 'Bassa Maremma e ripiani tufacei',
    lat: 42.78,
    lon: 11.68,
    alt: '600–1.050 m',
    wood: 'Boschi di latifoglie',
    note: 'Settore orientale e più elevato della Maremma.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/AREE_PROTETTE.htm',
  },
  {
    id: 'sovana',
    name: 'Sovana e valle della Lente',
    area: 'Bassa Maremma e ripiani tufacei',
    lat: 42.655,
    lon: 11.65,
    alt: '250–500 m',
    wood: 'Querceti, forre e vegetazione ripariale',
    note: 'Rilievo tufaceo con forte variabilità locale.',
    source:
      'https://www.regione.toscana.it/documents/10180/12604324/20_Bassa_Maremma_e_ripiani_tufacei.pdf/c3cd65dd-269e-4186-8ca6-df2e687c7c56',
  },
  {
    id: 'rocconi',
    name: 'Bosco dei Rocconi',
    area: 'Bassa Maremma e ripiani tufacei',
    lat: 42.63,
    lon: 11.5,
    alt: '200–500 m',
    wood: 'Boschi dell’Albegna',
    note: 'Riserva naturale: verificare le regole di visita e raccolta.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/AREE_PROTETTE.htm',
  },
  {
    id: 'montauto',
    name: 'Montauto e Manciano',
    area: 'Bassa Maremma e ripiani tufacei',
    lat: 42.52,
    lon: 11.52,
    alt: '150–450 m',
    wood: 'Querceti e macchia',
    note: 'Campione della Maremma sud-orientale.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/AREE_PROTETTE.htm',
  },
  {
    id: 'capalbio',
    name: 'Colline di Capalbio',
    area: 'Argentario e costa meridionale',
    lat: 42.455,
    lon: 11.43,
    alt: '100–350 m',
    wood: 'Boschi termofili e macchia',
    note: 'Profilo caldo; il bosco ospite deve risultare dalla cartografia.',
    source: 'https://www502.regione.toscana.it/geoscopio/servizi/wms/USO_E_COPERTURA_DEL_SUOLO.htm',
  },
  {
    id: 'argentario',
    name: 'Monte Argentario',
    area: 'Argentario e costa meridionale',
    lat: 42.42,
    lon: 11.17,
    alt: '100–600 m',
    wood: 'Macchia e leccete discontinue',
    note: 'Il calcolo non si estende automaticamente alle aree di macchia non boscata.',
    source:
      'https://www.regione.toscana.it/documents/10180/12604324/20_Bassa_Maremma_e_ripiani_tufacei.pdf/c3cd65dd-269e-4186-8ca6-df2e687c7c56',
  },
  {
    id: 'giglio',
    name: 'Isola del Giglio',
    area: 'Arcipelago maremmano',
    lat: 42.36,
    lon: 10.9,
    alt: '50–450 m',
    wood: 'Macchia e boschi mediterranei frammentati',
    note: 'Campione insulare; copertura molto discontinua.',
    source:
      'https://www.regione.toscana.it/documents/10180/12604324/20_Bassa_Maremma_e_ripiani_tufacei.pdf/c3cd65dd-269e-4186-8ca6-df2e687c7c56',
  },
];
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
export function estimate(d, date, species, z) {
  const i = d?.time?.indexOf(date);
  if (i == null || i < 14) return null;
  const keys = [
    'precipitation_sum',
    'temperature_2m_mean',
    'temperature_2m_max',
    'wind_speed_10m_max',
  ];
  if (
    keys.some(
      (k) =>
        !Array.isArray(d[k]) ||
        d[k].slice(i - 14, i + 1).length !== 15 ||
        d[k].slice(i - 14, i + 1).some((v) => typeof v !== 'number' || !Number.isFinite(v)),
    )
  )
    return null;
  const rain = d.precipitation_sum.slice(i - 14, i).reduce((a, b) => a + b, 0);
  const temp = d.temperature_2m_mean.slice(i - 4, i + 1).reduce((a, b) => a + b, 0) / 5;
  const wind = d.wind_speed_10m_max.slice(i - 2, i + 1).reduce((a, b) => a + b, 0) / 3;
  const heat = Math.max(...d.temperature_2m_max.slice(i - 4, i + 1));
  let lag = null;
  for (let k = 1; k <= 14; k++) {
    if (d.precipitation_sum[i - k] >= 5) {
      lag = k;
      break;
    }
  }
  const r = clamp(rain / 45),
    t = clamp(1 - Math.abs(temp - (species === 'porcini' ? 18 : 22)) / 12);
  const l = lag === null ? 0 : lag < 4 ? lag / 4 : lag <= 12 ? 1 : 0.6;
  const h = z.habitat[species === 'porcini' ? 0 : 1];
  const month = Number(date.slice(5, 7));
  const season =
    species === 'porcini'
      ? month >= 5 && month <= 11
        ? 1
        : 0.35
      : month >= 6 && month <= 10
        ? 1
        : 0.25;
  const dry = clamp((wind - 18) / 35) * 0.16 + clamp((heat - 29) / 10) * 0.2;
  const score = Math.round(
    100 * clamp((0.45 * r + 0.3 * t + 0.15 * l + 0.1 * h - dry) * season * (rain < 5 ? 0.35 : 1)),
  );
  return {
    score,
    rain,
    temp,
    wind,
    lag,
    parts: [Math.round(r * 100), Math.round(t * 100), Math.round(l * 100), Math.round(h * 100)],
  };
}
export const level = (n) => (n >= 70 ? 'Favorevole' : n >= 45 ? 'Da seguire' : 'Poco favorevole');
