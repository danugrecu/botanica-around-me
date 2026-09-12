# Botanica Around Me

## Obiettivo dell'MVP

Botanica Around Me è un assistente territoriale per la Maremma dedicato a chi vuole capire rapidamente cosa c'è intorno a una posizione scelta o rilevata, combinando territorio, meteo e segnali naturalistici. L'MVP non pretende di essere una previsione scientificamente validata: vuole aiutare l'utente a orientarsi tra boschi, sentieri, flora, condizioni ambientali e opportunità di uscita.

L'applicazione è focalizzata sul territorio della Maremma e usa le coordinate del punto scelto per interrogare provider territoriali e meteo, normalizzare i risultati e presentare un giudizio euristico di compatibilità ambientale per funghi e formazioni naturali.

## Funzionalità attuali

| Feature | Descrizione | Modulo principale |
| --- | --- | --- |
| Around Me | Panoramica del centro scelto con raggio 5/10/25/50 km, trekking, flora, natura e meteo dell'uscita. | `src/frontend/around/around.mjs` |
| Mappa | Mappa Leaflet con base OpenStreetMap, layer WMS regionali, marker, raggio, poligono e punti vicini. | `src/frontend/map/map.mjs` |
| Analisi punto | Selezione del punto, interrogazione dei dati territoriali e meteo, rendering del contesto ambientale. | `src/frontend/app/main.mjs` + `src/frontend/clients/botanica-api.mjs` |
| Funghi / Ecology | Valutazione euristica di compatibilità ambientale per specie e profili funghi. | `src/frontend/ecology/ecology.mjs` |
| Forecast | Confronto automatico di punti campione e ranking dei boschi per giorno e specie. | `src/frontend/forecast/forecast.mjs` |
| Confronto 3x3 | Generazione dei 9 punti a circa 500 m e confronto del territorio intorno al centro. | `src/frontend/analysis/grid-scan.mjs` + orchestrazione in `src/frontend/app/main.mjs` |
| Diario | Persistenza locale delle uscite, snapshot, export CSV e backup JSON. | `src/frontend/diary/diary.mjs` |
| Meteo browser fallback | In caso di indisponibilità del backend, il browser usa un fallback Open-Meteo per il meteo del punto. | `src/frontend/clients/weather.mjs` |

## Funzionamento generale

Il flusso applicativo è diretto e semplice:

- l'utente seleziona un punto o usa la geolocalizzazione;
- il frontend costruisce le richieste tramite il client Botanica;
- il backend locale oppure il Worker hosted risponde con ambiente, territorio e meteo;
- i dati vengono normalizzati e usati da Around, Ecology e Forecast;
- la mappa e la UI mostrano il risultato in modo coerente.

In pratica, la logica è:

posizione
→ Botanica API
→ provider territoriali e meteo
→ normalizzazione
→ Ecology / Around / Forecast
→ UI e mappa

## Limitazioni MVP

- Il modello funghi è euristico: esprime compatibilità ambientale, non probabilità statisticamente validata di ritrovamento.
- La precisione geografica dipende dalla risoluzione delle fonti territoriali e meteo, che sono di ordine di metri o chilometri diversi.
- Le osservazioni GBIF sono storiche; non dimostrano presenza attuale né fioritura nel punto.
- Sentieri, aree protette e riserve non certificano accessibilità, sicurezza o stato di apertura.
- I dati mancanti non vengono trasformati in zero: restano assenti o null.
- Il diario è locale nel browser e non viene inviato al server.

## Quick start

Prerequisiti:

- Python 3
- Node.js/npm

Comandi principali:

- `npm test`
- `npm start`

Il server locale viene esposto a:

- http://localhost:4173

Per dettagli completi, vedere [ARCHITECTURE.md](ARCHITECTURE.md), [DATA_SOURCES.md](DATA_SOURCES.md), [ON-BOARDING.md](ON-BOARDING.md) e [AGENTS.md](AGENTS.md).

## Repository map

```text
src/                 # frontend, backend hosted, business logic
data/                # runtime data: catalog and forecast points
vendor/              # vendored Leaflet assets
scripts/             # build and data-generation helpers
tests/               # Node and Python tests
dist/                # generated output only
```

## Documentazione

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DATA_SOURCES.md](DATA_SOURCES.md)
- [ON-BOARDING.md](ON-BOARDING.md)
- [AGENTS.md](AGENTS.md)

