# Migration Map: Step 2.1 / 2.2 / 2.3

Stato: separazione source/data/vendor applicata; build e documentazione aggiornati. La decomposizione per feature e l'organizzazione interna dei backend restano fasi successive.

## Obiettivo

Separare fisicamente i quattro gruppi oggi mescolati in `dist/`:

- **SOURCE**: codice frontend e asset statici modificabili;
- **DATA**: JSON runtime/cataloghi;
- **VENDOR**: dipendenze di terze parti distribuite localmente;
- **GENERATED OUTPUT**: file creati dal build o necessari solo al deployment.

La scelta per questa prima migrazione è volutamente semplice:

```text
src/frontend/       # moduli JS, index.html, style.css
 data/catalog/      # cataloghi statici runtime
 data/forecast/     # punti campione runtime
 vendor/leaflet/    # Leaflet e licenza/immagini
 dist/              # output generato soltanto
```

`public/` non viene introdotta: l'attuale build tratta HTML, CSS e moduli frontend come un unico albero di asset relativi; `src/frontend/` conserva questa semplicità senza aggiungere un altro confine.

## Struttura attuale

```text
dist/
├── app.mjs                         SOURCE
├── around.mjs                      SOURCE
├── display.mjs                     SOURCE
├── ecology.mjs                     SOURCE
├── forecast.mjs                    SOURCE
├── forecast-points.json            DATA
├── index.html                      SOURCE / static entry point
├── model.mjs                       SOURCE
├── server/index.js                 GENERATED OUTPUT
├── style.css                       SOURCE / static asset
├── trekking-fallback.json          DATA
├── vendor/                         VENDOR
│   ├── images/layers.png
│   ├── images/layers-2x.png
│   ├── leaflet.css
│   ├── leaflet.js
│   └── LEAFLET-LICENSE.txt
└── weather.mjs                     SOURCE
```

La scansione effettiva ha trovato 16 file. `dist/.openai/` non è presente nella working tree osservata, ma il build lo crea e vi scrive il manifest hosted; viene quindi mappato come output generato.

## Struttura target immediata

```text
src/
└── frontend/
    ├── app.mjs
    ├── around.mjs
    ├── display.mjs
    ├── ecology.mjs
    ├── forecast.mjs
    ├── index.html
    ├── model.mjs
    ├── style.css
    └── weather.mjs

data/
├── catalog/
│   └── trekking-fallback.json
└── forecast/
    └── forecast-points.json

vendor/
└── leaflet/
    ├── images/layers.png
    ├── images/layers-2x.png
    ├── leaflet.css
    ├── leaflet.js
    └── LEAFLET-LICENSE.txt

dist/                                  # GENERATED OUTPUT ONLY
├── app.mjs
├── around.mjs
├── display.mjs
├── ecology.mjs
├── forecast.mjs
├── forecast-points.json
├── index.html
├── model.mjs
├── server/index.js
├── style.css
├── trekking-fallback.json
├── vendor/...
└── weather.mjs
```

L'elenco dentro `dist/` rappresenta l'output runtime che il server locale deve continuare a servire e che il Worker deve incorporare. Non rappresenta più file sorgente da modificare.

## Mapping completo CURRENT PATH -> TARGET PATH

| Current path | Categoria | Target path | Note |
|---|---|---|---|
| `dist/app.mjs` | SOURCE | `src/frontend/app/main.mjs` | Controller frontend; contenuto invariato nello Step 2.2. Il build lo ricopierà in `dist/app.mjs`. |
| `dist/around.mjs` | SOURCE | `src/frontend/around/around.mjs` | Modulo Around Me; nessuna separazione interna in questa fase. |
| `dist/display.mjs` | SOURCE | `src/frontend/shared/display.mjs` | Helper di presentazione. |
| `dist/ecology.mjs` | SOURCE | `src/frontend/ecology/ecology.mjs` | Logica ecologica; solo spostamento fisico, nessuna modifica. |
| `dist/forecast.mjs` | SOURCE | `src/frontend/forecast/forecast.mjs` | Modulo Forecast; nessuna modifica comportamentale. |
| `dist/index.html` | SOURCE | `src/frontend/index.html` | Entry point statico; scelta esplicita per evitare `public/`. |
| `dist/model.mjs` | SOURCE | `src/frontend/ecology/model.mjs` | Catalogo zone e compatibilità v1 conservati come sono. |
| `dist/style.css` | SOURCE | `src/frontend/styles/main.css` | Asset statico frontend; resta accanto all'entry point. |
| `dist/weather.mjs` | SOURCE | `src/frontend/clients/weather.mjs` | Client browser e fallback meteo. |
| `dist/forecast-points.json` | DATA | `data/forecast/forecast-points.json` | Dati runtime; il build li pubblicherà come `dist/forecast-points.json`. |
| `dist/trekking-fallback.json` | DATA | `data/catalog/trekking-fallback.json` | Catalogo runtime; il build lo pubblicherà come `dist/trekking-fallback.json`. |
| `dist/vendor/leaflet.js` | VENDOR | `vendor/leaflet/leaflet.js` | Leaflet distribuito localmente. |
| `dist/vendor/leaflet.css` | VENDOR | `vendor/leaflet/leaflet.css` | CSS Leaflet. |
| `dist/vendor/images/layers.png` | VENDOR | `vendor/leaflet/images/layers.png` | Immagine richiesta da Leaflet CSS. |
| `dist/vendor/images/layers-2x.png` | VENDOR | `vendor/leaflet/images/layers-2x.png` | Variante ad alta densità. |
| `dist/vendor/LEAFLET-LICENSE.txt` | VENDOR | `vendor/leaflet/LEAFLET-LICENSE.txt` | Licenza da conservare insieme alla dipendenza. |
| `dist/server/index.js` | GENERATED OUTPUT | `dist/server/index.js` | Worker generato da `src/backend/hosted/backend.mjs`; non viene spostato in `src/`. |
| `dist/.openai/hosting.json` | GENERATED OUTPUT | `dist/.openai/hosting.json` | Non presente ora, ma creato da `scripts/build-hosted.mjs` copiando `.openai/hosting.json`. |
| `.openai/hosting.json` | BUILD INPUT / deployment config | `.openai/hosting.json` | Non è dentro `dist/`; resta input di build fuori dall'output. Non presente nella working tree osservata. |

## Riferimenti da aggiornare nello Step 2.2/2.3

### Import JavaScript

Gli import relativi interni sono presenti in:

- `src/frontend/app/main.mjs`: `../shared/display.mjs`, `../forecast/forecast.mjs`, `../around/around.mjs`, `../clients/weather.mjs`, `../ecology/ecology.mjs`.
- `src/frontend/around/around.mjs`: `../clients/weather.mjs`.
- `src/frontend/ecology/ecology.mjs`: `./model.mjs`.
- `src/frontend/forecast/forecast.mjs`: `../shared/display.mjs`, `../ecology/ecology.mjs`, `../clients/weather.mjs`.

Dopo lo spostamento nello stesso `src/frontend/`, questi import possono restare invariati. Il build deve copiare l'intero albero nella radice di `dist/`, così gli import runtime restano identici.

### Fetch dei JSON

- `dist/around.mjs` esegue `fetch('trekking-fallback.json')`.
- `dist/forecast.mjs` esegue `fetch('forecast-points.json')`.

Le stringhe sorgente possono restare invariate se il build pubblica i due file in `dist/` con gli stessi nomi. Devono essere aggiornati soltanto i percorsi di input letti dal build e dagli script generatori:

- `scripts/build_maremma_catalog.py` scrive oggi `dist/trekking-fallback.json`; nello Step 2.2/2.3 dovrà scrivere o preparare `data/catalog/trekking-fallback.json`.
- `scripts/select_forecast_points.py` scrive oggi `dist/forecast-points.json`; dovrà scrivere o preparare `data/forecast/forecast-points.json`.

### Riferimenti HTML

`dist/index.html` contiene:

- `vendor/leaflet.css` nel `<link>`;
- `style.css` nel `<link>`;
- `vendor/leaflet.js` nello `<script>`;
- `app.mjs` nel `<script type="module">`.

Poiché l'HTML verrà pubblicato come `dist/index.html`, questi quattro riferimenti possono restare invariati. Non devono puntare direttamente a `src/frontend/` o `vendor/` nel runtime.

### `server.py`

- `ROOT / "dist"` continua a essere la directory statica servita.
- Gli endpoint `/api/*` non leggono direttamente i moduli frontend o i JSON statici.
- Nessun cambiamento interno a `server.py` è previsto nello Step 2.1; dopo il build dovrà continuare a servire l'output con la stessa struttura runtime.

### `scripts/build-hosted.mjs`

Oggi `collect(path.join(root, 'dist'))` usa `dist/` come sorgente e scrive il Worker in `dist/server/index.js`. Nello Step 2.3 dovrà:

1. leggere gli asset da `src/frontend/`, `data/` e `vendor/leaflet/`;
2. copiarli/impacchettarli con i nomi runtime attuali (`/index.html`, `/app.mjs`, `/forecast-points.json`, `/vendor/leaflet.js`, ecc.);
3. continuare a escludere `server` e `.openai` dalla raccolta degli asset;
4. scrivere `dist/server/index.js` e `dist/.openai/hosting.json` come output;
5. leggere `.openai/hosting.json` come input di build, senza inventare il file se assente.

### `package.json`

Gli script attuali sono:

- `start`: `python3 server.py`;
- `test`: test Node da `tests/*.test.mjs` e test Python;
- `build`: `node scripts/build-hosted.mjs`.

Non serve introdurre dipendenze. Potrebbe servire solo aggiornare il comportamento del comando `build`, mantenendo gli stessi nomi pubblici.

### Test

I test Node importano ancora da `../dist/`:

- `tests/ecology.test.mjs` -> `../dist/ecology.mjs`;
- `tests/forecast.test.mjs` -> `../dist/forecast.mjs`;
- `tests/weather.test.mjs` -> `../dist/weather.mjs` e `../dist/trekking-fallback.json`.

Nello Step 2.3 questi riferimenti dovranno continuare a puntare all'output generato, dopo una build riuscita. Non vanno aggiornati per importare direttamente `src/frontend/`, perché ciò confonderebbe test del prodotto con test della sorgente prima del build.

### Script Python

- `scripts/build_maremma_catalog.py`: input esterni in `/private/tmp`; output attuale `dist/trekking-fallback.json`.
- `scripts/select_forecast_points.py`: importa `server.py`; output attuale `dist/forecast-points.json`.

Lo Step 2.1 non cambia questi script. Il loro output target e la riproducibilità degli input sono temi dello Step 2.2/2.3 e soprattutto dello Step 3.

### Documentazione

I riferimenti di percorso da aggiornare dopo lo spostamento includono:

- `ARCHITETTURA.md`: tabella file, flusso frontend, percorso dei cataloghi, istruzioni di modifica e output generato;
- `README.md`: descrizione di `dist/` e forecast/cataloghi se indicati come sorgente;
- `CONSEGNA-DANU.md`: descrizione della struttura e divieto di modificare output;
- `research/metodo-v2.md`: riferimento a `dist/ecology.mjs`;
- `docs/CURRENT_ARCHITECTURE.md`: albero, moduli, cataloghi, script e deployment;
- `docs/DATA_SOURCES.md`: riferimenti ai JSON/cataloghi e ai moduli frontend;
- `docs/REFACTOR_PLAN.md`: percorsi già aggiornati per la fase strutturale;
- `AGENTS.md`: regola su `dist/server/index.js` già valida, da integrare con la regola che `dist/` è output.

Questi aggiornamenti documentali appartengono allo Step 2.2/2.3, non a questa fase preparatoria.

## Rischi principali

- **HIGH**: il build attuale usa `dist/` come input; spostare i file senza aggiornare `scripts/build-hosted.mjs` rompe la pubblicazione hosted.
- **HIGH**: il build richiede `.openai/hosting.json`, che non è presente nel worktree osservato; non va sostituito con configurazione inventata.
- **HIGH**: rimuovere `dist/` prima di aver ricreato l'output può rendere inutilizzabile il server locale e impedire i test Node.
- **MEDIUM**: percorsi relativi di import, JSON, CSS e immagini Leaflet devono rimanere identici nell'output runtime.
- **MEDIUM**: gli script Python scrivono direttamente in `dist/` e dovranno essere coordinati con la nuova destinazione dei dati.
- **MEDIUM**: modificare i test per leggere `src/` invece di `dist/` cambierebbe implicitamente il contratto di verifica del build.
- **LOW**: documentazione e commenti contengono molti percorsi `dist/`; dopo lo spostamento potrebbero diventare fuorvianti senza alterare il runtime.

## Checklist dopo lo spostamento

Questa checklist sarà eseguita nello Step 2.2/2.3, non ora:

- [ ] `src/frontend/` contiene esattamente i nove file frontend mappati.
- [ ] `data/catalog/trekking-fallback.json` e `data/forecast/forecast-points.json` contengono byte/contenuto atteso.
- [ ] `vendor/leaflet/` contiene JS, CSS, immagini e licenza.
- [ ] `dist/` è vuota o contiene solo output creato dal build prima della ricostruzione.
- [ ] Il build legge `src/`, `data/` e `vendor/`, non `dist/` come sorgente.
- [ ] `dist/index.html` conserva riferimenti funzionanti a `style.css`, `app.mjs` e `vendor/`.
- [ ] Tutti gli import relativi dei moduli risolvono nell'output.
- [ ] I fetch dei due JSON trovano i file nelle stesse URL runtime.
- [ ] `python3 server.py` continua a servire la UI da `dist/`.
- [ ] `npm test` resta verde dopo una build riuscita.
- [ ] `npm run build` ricrea `dist/server/index.js` e `dist/.openai/hosting.json` quando il manifest è disponibile.
- [ ] Nessun contenuto di `server.py`, `hosted/backend.mjs`, `ecology.mjs` o altri algoritmi è cambiato semanticamente.
- [ ] `git diff --check` è pulito e il diff mostra solo spostamenti, build/path updates e documentazione.

## Stato della migrazione strutturale

Step 2.1 completato come analisi. Step 2.2 e 2.3 applicati: i file sono nei percorsi target, gli import frontend sono stati aggiornati per la nuova struttura, `build-assets.mjs` ricrea `dist/` e `build-hosted.mjs` usa gli asset generati e la sorgente hosted sotto `src/backend/hosted/`. Step 2.4 è verificabile dopo un build Node riuscito; non sono stati modificati algoritmi, contratti API o dataset.
