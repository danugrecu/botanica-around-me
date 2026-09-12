# AGENTS.md

## Prima di modificare

Leggere sempre prima:

- [README.md](README.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DATA_SOURCES.md](DATA_SOURCES.md)
- [ON-BOARDING.md](ON-BOARDING.md)

Verificare poi il codice reale in repository prima di assumere che la documentazione sia aggiornata.

## Regole

- `dist/` è output generato: non modificarlo manualmente.
- Le feature frontend vanno nel modulo di dominio corretto: `app/`, `map/`, `analysis/`, `around/`, `forecast/`, `ecology/`, `diary/`, `clients/`, `shared/`.
- Ogni fetch verso `/api/environment`, `/api/land` e `/api/around` passa dal client in `src/frontend/clients/botanica-api.mjs`.
- Non modificare `ecology.mjs` o `model.mjs` silenziosamente: ogni cambiamento va documentato e testato.
- `missing data != zero`: i dati mancanti restano null/assenti.
- Preservare provenance, dataset, versioni, risoluzione e limiti delle fonti.
- I dati e il vendored Leaflet devono rimanere separati dal source code.
- Non aggiungere dipendenze senza necessità reale.
- Mantenere compatibilità API, localStorage e comportamento UI già esistenti.
- I commenti spiegano il WHY, non le righe ovvie.
- `npm test` deve essere verificato prima di modifiche importanti.

## Quando cambiano le fonti

Aggiornare [DATA_SOURCES.md](DATA_SOURCES.md) con provider, provenienza, cache, limiti e TODO pertinenti.

## Quando cambia l'architettura

Aggiornare [ARCHITECTURE.md](ARCHITECTURE.md) e mantenere lo stato tecnico coerente con il codice reale.

## Quando cambia l'MVP

Aggiornare [README.md](README.md) con la funzionalità effettivamente presente e i limiti attuali.

## Quando cambiano setup o dipendenze

Aggiornare [ON-BOARDING.md](ON-BOARDING.md) con installazione, toolchain e procedure di avvio reali.

