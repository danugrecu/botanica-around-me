# Piano di refactoring incrementale

Ogni step è pensato come un commit isolato. La logica ecologica, il contratto pubblico e la UI devono restare invariati; se un test fallisce, lo step non è completo.

## Baseline prima degli step

**OBIETTIVO**: registrare lo stato iniziale e l'ambiente necessario.

**FILE COINVOLTI**: documentazione esistente, `package.json`, `docs/`.

**RISCHIO**: confondere un limite dell'ambiente con un difetto del codice.

**TEST DA ESEGUIRE**: `npm test`; `npm run build`; `python3 -m unittest discover -s tests` come controllo parziale se Node non è disponibile.

**CRITERIO DI COMPLETAMENTO**: esiti e prerequisiti riportati; nessun codice applicativo modificato.

**COMMIT MESSAGE SUGGERITO**: `docs: record prototype-10 baseline`

## 1. Separare la documentazione di stato

**OBIETTIVO**: rendere esplicita l'architettura reale, le fonti e i limiti senza toccare il runtime.

**FILE COINVOLTI**: `docs/CURRENT_ARCHITECTURE.md`, `docs/DATA_SOURCES.md`, `AGENTS.md`.

**RISCHIO**: basso; rischio principale di documentare intenzioni non implementate.

**TEST DA ESEGUIRE**: rilettura incrociata con codice; `npm test`; `npm run build`.

**CRITERIO DI COMPLETAMENTO**: ogni endpoint, fonte, cache e limite ha un riferimento al codice o un TODO.

**COMMIT MESSAGE SUGGERITO**: `docs: document current architecture and sources`

## 2. Separate source, data, vendor and generated output

Questa è la prima fase di codice. È esclusivamente strutturale: non spezza moduli, non cambia algoritmi, API, UI o responsabilità interne. I file applicativi vengono solo spostati/copiedi e i percorsi del build vengono aggiornati per conservare lo stesso runtime.

### 2.1 Preparare i confini e la mappa di migrazione

**OBIETTIVO**: creare i contenitori target e registrare una mappa uno-a-uno tra percorsi attuali e percorsi futuri, senza cambiare ancora gli import o il runtime.

**FILE COINVOLTI**: nuovi percorsi `src/frontend/`, `data/catalog/`, `data/forecast/`, `vendor/leaflet/`, `public/` se necessario; `docs/TARGET_ARCHITECTURE.md`; eventuale nota di manifest nel build.

**PERCORSI PRIMA / DOPO**:

```text
dist/app.mjs, around.mjs, ecology.mjs, forecast.mjs, weather.mjs,
dist/model.mjs, display.mjs
	-> src/frontend/

dist/index.html, dist/style.css
	-> src/frontend/ o public/ secondo il ruolo statico definito dal build

dist/forecast-points.json
	-> data/forecast/forecast-points.json

dist/trekking-fallback.json
	-> data/catalog/trekking-fallback.json

dist/vendor/*
	-> vendor/leaflet/*

dist/server/* e dist/.openai/*
	-> restano output generati sotto dist/
```

**RISCHIO**: basso; nessun comportamento viene eseguito in questa sotto-fase, ma una mappa incompleta può produrre spostamenti incoerenti.

**TEST**: controllo dei percorsi esistenti, inventario file, `git diff --check`; nessun test applicativo richiesto oltre alla baseline documentata.

**CRITERIO DI COMPLETAMENTO**: mapping completo e approvato; ogni file attualmente in `dist/` è classificato come source, data, vendor o output generato.

**COMMIT MESSAGE SUGGERITO**: `build: define source data vendor output boundaries`

### 2.2 Spostare sorgenti, dati statici e vendor

**OBIETTIVO**: separare fisicamente il materiale modificabile dall'output, mantenendo invariato il contenuto dei file.

**FILE COINVOLTI**: i moduli JS, `index.html`, `style.css`, i due JSON runtime e `dist/vendor/`; `.gitignore` solo se necessario per distinguere output da sorgenti.

**PERCORSI PRIMA / DOPO**: applicare la mappa della sotto-fase 2.1. In particolare, nessun file di `server.py`, `hosted/backend.mjs`, `ecology.mjs`, `around.mjs`, `forecast.mjs` o del diario viene modificato internamente: cambiano solo la posizione fisica e, se indispensabile, i riferimenti relativi gestiti dal build.

**RISCHIO**: medio; import relativi, URL degli asset, licenza Leaflet e file richiesti a runtime possono rompersi.

**TEST**: confronto hash/contenuto prima e dopo; controllo che tutti gli import relativi restino risolvibili dopo la generazione; verifica presenza di JSON e vendor; `npm test` e `npm run build` quando disponibili.

**CRITERIO DI COMPLETAMENTO**: nessuna perdita o modifica semantica dei file; i sorgenti non risiedono più in `dist/`; dati e vendor hanno percorsi distinti; il diff contiene solo spostamenti e aggiornamenti di percorso.

**COMMIT MESSAGE SUGGERITO**: `build: move frontend data and vendor sources`

### 2.3 Aggiornare il build per ricreare `dist/`

**OBIETTIVO**: fare in modo che `dist/` venga prodotto da source, data e vendor e contenga solo asset runtime generati, incluso il Worker hosted.

**FILE COINVOLTI**: `scripts/build-hosted.mjs`, `package.json` solo se occorre aggiungere un comando esplicito, `.gitignore`, eventuale manifest di build già previsto dal repository; nessuna modifica interna a `server.py` o `hosted/backend.mjs`.

**PERCORSI PRIMA / DOPO**: il build legge `src/frontend/`, `data/` e `vendor/leaflet/` invece di usare `dist/` come sorgente; scrive gli asset frontend, i JSON e `dist/server/index.js` sotto `dist/`. `hosted/backend.mjs` resta sorgente backend e non viene incorporato come file modificabile dentro `dist/`.

**RISCHIO**: alto; un errore nei percorsi può rompere sia il server locale, che continua a servire `dist/`, sia il Worker hosted.

**TEST**: build pulito in una directory temporanea o dopo pulizia controllata di `dist/`; verifica elenco asset, import browser, manifest e dimensione del Worker; `npm test`; `npm run build`.

**CRITERIO DI COMPLETAMENTO**: una build ripetibile ricrea tutti gli asset runtime necessari; `dist/` non è input del build, salvo eventuali directory temporanee esplicitamente escluse; local server e hosted ricevono gli stessi asset funzionali della baseline.

**COMMIT MESSAGE SUGGERITO**: `build: generate dist from separated sources`

### 2.4 Rimuovere gli artefatti sorgente residui da `dist/`

**OBIETTIVO**: chiudere la fase strutturale dopo una build verificata, lasciando in `dist/` esclusivamente output generato.

**FILE COINVOLTI**: residui sotto `dist/`, `.gitignore`, `scripts/build-hosted.mjs` se emerge un asset non classificato; documentazione del build se cambia il workflow.

**PERCORSI PRIMA / DOPO**: ogni sorgente/data/vendor residuo sotto `dist/` deve avere il corrispondente in `src/`, `data/` o `vendor/`; restano solo output prodotti dal build, come `dist/server/index.js`, manifest copiati e asset runtime.

**RISCHIO**: medio-alto; eliminare un file ancora richiesto da un percorso relativo può produrre regressioni runtime.

**TEST**: `npm test`; `npm run build`; `python3 -m unittest discover -s tests`; smoke locale con `python3 server.py` se l'ambiente lo consente; controllo che `dist/` contenga esclusivamente output dichiarati.

**CRITERIO DI COMPLETAMENTO**: la repository distingue fisicamente source code, static/runtime data, vendor e generated output; app locale e build hosted funzionano come prima; nessun algoritmo, API, UI o backend è stato modificato internamente.

**COMMIT MESSAGE SUGGERITO**: `build: finish separation of generated output`

## 3. Rendere riproducibili gli input dei cataloghi

**OBIETTIVO**: rendere versionati e dichiarati gli input di `trekking-fallback.json` e `forecast-points.json`.

**FILE COINVOLTI**: `scripts/build_maremma_catalog.py`, `scripts/select_forecast_points.py`, nuovi file sotto `data/` o metadata documentati, `.gitignore` se necessario.

**RISCHIO**: medio; un cambiamento di input può alterare dati visualizzati, non algoritmi.

**TEST DA ESEGUIRE**: test di conteggi/shape/catalogo; confronto JSON prima/dopo; `npm test`; build.

**CRITERIO DI COMPLETAMENTO**: gli script non dipendono da `/private/tmp` implicito oppure dichiarano input obbligatori e versione/hash; output riproducibile.

**COMMIT MESSAGE SUGGERITO**: `build: make territorial catalog inputs reproducible`

## 4. Estrarre configurazione non sensibile

**OBIETTIVO**: centralizzare limiti area, endpoint provider, TTL e costanti di acquisizione senza cambiare valori.

**FILE COINVOLTI**: `server.py`, `hosted/backend.mjs`, `dist/weather.mjs`, `dist/app.mjs`, nuovo modulo/config documentato.

**RISCHIO**: medio; URL, arrotondamenti e TTL possono cambiare accidentalmente.

**TEST DA ESEGUIRE**: test unitari dei valori; test API di validazione; `npm test`; build; diff dei contratti.

**CRITERIO DI COMPLETAMENTO**: una sola definizione per ciascuna costante condivisibile nel runtime, con valori invariati e nessuna credenziale.

**COMMIT MESSAGE SUGGERITO**: `refactor: centralize non-secret runtime configuration`

## 5. Consolidare le utility geografiche lato Python

**OBIETTIVO**: eliminare duplicazioni locali di distanza, bounds e parsing/controllo geometrico nel backend Python senza cambiare risultati numerici.

**FILE COINVOLTI**: `server.py`, `tests/test_server.py`, eventuale modulo backend Python nuovo.

**RISCHIO**: medio; bug di rounding o poligoni con buchi.

**TEST DA ESEGUIRE**: suite GML/buchi/raggio esistente più casi di regressione estratti dal codice; `python3 -m unittest discover -s tests`.

**CRITERIO DI COMPLETAMENTO**: stessi valori sui fixture baseline e nessuna modifica a `ecology.mjs`.

**COMMIT MESSAGE SUGGERITO**: `refactor: centralize Python geography helpers`

## 6. Formalizzare il contratto API

**OBIETTIVO**: descrivere schema di successo, fonti parziali e errori dei tre endpoint.

**FILE COINVOLTI**: `docs/`, `server.py`, `hosted/backend.mjs`, nuovi fixture/test contract.

**RISCHIO**: medio; rendere esplicite differenze oggi tollerate può far emergere incompatibilità.

**TEST DA ESEGUIRE**: contract test per environment, land, around e input invalidi su entrambi i backend.

**CRITERIO DI COMPLETAMENTO**: una fixture produce shape compatibile nei due runtime; i campi opzionali e `unavailable` sono documentati.

**COMMIT MESSAGE SUGGERITO**: `test: define shared backend API contracts`

## 7. Portare i provider dietro adattatori separati

**OBIETTIVO**: separare provider Regione, Open-Meteo, Overpass e GBIF dai servizi che compongono le risposte.

**FILE COINVOLTI**: `server.py`, `hosted/backend.mjs`, nuovi moduli provider/services, test fixture.

**RISCHIO**: alto; è il primo spostamento strutturale di codice con rete e fallback.

**TEST DA ESEGUIRE**: fixture offline per ogni provider; contract test; test HTTP locale/Worker; build.

**CRITERIO DI COMPLETAMENTO**: stessa logica di composizione e stesso contratto, con URL/parse/cache confinati ai provider.

**COMMIT MESSAGE SUGGERITO**: `refactor: isolate external data providers`

## 8. Separare la persistenza del diario

**OBIETTIVO**: estrarre localStorage, migrazione v1, snapshot ed export da `app.mjs` mantenendo identiche chiavi e formati.

**FILE COINVOLTI**: `dist/app.mjs`, nuovo modulo diary, test browser/unitari.

**RISCHIO**: medio; perdita o alterazione di dati locali esistenti.

**TEST DA ESEGUIRE**: fixture v1, round-trip JSON, CSV con valori formula, date invalide e campi mancanti; test browser se disponibile.

**CRITERIO DI COMPLETAMENTO**: dati v1 leggibili, backup v2 invariato, nessuna nota inviata via rete.

**COMMIT MESSAGE SUGGERITO**: `refactor: isolate local diary persistence`

## 9. Separare controller UI e mappa

**OBIETTIVO**: ridurre `app.mjs` delegando layer Leaflet, marker e selezione geometrica a un modulo mappa.

**FILE COINVOLTI**: `dist/app.mjs`, `dist/around.mjs`, nuovo modulo map, test smoke/browser.

**RISCHIO**: alto; interazioni, popup e layer possono rompersi senza errori statici.

**TEST DA ESEGUIRE**: smoke browser su caricamento, click mappa, cambio raggio, selezione marker e tileerror; test manuale locale.

**CRITERIO DI COMPLETAMENTO**: stessa UI e stessi endpoint; mappa e pannelli restano sincronizzati.

**COMMIT MESSAGE SUGGERITO**: `refactor: isolate map controller from UI state`

## 10. Separare Around Me e Forecast dai contratti browser

**OBIETTIVO**: fare in modo che Around Me e Forecast consumino client/servizi tipizzati o documentati, senza costruire URL nei componenti.

**FILE COINVOLTI**: `dist/around.mjs`, `dist/forecast.mjs`, `dist/weather.mjs`, nuovi client/shared.

**RISCHIO**: medio; cache e fallback possono cambiare comportamento.

**TEST DA ESEGUIRE**: test cache/fallback, dati parziali, filtri 5/10/25/50, ranking e finestra; smoke browser.

**CRITERIO DI COMPLETAMENTO**: stesso numero/ordinamento con fixture baseline e nessuna modifica al calcolo ecology.

**COMMIT MESSAGE SUGGERITO**: `refactor: isolate frontend API clients`

## Regola di avanzamento

Non accorpare i sotto-step 2.1-2.4: ciascuno deve lasciare test e build verificabili, documentare il rischio residuo e non includere nuove feature, nuove soglie, nuovi pesi o nuovi provider. Dopo la fase strutturale, mantenere separati anche gli step 3-9; ogni commit successivo deve essere piccolo e reversibile.
