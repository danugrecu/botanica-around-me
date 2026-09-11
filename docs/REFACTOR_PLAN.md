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

## 2. Rendere riproducibili gli input dei cataloghi

**OBIETTIVO**: rendere versionati e dichiarati gli input di `trekking-fallback.json` e `forecast-points.json`.

**FILE COINVOLTI**: `scripts/build_maremma_catalog.py`, `scripts/select_forecast_points.py`, nuovi file sotto `data/` o metadata documentati, `.gitignore` se necessario.

**RISCHIO**: medio; un cambiamento di input può alterare dati visualizzati, non algoritmi.

**TEST DA ESEGUIRE**: test di conteggi/shape/catalogo; confronto JSON prima/dopo; `npm test`; build.

**CRITERIO DI COMPLETAMENTO**: gli script non dipendono da `/private/tmp` implicito oppure dichiarano input obbligatori e versione/hash; output riproducibile.

**COMMIT MESSAGE SUGGERITO**: `build: make territorial catalog inputs reproducible`

## 3. Estrarre configurazione non sensibile

**OBIETTIVO**: centralizzare limiti area, endpoint provider, TTL e costanti di acquisizione senza cambiare valori.

**FILE COINVOLTI**: `server.py`, `hosted/backend.mjs`, `dist/weather.mjs`, `dist/app.mjs`, nuovo modulo/config documentato.

**RISCHIO**: medio; URL, arrotondamenti e TTL possono cambiare accidentalmente.

**TEST DA ESEGUIRE**: test unitari dei valori; test API di validazione; `npm test`; build; diff dei contratti.

**CRITERIO DI COMPLETAMENTO**: una sola definizione per ciascuna costante condivisibile nel runtime, con valori invariati e nessuna credenziale.

**COMMIT MESSAGE SUGGERITO**: `refactor: centralize non-secret runtime configuration`

## 4. Consolidare le utility geografiche lato Python

**OBIETTIVO**: eliminare duplicazioni locali di distanza, bounds e parsing/controllo geometrico nel backend Python senza cambiare risultati numerici.

**FILE COINVOLTI**: `server.py`, `tests/test_server.py`, eventuale modulo backend Python nuovo.

**RISCHIO**: medio; bug di rounding o poligoni con buchi.

**TEST DA ESEGUIRE**: suite GML/buchi/raggio esistente più casi di regressione estratti dal codice; `python3 -m unittest discover -s tests`.

**CRITERIO DI COMPLETAMENTO**: stessi valori sui fixture baseline e nessuna modifica a `ecology.mjs`.

**COMMIT MESSAGE SUGGERITO**: `refactor: centralize Python geography helpers`

## 5. Formalizzare il contratto API

**OBIETTIVO**: descrivere schema di successo, fonti parziali e errori dei tre endpoint.

**FILE COINVOLTI**: `docs/`, `server.py`, `hosted/backend.mjs`, nuovi fixture/test contract.

**RISCHIO**: medio; rendere esplicite differenze oggi tollerate può far emergere incompatibilità.

**TEST DA ESEGUIRE**: contract test per environment, land, around e input invalidi su entrambi i backend.

**CRITERIO DI COMPLETAMENTO**: una fixture produce shape compatibile nei due runtime; i campi opzionali e `unavailable` sono documentati.

**COMMIT MESSAGE SUGGERITO**: `test: define shared backend API contracts`

## 6. Portare i provider dietro adattatori separati

**OBIETTIVO**: separare provider Regione, Open-Meteo, Overpass e GBIF dai servizi che compongono le risposte.

**FILE COINVOLTI**: `server.py`, `hosted/backend.mjs`, nuovi moduli provider/services, test fixture.

**RISCHIO**: alto; è il primo spostamento strutturale di codice con rete e fallback.

**TEST DA ESEGUIRE**: fixture offline per ogni provider; contract test; test HTTP locale/Worker; build.

**CRITERIO DI COMPLETAMENTO**: stessa logica di composizione e stesso contratto, con URL/parse/cache confinati ai provider.

**COMMIT MESSAGE SUGGERITO**: `refactor: isolate external data providers`

## 7. Separare la persistenza del diario

**OBIETTIVO**: estrarre localStorage, migrazione v1, snapshot ed export da `app.mjs` mantenendo identiche chiavi e formati.

**FILE COINVOLTI**: `dist/app.mjs`, nuovo modulo diary, test browser/unitari.

**RISCHIO**: medio; perdita o alterazione di dati locali esistenti.

**TEST DA ESEGUIRE**: fixture v1, round-trip JSON, CSV con valori formula, date invalide e campi mancanti; test browser se disponibile.

**CRITERIO DI COMPLETAMENTO**: dati v1 leggibili, backup v2 invariato, nessuna nota inviata via rete.

**COMMIT MESSAGE SUGGERITO**: `refactor: isolate local diary persistence`

## 8. Separare controller UI e mappa

**OBIETTIVO**: ridurre `app.mjs` delegando layer Leaflet, marker e selezione geometrica a un modulo mappa.

**FILE COINVOLTI**: `dist/app.mjs`, `dist/around.mjs`, nuovo modulo map, test smoke/browser.

**RISCHIO**: alto; interazioni, popup e layer possono rompersi senza errori statici.

**TEST DA ESEGUIRE**: smoke browser su caricamento, click mappa, cambio raggio, selezione marker e tileerror; test manuale locale.

**CRITERIO DI COMPLETAMENTO**: stessa UI e stessi endpoint; mappa e pannelli restano sincronizzati.

**COMMIT MESSAGE SUGGERITO**: `refactor: isolate map controller from UI state`

## 9. Separare Around Me e Forecast dai contratti browser

**OBIETTIVO**: fare in modo che Around Me e Forecast consumino client/servizi tipizzati o documentati, senza costruire URL nei componenti.

**FILE COINVOLTI**: `dist/around.mjs`, `dist/forecast.mjs`, `dist/weather.mjs`, nuovi client/shared.

**RISCHIO**: medio; cache e fallback possono cambiare comportamento.

**TEST DA ESEGUIRE**: test cache/fallback, dati parziali, filtri 5/10/25/50, ranking e finestra; smoke browser.

**CRITERIO DI COMPLETAMENTO**: stesso numero/ordinamento con fixture baseline e nessuna modifica al calcolo ecology.

**COMMIT MESSAGE SUGGERITO**: `refactor: isolate frontend API clients`

## 10. Rendere `dist/` solo output

**OBIETTIVO**: spostare progressivamente sorgenti, dati e vendor nei confini target e aggiornare il build.

**FILE COINVOLTI**: tutti i moduli attualmente in `dist/`, `scripts/build-hosted.mjs`, `package.json`, `vendor/`, `data/`, `public/`.

**RISCHIO**: alto; percorsi relativi e deployment hosted possono rompersi.

**TEST DA ESEGUIRE**: build pulito, verifica asset incorporati, avvio locale, smoke browser, suite completa, confronto dimensione/manifest.

**CRITERIO DI COMPLETAMENTO**: nessun sorgente modificabile manualmente dentro `dist/`; output ricostruibile dagli input versionati.

**COMMIT MESSAGE SUGGERITO**: `build: make dist generated output only`

## Regola di avanzamento

Non accorpare gli step 6-10. Ogni commit deve lasciare test e build verificabili, documentare il rischio residuo e non includere nuove feature, nuove soglie, nuovi pesi o nuovi provider.
