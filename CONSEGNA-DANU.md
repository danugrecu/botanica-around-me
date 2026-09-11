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
- `dist/`: interfaccia, mappa, modello e cataloghi territoriali.
- `server.py`: server locale e collegamento alle fonti territoriali e meteo.
- `hosted/backend.mjs`: backend compatibile con il sito ospitato.
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
2. Avviare `python3 server.py` e usare l'app in locale.
3. Dopo una modifica eseguire `npm test` e `npm run build`.
4. Non modificare `dist/server/index.js`: viene ricreato dal comando di build.

Questa versione riordina e documenta il codice senza modificare le funzioni dell'app o il modello di previsione.
