# ARCHITECTURE.md

## Obiettivo dell'architettura

Il progetto è un'applicazione frontend statica con backend locale e backend hosted compatibile. Il codice sorgente vive sotto `src/`, i dati runtime sotto `data/`, la libreria mappe Leaflet sotto `vendor/leaflet`, e i risultati di build sotto `dist/`.

L'architettura mantiene una separazione netta tra:

- orchestrazione UI e stato `src/frontend/app/`
- rendering e layer mappa `src/frontend/map/`
- accesso ai dati `src/frontend/clients/`
- logica ecologica e forecast `src/frontend/ecology/` e `src/frontend/forecast/`
- dominio Around Me `src/frontend/around/`
- persistenza locale `src/frontend/diary/`
- helper condivisi e geografia `src/frontend/shared/`

## Struttura del repository

```text
.
├── README.md
├── ARCHITECTURE.md
├── AGENTS.md
├── DATA_SOURCES.md
├── ON-BOARDING.md
├── package.json
├── server.py
├── src/
│   ├── backend/
│   │   └── hosted/
│   │       └── backend.mjs
│   └── frontend/
│       ├── app/
│       ├── analysis/
│       ├── around/
│       ├── clients/
│       ├── diary/
│       ├── ecology/
│       ├── forecast/
│       ├── map/
│       ├── shared/
│       ├── index.html
│       └── styles/
├── data/
│   ├── catalog/
│   └── forecast/
├── vendor/
│   └── leaflet/
├── scripts/
│   ├── build-assets.mjs
│   ├── build-hosted.mjs
│   ├── build_maremma_catalog.py
│   └── select_forecast_points.py
├── tests/
├── dist/
├── .gitignore
└── .vscode/
```

## Frontend

### `src/frontend/app/main.mjs`

È il controller principale dell'app. Coordina la UI, la mappa, la selezione del punto, il diario, i risultati di forecast e i rendering delle schede.

### `src/frontend/map/map.mjs`

Contiene la logica Leaflet: creazione della mappa, layer base, marker, raggio, polygon e aggiornamento dei layer vicini.

### `src/frontend/around/around.mjs`

Gestisce il quadro d'insieme “Around Me”: centro/raggio, percorsi, flora, natura, aree protette e meteo del contesto.

### `src/frontend/forecast/forecast.mjs`

Carica i punti campione, mantiene la cache locale e confronta i risultati ambientali per ottenere la migliore finestra favorevole in 7 giorni.

### `src/frontend/ecology/ecology.mjs`

Contiene la logica di punteggio ecologico: profili species, fattori idrici/termici/ospiti e l'euristica di compatibilità ambientale.

### `src/frontend/ecology/model.mjs`

Contiene metadata del modello e cataloghi di compatibilità; include anche il percorso legacy `estimate()` per compatibilità esistente.

### `src/frontend/clients/botanica-api.mjs`

È il client canonico per le API del backend:

- `/api/environment`
- `/api/land`
- `/api/around`

### `src/frontend/clients/weather.mjs`

È l'eccezione intenzionale al client centrale: usa il fallback browser di Open-Meteo per la parte meteo quando il backend non restituisce dati sufficienti.

## Backend

### `server.py`

È il backend locale. Espone endpoint API e gestisce la composizione delle richieste verso provider regionali, Open-Meteo e OSM/Overpass.

### `src/backend/hosted/backend.mjs`

È la controparte hosted del backend locale. Usa lo stesso contratto applicativo per deployment esterno.

## Dati ed asset

### `data/catalog/trekking-fallback.json`

Catalogo locale di trekking e luoghi naturali usato come fallback stabile.

### `data/forecast/forecast-points.json`

Punti campione usati per il forecast territoriale e il ranking.

### `vendor/leaflet/`

Leaflet è vendorizzato nel repository e non va installato con npm.

### `dist/`

Directory di output generato. Non è sorgente. Viene costruita da `scripts/build-assets.mjs`.

## Build e runtime

Comandi validi e attuali:

```bash
npm run build:assets
npm test
npm start
npm run build
python server.py
```

### `npm run build:assets`

Genera `dist/` a partire da `src/`, `data/` e `vendor/`.

### `npm test`

Esegue build degli asset e i test JavaScript/Python.

### `npm start`

Esegue `npm run build:assets` e poi `python server.py` sulla porta `4173`.

### `npm run build`

Genera il Worker hosted. Richiede `.openai/hosting.json` e non è un install di dipendenze.

### `python server.py`

Avvia direttamente il backend locale usando la build già presentata in `dist/`.

## Contratti API principali

### `GET /api/environment?lat=...&lon=...`

Ritorna contesto ambientale completo del punto: bosco, suolo, rilievo e meteo.

### `GET /api/land?lat=...&lon=...`

Ritorna contesto territoriale senza meteo, usato per il confronto 3x3.

### `GET /api/around?lat=...&lon=...&radius=...`

Ritorna trekking, flora, natura e clima locale entro il raggio richiesto.

## Regole tecniche importanti

- `dist/` è output generato; non si modifica manualmente.
- `missing data != zero`: dati mancanti restano null o assenti.
- Prove, risoluzione e limiti delle fonti devono essere preservati.
- Il frontend non chiama i provider diretti; usa il client centralizzato, salvo l'eccezione intenzionale del fallback browser meteo.
- Nessuna dipendenza installabile di Node è richiesta nel repository attuale.
- Leaflet è vendorizzato e non va installato.

## Limiti noti

- Il backend locale è ancora monolitico.
- Il Worker hosted duplica la logica del backend locale.
- Il modello ecologico è euristico e non scientificamente validato.
- Le fonti hanno età e risoluzioni diverse e vanno usate con prudenza.
- I dati mancanti non si trasformano mai in zero.
