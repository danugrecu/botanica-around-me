# ON-BOARDING.md

## Prerequisiti

- Python 3
- Node.js/npm
- accesso a internet per le chiamate ai provider esterni

## Setup locale

1. Aprire la cartella del repository.
2. Verificare che `server.py`, `src/`, `data/`, `scripts/` e `tests/` siano presenti.
3. Eseguire il comando di installazione se previsto dal progetto locale: in questo repo non servono dipendenze npm aggiuntive per il runtime di base.

## Comandi principali

### Avvio locale

```bash
npm start
```

Questo comando:

- genera gli asset in `dist/` via `scripts/build-assets.mjs`;
- avvia `server.py`;
- espone la UI su http://localhost:4173.

### Test

```bash
npm test
```

Questo comando:

- ricostruisce gli asset;
- esegue i test JavaScript con `node --test`;
- esegue i test Python con `python -m unittest discover -s tests`.

### Build assets

```bash
npm run build:assets
```

Genera la versione statica frontend e i dati runtime in `dist/`.

### Build hosted

```bash
npm run build
```

Scarica il pacchetto hosted per il Worker deployment, usando `scripts/build-hosted.mjs`.

### Avvio diretto del backend

```bash
python server.py
```

## Struttura importante

- `src/frontend/`: frontend modulo per mappa, around, forecast, ecology, diary, clients e shared helpers.
- `src/backend/hosted/`: backend hosted per deployment e contratti equivalenti a `server.py`.
- `data/`: dataset di runtime e catalogo di fallback.
- `vendor/`: Leaflet vendored.
- `scripts/`: build, asset generation e strumenti di generazione dati.
- `tests/`: suite di regressione Node e Python.
- `dist/`: output generato, non sorgente.

## Regole di sviluppo

- Non modificare il comportamento dell'app senza test o documentazione aggiornati.
- Mantieni `dist/` come output generato.
- Non trasformare dati mancanti in zero.
- Aggiorna sempre il file documentale corretto quando cambiano architettura, setup o fonti.
- Tutti i fetch verso `/api/environment`, `/api/land` e `/api/around` devono passare dal client centralizzato.

## Problemi comuni

### `npm start` o `npm test` falliscono

Verifica:

- che Node.js/npm sia installato;
- che Python 3 sia disponibile;
- che la cartella di lavoro sia la root del repository;
- che ci sia connettività internet per le chiamate esterne di meteo e cartografia.

### Il backend non risponde

Controlla:

- la presenza del processo `python server.py`;
- la corretta configurazione della porta 4173;
- la generazione di `dist/` da `npm run build:assets`.

## Documenti chiave

- [README.md](README.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [AGENTS.md](AGENTS.md)
- [DATA_SOURCES.md](DATA_SOURCES.md)
- [ON-BOARDING.md](ON-BOARDING.md)
