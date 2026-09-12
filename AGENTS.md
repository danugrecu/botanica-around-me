# Regole per agenti e Codex

## Prima di modificare

- Leggere `README.md`, `ARCHITETTURA.md`, `CONSEGNA-DANU.md`, `research/metodo-v2.md`, `research/maremma-territoriale-2026-09-11.md` e la documentazione pertinente in `docs/`.
- Verificare il codice reale prima di assumere che la documentazione sia aggiornata.
- Eseguire test e build baseline quando l'ambiente lo consente.

## Regole finali di refactoring

- `dist/` è output generato: non si modifica manualmente e va ricostruito da `src/`, `data/` e `vendor/`.
- Nuove feature frontend vanno nel modulo di dominio corretto: `app/` per orchestrazione, `map/` per Leaflet, `analysis/` per grid scan, `clients/` per API Botanica, `forecast/` e `around/` per le viste, `ecology/` per il modello e `diary/` per localStorage.
- Tutti i fetch verso `/api/environment`, `/api/land` e `/api/around` passano dal client in `src/frontend/clients/botanica-api.mjs`.
- `ecology.mjs` e `model.mjs` non cambiano semanticamente senza test e documentazione dedicati.
- `missing data != zero`: i dati mancanti restano null/assenti e non vengono trasformati in falsi valori numerici.
- Provenance, dataset, versioni, risoluzione e limiti delle fonti vanno documentati quando disponibili.
- I nuovi file frontend devono essere inclusi nel build ricorsivo di `scripts/build-assets.mjs`.
- Prima di commit importanti occorre che `npm test` sia verde.

## Perimetro del refactoring

- Preferire modifiche piccole, isolate e facilmente reversibili.
- Non introdurre feature durante un refactoring.
- Non spostare o rinominare file senza aggiornare build, deployment, test e documentazione nello stesso commit.
- Non modificare silenziosamente gli algoritmi ecologici.
- Non cambiare soglie, pesi, profili, moltiplicatori o limiti dell'indice senza test dedicati e documentazione della motivazione.
- Preservare i contratti JSON tra frontend, `server.py` e `src/backend/hosted/backend.mjs`.
- Trattare `dist/server/index.js` come output generato: modificare la sorgente e rigenerare, mai correggere l'artefatto a mano.
- Trattare l'intera directory `dist/` come output generato: modificare i file sotto `src/`, `data/` o `vendor/`, poi eseguire il build degli asset.

## Dati e provider

- Tenere i provider esterni separati dalla business logic.
- Conservare provenance, dataset, data/versione, risoluzione e limiti delle fonti quando sono disponibili.
- Non trasformare dati mancanti in zero, valori vuoti o false evidenze.
- Esporre indisponibilità e fallback in modo esplicito.
- Non aumentare la precisione dichiarata oltre quella della fonte.
- Non introdurre endpoint, credenziali o configurazioni di deployment non verificabili nel repository.
- Le note del diario restano locali salvo un requisito esplicito e documentato.

## Codice e commenti

- Commentare soprattutto WHY, assunzioni, provenienza, limiti, workaround e contratti input/output.
- Non aggiungere commenti su righe ovvie o sul significato di una semplice assegnazione.
- Aggiungere docstring ai moduli e alle API pubbliche quando il modulo viene creato o separato.
- Evitare dipendenze non necessarie e mantenere gli strumenti già usati dal progetto quando bastano.
- Non usare il refactoring per correggere bug non correlati.

## Verifica

- Eseguire i test dopo ogni modifica significativa; almeno `npm test` e `npm run build` quando Node/npm sono disponibili.
- Per modifiche Python eseguire anche `python3 -m unittest discover -s tests`.
- Per provider o contratti aggiungere fixture offline e contract test prima di modificare il comportamento.
- Se cambiano contratti o architettura, aggiornare la documentazione nello stesso commit.
- Se un comando non può essere eseguito per l'ambiente, riportare il comando, l'errore e la distinzione tra problema ambientale e problema del codice.
- Non considerare un test verde sufficiente se la provenienza o i limiti del dato sono stati persi.
