# Botanica Around Me — codice versione 10 leggibile

Questo pacchetto contiene il codice dell'app privata dedicata alla Maremma.

## Avvio locale

Richiede Python 3. Da questa cartella eseguire:

```bash
python3 server.py
```

Poi aprire nel browser:

```text
http://localhost:4173/
```

Il server interroga servizi esterni, quindi serve una connessione Internet. Se la porta 4173 è già occupata:

```bash
PORT=4174 python3 server.py
```

e aprire `http://localhost:4174/`.

## Struttura

- `ARCHITETTURA.md`: guida tecnica, flusso dei dati e punti di modifica.
- `src/frontend/`: interfaccia, mappa, modello e client frontend.
- `data/`: cataloghi runtime di trekking e punti forecast.
- `vendor/leaflet/`: Leaflet locale e licenza.
- `dist/`: output generato dal build.
- `server.py`: server locale e collegamento alle fonti territoriali e meteo.
- `src/backend/hosted/backend.mjs`: backend compatibile con il sito ospitato.
- `scripts/`: generazione del backend ospitato e dei cataloghi.
- `tests/`: controlli automatici del modello e delle fonti.
- `research/`: metodo e inventario territoriale con fonti.

## Contenuti principali

- 426 itinerari escursionistici nella Provincia di Grosseto.
- 28 luoghi naturali e aree protette.
- 21 zone forestali campione per le previsioni di porcini e ovoli buoni.
- Copertura del suolo, vegetazione, pedologia, rilievo, meteo e flora osservata.
- Diario salvato esclusivamente nel browser del dispositivo.

Le percentuali indicano compatibilità ambientale sperimentale. Non sono probabilità calibrate di ritrovamento, identificazioni micologiche o autorizzazioni di accesso e raccolta.

Il pacchetto non contiene credenziali né autorizzazioni del sito pubblicato. L'accesso alla versione online continua a dipendere dall'account invitato.

## Da dove partire

1. Leggere `ARCHITETTURA.md`.
2. Avviare `npm start` oppure `python server.py` dopo `npm run build:assets`.
3. Dopo una modifica eseguire `npm test` e `npm run build` quando il manifest hosted è disponibile.
4. Non modificare file dentro `dist/`: vengono ricreati dal build.

Questa versione riordina e documenta il codice senza modificare le funzioni dell'app o il modello di previsione.
