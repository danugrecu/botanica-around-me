# ON-BOARDING.md

## Obiettivo

Questa è la guida per mettere in piedi il progetto su un PC nuovo e farlo partire senza installare dipendenze extra. Il repository usa Git, Python 3 e Node.js/npm, ma non richiede `npm install` perché non ci sono `dependencies` o `devDependencies` in `package.json`.

## Verifica del codice reale

Il file `package.json` attuale contiene solo script di build/test/start e non definisce `dependencies` né `devDependencies`.

Questo implica che:

- NON serve eseguire `npm install`;
- il runtime dipende da strumenti già presenti sul PC;
- Leaflet è vendorizzato sotto `vendor/leaflet` e non va installato con npm;
- `server.py` usa solo la standard library di Python.

## Prerequisiti

### Git

Git serve per clonare il repository, aggiornare il codice e gestire il version control.

Installazione:

- Windows: installare Git for Windows da https://git-scm.com/downloads
- macOS: `brew install git`
- Linux: usare il package manager della distribuzione

Verifica:

```bash
git --version
```

### Python 3

Python 3 serve per avviare il backend locale `server.py` e per eseguire i test Python.

Verifica:

```bash
python --version
```

Il codice usa solo la standard library, senza dipendenze Python aggiuntive.

### Node.js LTS

Node.js LTS serve per eseguire i test, generare gli asset runtime e avviare il progetto in ambiente locale.

Verifica:

```bash
node --version
```

### npm

`npm` viene installato insieme a Node.js e serve per eseguire gli script definiti in `package.json`.

Verifica:

```bash
npm --version
```

### Browser moderno

Serve un browser aggiornato per usare la mappa Leaflet, la geolocalizzazione e la UI del frontend.

### VS Code (opzionale)

È un editor valido per lavorare sul repository, ma non è un prerequisito di runtime.

## Setup completo da zero

```bash
git clone https://github.com/danugrecu/botanica-around-me.git
cd botanica-around-me

git --version
node --version
npm --version
python --version
```

Poi esegui:

```bash
npm test
npm start
```

L'app sarà disponibile a:

```text
http://localhost:4173
```

## Cosa fanno i comandi principali

### `npm run build:assets`

Genera `dist/` a partire da `src/`, `data/` e `vendor/`.

### `npm test`

Esegue:

- `npm run build:assets`
- test del clean build con `node --test tests/build-assets.test.mjs`, poi test JavaScript runtime con l'elenco esplicito delle suite
- test Python con `python -m unittest discover -s tests`

### `npm start`

Esegue esattamente:

```bash
npm run build:assets
python server.py
```

In pratica:

1. genera `dist/`
2. avvia `server.py`
3. il backend serve la UI su `http://localhost:4173`

### `npm run build`

Genera il Worker hosted. Questo comando richiede il file `.openai/hosting.json` e non è un install di dipendenze. Se il file non è presente, il build non può completare.

### `python server.py`

Avvia direttamente il backend locale senza usare `npm start`.

## Esecuzione locale

```bash
npm start
```

Aprire poi nel browser:

```text
http://localhost:4173
```

## Troubleshooting

### Git non riconosciuto

Verifica che Git sia installato e che il binario sia nel PATH.

```bash
git --version
```

Se non viene riconosciuto, reinstallare Git e riavviare il terminale.

### Node.js / npm non riconosciuti

Verifica:

```bash
node --version
npm --version
```

Se non vengono riconosciuti, installare Node.js LTS e riavviare il terminale.

### Python non riconosciuto

Verifica:

```bash
python --version
```

Se il comando non funziona, installare Python 3 e assicurarsi che il comando sia disponibile nel PATH.

### Porta 4173 occupata

Se la porta è già usata, chiudere il processo che la sta usando oppure modificare il server locale per usare un'altra porta. In questo repo, il comando standard è `npm start` e usa la porta `4173`.

### `dist/` assente

Eseguire:

```bash
npm run build:assets
```

Se `dist/` è mancante, l'app non può essere servita correttamente.

### Internet o provider non disponibili

L'app usa provider esterni come Regione Toscana, Open-Meteo e Overpass/OSM. Se la rete o i provider sono indisponibili, alcuni dati possono essere assenti o parziali: il comportamento previsto è mostrare dati disponibili e lasciare i campi mancanti null/assenti.

### `.openai/hosting.json` assente durante build hosted

Il comando:

```bash
npm run build
```

richiede il file `.openai/hosting.json` nel workspace. Se manca, il build hosted non può completare.

## File chiave

- [README.md](README.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [AGENTS.md](AGENTS.md)
- [DATA_SOURCES.md](DATA_SOURCES.md)
- [ON-BOARDING.md](ON-BOARDING.md)

## Note importanti

- Non serve `npm install`.
- Non serve installare Leaflet separatamente.
- `server.py` usa solo la standard library Python.
- `dist/` è output generato e va ricostruito dal build.
- La documentazione del repository non deve riferirsi a file obsoleti o cartelle rimosse.
