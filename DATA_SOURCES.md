# DATA_SOURCES.md

## Panoramica

Questo repository combina dati territoriali regionali, dati meteo globali, geodati OSM e cataloghi locali per costruire un contesto ambientale dell'area scelta. La logica del frontend non deve trattare le fonti come equivalenti tra loro: hanno diversa risoluzione, età e validità.

## Fonti attive

| Fonte | Tipo di dato | Uso nel progetto | Limiti principali | Cache / validità |
| --- | --- | --- | --- | --- |
| Regione Toscana WMS | Boschi, copertura del suolo, Natura 2000, aree protette, pedologia | `server.py` / `src/backend/hosted/backend.mjs` | Risoluzione e data del layer non sempre esplicitate nel codice; i tangent point possono essere vicini al punto richiesto | Cache backend 24h per la cartografia, dove applicabile |
| Open-Meteo Forecast API | Meteo previsti e storici | `weather()` in `server.py`; browser fallback in `src/frontend/clients/weather.mjs` | Dati modellistici, non misure del bosco; scala del meteo è di ordine di km | Cache app 1h per le richieste di meteo |
| Open-Meteo Elevation API | Quota, pendenza, orientamento derivati da DEM | `terrain()` in `server.py` / hosted backend | Pendenza e aspetto sono stime DEM da 90 m, non rilievi in campo | Backend 24h |
| Overpass API | Sentieri, aree naturali, riserve, confini protetti | `overpass_context()` | Dati OSM incompleti o non aggiornati; l'accessibilità non è garantita | Fallback locale con `data/catalog/trekking-fallback.json` |
| GBIF | Osservazioni botaniche storiche | `flora_context()` | Record storici, non presenza attuale; il codice non assume che un record significhi presenza oggi | Cache locale e filtro di distanza |
| Copernicus DEM / GLO-90 | Quota e rilievo | `terrain()` | Valori derivati da griglia 90 m | Cache backend 24h |

## Regole di trattamento dati

- `missing data != zero`: dati mancanti restano null/assenti.
- Non si inventano presenze, pH, micelio, incendî, storie di gestione o accessibilità.
- Le osservazioni botaniche storiche non equivalgono a floritura attuale.
- Le condizioni meteo sono modellistiche e non misure puntuali del terreno.
- Le geometrie cartografiche non certificano conformità legale o accessibilità.

## Contratti di origine

Le chiamate principali sono:

- `GET /api/environment?lat=...&lon=...`
- `GET /api/land?lat=...&lon=...`
- `GET /api/around?lat=...&lon=...&radius=...`

Il frontend non deve chiamare i provider esterni direttamente; usa il client centrale `src/frontend/clients/botanica-api.mjs`.

## Dati locali

### `data/catalog/trekking-fallback.json`

Catalogo locale di trekking e aree naturali usato come fallback robusto quando i provider live non rispondono o quando i risultati OSM sono parziali.

### `data/forecast/forecast-points.json`

Punti di riferimento per il forecast di boschi e ambiente. I punti sono usati come campioni di confronto per il ranking giornaliero e per la best window multi-giorno.

## TODO e limiti noti

- La data del layer regionale non è sempre recuperabile nel codice runtime.
- I layer WMS possono tornare dati di punti vicini; il backend filtra solo le geometrie contenenti il punto interrogato.
- L'accesso e la sicurezza dei sentieri non sono certificati dal dato cartografico.
- Le cache del backend sono semplici TTL in memoria; non costituiscono persistenza duratura.
- Le successive versioni del modello potrebbero richiedere una documentazione distinta per ogni singolo profilo di specie.
