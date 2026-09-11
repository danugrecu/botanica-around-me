# Architettura corrente reale

Stato osservato: 11 settembre 2026, tag `prototype-10` (`c1e4dab`). Questo documento descrive il codice presente, non la sola intenzione descritta in `ARCHITETTURA.md`.

## Verifica baseline

- `npm test`: non eseguito; PowerShell restituisce `npm : Termine 'npm' non riconosciuto`, quindi Node/npm non sono disponibili nel `PATH` dell'ambiente osservato.
- `npm run build`: stesso blocco ambientale, prima dell'avvio dello script Node. Non è possibile attribuire un errore applicativo al build da questo ambiente.
- `python -m unittest discover -s tests`: superato, 4 test eseguiti.
- Il codice non è stato modificato in questa fase. È comunque visibile un prerequisito statico del build: `scripts/build-hosted.mjs` legge `.openai/hosting.json`, che non è presente nel worktree visibile; va verificato in un ambiente di deployment prima di considerare il build riproducibile.

## Albero rilevante

```text
.
├── README.md / ARCHITETTURA.md / CONSEGNA-DANU.md
├── package.json
├── server.py                         # backend locale Python
├── src/frontend/                    # source frontend, organizzato per responsabilità attuali
│   ├── index.html, styles/main.css
│   ├── app/main.mjs
│   ├── around/around.mjs
│   ├── forecast/forecast.mjs
│   ├── ecology/ecology.mjs, model.mjs
│   ├── clients/weather.mjs
│   └── shared/display.mjs
├── src/backend/hosted/backend.mjs   # backend Worker hosted
├── data/catalog/trekking-fallback.json
├── data/forecast/forecast-points.json
├── vendor/leaflet/                  # Leaflet e licenza
├── dist/                            # esclusivamente output generato
├── scripts/
│   ├── build-hosted.mjs
│   ├── build_maremma_catalog.py
│   └── select_forecast_points.py
├── tests/
│   ├── ecology.test.mjs
│   ├── forecast.test.mjs
│   ├── weather.test.mjs
│   └── test_server.py
└── research/
    ├── metodo-v2.md
    └── maremma-territoriale-2026-09-11.md
```

`dist/` è ignorata da Git e viene ricreata dal build degli asset. `dist/server/index.js` e `dist/.openai/hosting.json` sono output del build hosted; il file `.openai/hosting.json` richiesto come input non è presente nel worktree visibile.

## Entry point

- Locale: `python3 server.py`, che serve `dist/` su `http://localhost:4173` e gestisce `/api/*` nello stesso handler.
- Browser: `dist/index.html`, prodotto da `src/frontend/index.html`, che carica prima `vendor/leaflet.js` e poi `app.mjs` come modulo.
- Hosted: `scripts/build-hosted.mjs` legge `src/backend/hosted/backend.mjs`, incorpora gli asset generati in `dist/` e scrive un Worker in `dist/server/index.js`; il Worker esporta `fetch()`.
- Test: `npm test` esegue i tre test Node e poi `unittest` Python.

## Caricamento frontend

1. `index.html` definisce le tre viste (`explore`, `diary`, `method`), controlli, contenitori della mappa e testi metodologici.
2. Leaflet locale viene caricato come script globale `L`.
3. `app.mjs` inizializza selettori, giorni, specie, zone e diario; crea la mappa Leaflet e i layer WMS.
4. `app.mjs` chiama `selectPoint()` sul punto iniziale, quindi `/api/environment`.
5. `setupForecast()` carica `forecast-points.json`, interroga `/api/environment` per i 21 punti e passa i risultati a `ecology.predict()`.
6. `setupAround()` interroga `/api/around`, fonde il risultato live con `trekking-fallback.json`, crea marcatori e aggiorna la vista Around Me.
7. Le fonti meteo non disponibili dal backend possono essere richieste direttamente dal browser tramite `weather.mjs`.

## Moduli frontend

### `src/frontend/app/main.mjs`
Controller principale e responsabilità miste: stato globale, navigazione, mappa, geolocalizzazione, richieste puntuali, confronto 3x3, rendering dell'analisi, diario/localStorage, export CSV/JSON e registrazione opzionale WebMCP. Contiene anche helper replicati per escape HTML, distanza e formattazione.

### `src/frontend/around/around.mjs`
Vista Around Me. Gestisce centro/raggio, richiesta `/api/around`, cache locale di 30 minuti, fusione con catalogo statico, layer trekking/flora/natura, rendering dei suggerimenti e testi sui limiti. Contiene una propria implementazione di distanza e sanitizzazione.

### `src/frontend/forecast/forecast.mjs`
Carica i 21 punti, mantiene stato/cache locale per punto fino a un'ora, esegue richieste concorrenti a `/api/environment`, calcola graduatorie e finestre consecutive tramite `summarizeForecast()` e aggiorna marcatori/aree.

### `src/frontend/ecology/ecology.mjs`
Business logic ecologica pura rispetto a HTTP/UI. Definisce profili, etichette vegetazionali, `habitat()`, aggregazioni meteo e `predict()`. Il gruppo `porcini` prende il massimo dei quattro profili. Non modificare soglie o pesi durante il riordino.

### `src/frontend/ecology/model.mjs`
Catalogo delle 21 zone, funzione `today()`, `level()` e un estimatore v1 `estimate()`. Il percorso principale usa `zones`, `today` e `level`; `estimate()` appare come compatibilità/legacy e non è importato dai moduli applicativi correnti.

### `src/frontend/clients/weather.mjs`
Client browser Open-Meteo, punteggio meteo per l'uscita e riduzione della risposta a sette giorni. Duplica l'algoritmo `outdoorScore()` del backend.

### `src/frontend/shared/display.mjs`
Unico helper di presentazione per percentuali.

### `src/frontend/index.html` e `src/frontend/styles/main.css`
HTML, contenuti metodologici, link alle fonti, controlli e stile responsive. L'HTML contiene anche documentazione utente e riferimenti alla ricerca, quindi dati, contenuto editoriale e UI sono accoppiati.

### `vendor/leaflet/`
Leaflet 1.9.4 distribuito localmente con licenza e immagini.

## Dipendenze tra moduli JS

```text
index.html -> Leaflet globale -> app.mjs
app.mjs -> display.mjs
app.mjs -> forecast.mjs -> ecology.mjs -> model.mjs
app.mjs -> around.mjs -> weather.mjs
app.mjs -> weather.mjs
forecast.mjs -> weather.mjs, ecology.mjs, display.mjs
around.mjs -> weather.mjs
```

`ecology.mjs` è il confine più vicino alla logica ecologica; `app.mjs` è invece il principale punto di orchestrazione e rendering.

## API e flussi backend

### `/api/environment`

Riceve `lat` e `lon`, verifica area e arrotonda a cinque decimali. Il backend locale lancia in parallelo `cartography()` per UCS/vegetazione/IFT, `cartography(..., soil=True)` per pedologia, `terrain()` per elevation e `weather()` per Open-Meteo. Il Worker esegue lo stesso insieme con `environment()`. Il frontend usa `forest`, `soil`, `terrain`, `weather`, poi calcola localmente `habitat()` e `predict()`.

### `/api/land`

Riceve le stesse coordinate e restituisce bosco, suolo e rilievo senza meteo. Serve al confronto 3x3: il frontend riusa il meteo del centro e sostituisce solo territorio/suolo/rilievo del vicino.

### `/api/around`

Riceve coordinate e `radius` tra 5, 10, 25 e 50 km. `around_context()`/`aroundContext()` interroga in parallelo Overpass, GBIF e Open-Meteo. Filtra poi i risultati con distanza geodetica, limita trails a 40, nature a 30 e flora a 35 specie. Il browser fonde i risultati con il catalogo statico e può usare un fallback meteo diretto.

## Fonti e adattatori

- Regione Toscana WMS/OWS: UCS 2019, vegetazione forestale, IFT, pedologia, strati mappa per sentieri, NatNet2, aree protette e Natura 2000.
- Open-Meteo Forecast API: dati giornalieri e orari per 30 giorni passati/7 futuri.
- Open-Meteo Elevation API: cinque punti a distanza nominale di 90 m per quota, pendenza ed esposizione.
- OpenStreetMap/Overpass: relazioni `route=hiking`, riserve e aree protette nominate.
- GBIF Occurrence API: record botanici georeferenziati degli ultimi cinque anni.
- OpenStreetMap tile: sfondo mappa nel browser.
- Geolocation API: posizione e accuratezza dichiarata dal dispositivo.
- Parco Regionale della Maremma: riferimenti e dati ufficiali usati nella generazione del catalogo statico.

Dettagli, cache e TODO sono in `docs/DATA_SOURCES.md`.

## Modello Around Me

Il centro può derivare dal punto selezionato, GPS o default; il raggio è 5/10/25/50 km. I risultati sono ordinati per distanza geodetica dal centro, non per percorso stradale. La panoramica combina il risultato più vicino, il meteo del giorno e il miglior risultato Funghi, ma il suo `outdoor_score` è solo una formula euristica su pioggia, temperatura massima e vento. Il catalogo statico evita che un errore Overpass svuoti trekking e luoghi naturali.

## Modello Funghi/Ecology

`predict()` richiede almeno 30 giorni precedenti coerenti. Usa acqua 35%, temperatura 25%, ospiti 25%, sequenza pioggia 10% e rilievo 5%, con modificatori per stress, gelo, siccità e stagione. UCS 2019 decide se il punto è bosco; la vegetazione regionale o IFT storico specifica l'ospite; dati mancanti restano mancanti. Un habitat non specifico limita il punteggio a 69; non-bosco o copertura ignota producono `score: null`. `porcini` seleziona il massimo tra quattro profili. Il risultato è compatibilità ambientale euristica, non probabilità calibrata.

## Forecast

`data/forecast/forecast-points.json` contiene 21 punti selezionati e verificati dallo script. `forecast.mjs` usa tre worker concorrenti nel browser, cache `localStorage` di un'ora e un nuovo tentativo manuale. Per ogni punto usa l'intero `environment`, calcola il giorno corrente e la finestra consecutiva con indice almeno 70. Punti senza copertura valida non ottengono indice.

## Confronto 3x3

`app.mjs` crea nove coordinate a passo nominale di circa 500 m, usa due worker, interroga `/api/land` per gli otto vicini e assegna loro il meteo del centro. Il ranking viene rifatto localmente; selezionare un vicino carica poi il suo meteo completo tramite `selectPoint()`.

## Diario e `localStorage`

Il diario vive in `app.mjs`, usa la chiave legacy `fungapp-logs-v1`, filtra date valide in lettura e mantiene retrocompatibilità con uscite senza coordinate moderne. Salva coordinate, data, specie, esito, durata, note, indice eventualmente disponibile, meteo e snapshot dei fattori. Esporta CSV con protezione dai prefissi formula e backup JSON versione 2. Le note non vengono inviate al server.

Around Me usa chiavi per centro/raggio (`botanica-around-v3:*`); il forecast usa chiavi per punto (`fungapp-prediction-v2:*`). Sono cache browser separate dal cache server in memoria.

## Cataloghi JSON

- `data/forecast/forecast-points.json`: 21 punti, con coordinate verificate e data di controllo.
- `data/catalog/trekking-fallback.json`: catalogo statico di 426 itinerari e 28 luoghi secondo documentazione e file presenti, più metadati di fonte/verifica.
- `vendor/leaflet/`: dipendenza Leaflet e licenza.

I JSON sorgente sono fuori da `dist/`; il build li pubblica in `dist/` con gli stessi URL runtime.

## Script

- `build-assets.mjs`: ricrea `dist/` dagli asset sotto `src/frontend/`, `data/` e `vendor/`, senza richiedere configurazione hosted.
- `build-hosted.mjs`: genera gli asset, legge `src/backend/hosted/backend.mjs`, incorpora base64 e legge `.openai/hosting.json`; scrive il Worker generato.
- `build_maremma_catalog.py`: legge tre file esterni in `/private/tmp`, ritaglia su un confine, arricchisce con fonti Parco e scrive `data/catalog/trekking-fallback.json`.
- `select_forecast_points.py`: importa il backend locale, interroga la cartografia per campioni vicini e scrive `data/forecast/forecast-points.json` con data hard-coded `2026-09-11`.

I due script Python di catalogo non sono riproducibili dalla sola repository: input, percorso Unix e data di acquisizione non sono inclusi/configurabili.

## Test

- `ecology.test.mjs`: 42 combinazioni specie/giorno e casi di non-bosco, copertura ignota, dati null, assenza suolo, siccità, gelo, habitat generico, scenario e massimo porcini.
- `forecast.test.mjs`: assenza dati, giorno selezionato, massimo e finestra consecutiva.
- `weather.test.mjs`: punteggio meteo, proiezione sette giorni e validazione minima del catalogo trekking.
- `test_server.py`: parser GML, poligoni con buchi, distanza, bounds e outdoor score.

Non esistono contract test che confrontino direttamente le risposte di Python e Worker, né test browser/integrazione live nel codice presente.

## Deployment

### Locale

`python server.py` serve solo su loopback `127.0.0.1:4173`, con `dist/` come directory statica. Gli asset vengono preparati da `npm run build:assets`; il server accetta API solo con Host/origin locali, usa cache in memoria, timeout upstream di 25 secondi e non persiste coordinate.

### Hosted

`build-hosted.mjs` produce un Worker monolitico con backend e asset inline. L'autenticazione dei due account è delegata al dispatcher/Sites esterno, come indicato nei commenti; non è implementata nell'app. Il manifest `.openai/hosting.json` è una configurazione esterna al codice applicativo e non è presente nell'istantanea esaminata.

## Criticità osservate

- **HIGH**: `server.py` e `hosted/backend.mjs` duplicano tutta la logica dei provider e non hanno contract test condivisi; possono divergere senza rilevazione.
- **HIGH**: il build dipende da un manifest `.openai/hosting.json` non presente nel worktree osservato e da Node/npm installati; il deployment non è riproducibile dalla repository sola.
- **HIGH**: il catalogo statico e i forecast point sono dati generati dentro `dist/` senza input versionati; la provenance è parziale e la rigenerazione è ambientale.
- **MEDIUM**: la separazione fisica è stata applicata, ma il build deve restare il solo modo per ricreare `dist/` e i test dipendono dall'output generato.
- **MEDIUM**: `app.mjs` concentra UI, mappa, networking, rendering, diario e WebMCP; responsabilità miste e alta superficie di regressione.
- **MEDIUM**: URL/provider sono distribuiti tra backend, frontend, HTML, `model.mjs`, script e ricerca; non esiste un registro operativo unico.
- **MEDIUM**: distanza, `outdoorScore` ed escape HTML sono replicati tra moduli/runtime; le copie possono produrre risultati differenti.
- **MEDIUM**: frontend e backend usano cache diverse e non documentano uno schema versionato per le risposte API.
- **LOW**: `model.mjs` mantiene `estimate()` v1 non usato dal percorso principale; va confermato prima di rimuoverlo.
- **LOW**: alcuni valori di area/limiti e date sono hard-coded in moduli diversi; aumentano il rischio di incoerenza territoriale o temporale.
- **LOW**: contenuti metodologici e link fonte sono incorporati in `index.html` invece di essere separati dalla struttura UI.
