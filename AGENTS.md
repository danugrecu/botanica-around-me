# Regole per agenti e Codex

## Prima di modificare

- Leggere `README.md`, `ARCHITETTURA.md`, `CONSEGNA-DANU.md`, `research/metodo-v2.md`, `research/maremma-territoriale-2026-09-11.md` e la documentazione pertinente in `docs/`.
- Verificare il codice reale prima di assumere che la documentazione sia aggiornata.
- Eseguire test e build baseline quando l'ambiente lo consente.

## Perimetro del refactoring

- Preferire modifiche piccole, isolate e facilmente reversibili.
- Non introdurre feature durante un refactoring.
- Non spostare o rinominare file senza aggiornare build, deployment, test e documentazione nello stesso commit.
- Non modificare silenziosamente gli algoritmi ecologici.
- Non cambiare soglie, pesi, profili, moltiplicatori o limiti dell'indice senza test dedicati e documentazione della motivazione.
- Preservare i contratti JSON tra frontend, `server.py` e `hosted/backend.mjs`.
- Trattare `dist/server/index.js` come output generato: modificare la sorgente e rigenerare, mai correggere l'artefatto a mano.

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
