# Botanica Around Me — Maremma privata

Avvio locale: `npm start`, quindi aprire http://localhost:4173. La versione condivisa usa un Worker HTTP equivalente ed è protetta dalla lista di due account autorizzati. Entrambe richiedono internet per le fonti esterne.

Per orientarsi nel codice, partire da [`ARCHITETTURA.md`](ARCHITETTURA.md) e [`docs/CURRENT_ARCHITECTURE.md`](docs/CURRENT_ARCHITECTURE.md). Il codice frontend è sotto `src/frontend/`, il backend hosted sotto `src/backend/hosted/`, i dati runtime sotto `data/`, Leaflet sotto `vendor/` e `dist/` contiene esclusivamente output generato.

## Funzioni

- Panoramica “intorno a me” con centro scelto, geolocalizzazione e raggio 5/10/25/50 km.
- Trekking: tracciati dell'Itinerario Naturalistico Toscano e itinerari escursionistici OSM, ordinati per distanza.
- Flora: osservazioni GBIF degli ultimi cinque anni, filtrate sul raggio reale, con data e incertezza delle coordinate.
- Natura: riserve regionali, siti Natura 2000 e aree protette nominate, delineate sulla mappa.
- Suggerimenti giornalieri basati su vicinanza e meteo. Il punteggio per uscire valuta pioggia, temperatura e vento e non è un indice di sicurezza del sentiero.
- Selezione puntuale su Leaflet, coordinate WGS84 e geolocalizzazione del dispositivo con accuratezza esplicita.
- Centro e raggio 5/10/25/50 km: la graduatoria mostra solo i punti campione inclusi e indica distanza e direzione dell'area migliore.
- Tutti i boschi verificati sono delineati con il poligono UCS 2019 che contiene il campione e colorati in base all'indice del giorno. Il popup separa coordinate, riferimento locale e fattori ambientali.
- Poligono UCS 2019 realmente interrogato (scala 1:10.000), intersezione punto/poligono comprensiva dei buchi. Esclusione automatica dei punti non boscati.
- Vegetazione regionale (celle 250 m, scala nominale 1:250.000) e IFT storico (400 m) quando presenti; specie e dati storici esplicitamente distinti dalla copertura più recente.
- Pedologia: AWC, tessitura e nome dell'unità cartografica. Drenaggio e altri attributi sono disponibili nella risposta grezza ma non interpretati senza una legenda verificata.
- Quota Copernicus GLO-90; pendenza e orientamento stimati dalle differenze centrate a ±90 m. Sono valori DEM, non misurazioni di precisione.
- Meteo del punto: 30 giorni precedenti e 7 futuri; pioggia, temperature, gelo, ET0, vento, umidità aria, VPD, umidità suolo 3–9 e 9–27 cm e temperatura suolo 6 cm.
- Profili separati aereus, reticulatus, edulis, pinophilus e Amanita caesarea. Il gruppo porcini mostra il massimo dei quattro indici, non probabilità aggregate.
- Confronto 3×3 di punti a passo circa 500 m. Ciascun punto interroga bosco, pedologia e rilievo; il meteo è condiviso con il centro ed esplicitamente indicato. Selezionare un vicino carica il suo meteo.
- Diario locale con coordinate, esito, durata della ricerca e snapshot di fattori/metriche; CSV e backup JSON. Lettura retrocompatibile delle uscite v1.

## Stato e limiti

Non è un modello predittivo validato. Pesi e soglie sono scelte euristiche, documentate nell'app e in `research/metodo-v2.md`. Dati con provenienza/risoluzione diversa non vengono presentati come prove indipendenti di accuratezza. Punti GPS a cinque decimali non implicano una previsione di fruttificazione a pochi metri. Il meteo resta dell'ordine dei chilometri. Non vengono inventati pH, micelio, gestione recente, incendi, lettiera o osservazioni di campo. Le osservazioni botaniche sono record storici e non garantiscono presenza o fioritura attuale; i dati escursionistici e i confini non certificano accessibilità o sicurezza.

Le sorgenti territoriali hanno età diverse. Errori/mancanze sono restituiti per fonte; i dati mancanti non diventano zeri. Cache soltanto in memoria (meteo 1 h, geografia 24 h). Nessuna memorizzazione server delle uscite. Le coordinate interrogate vengono inviate ai fornitori, non le note personali.

## Sviluppo e verifica

- Prerequisiti: Python 3 e Node.js/npm per test e build.
- `npm start`: genera gli asset locali e avvia `server.py` su http://localhost:4173.
- `npm run build:assets`: genera gli asset runtime in `dist/` senza richiedere `.openai/hosting.json`.
- `npm test`: rigenera gli asset e avvia test Node e Python.
- `npm run build`: genera asset e Worker hosted; richiede `.openai/hosting.json`.
- `python server.py`: avvio diretto del server usando l'output già presente in `dist/`.

Per le fonti consultare [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md); per la sequenza dei refactoring [`docs/REFACTOR_PLAN.md`](docs/REFACTOR_PLAN.md).

## Verifica

- `node tests/ecology.test.mjs`: 42 combinazioni specie/giorno, esclusione non-bosco e copertura sconosciuta, dati null, siccità, gelo, limiti habitat generico, isolamento scenario e massimo tra porcini.
- `python3 -m unittest discover -s tests`: parsing GML multipart, poligoni con buchi, geometria del raggio e limiti dell'indice meteo per le uscite.
- Integrazione su risposte reali di quattro fonti al punto 42.89,10.8 e controlli HTTP locale/coordinate fuori area.
- Sintassi JS e Python verificata. Nessuna ispezione visuale o test interattivo del browser richiesto/eseguito.
- WebMCP opzionale con feature detection. Nessun contesto WebMCP disponibile per il test del contratto: integrazione non verificata.

## Dipendenze

Leaflet 1.9.4 (BSD-2-Clause) distribuito localmente con licenza. Python stdlib. Nessuna chiave API. Nessun invio automatico di messaggi o automazione pianificata.

## Previsioni automatiche ripristinate

All'apertura `forecast.mjs` confronta automaticamente i punti campione in `forecast-points.json`, con graduatoria per giorno/specie e migliore finestra sui sette giorni. Riusa il modello ecologico v2 e mantiene analisi puntuale, scenari e diario. Le stime della graduatoria escludono scenari manuali. Cache nel browser fino a un'ora, con nuovo tentativo manuale. I punti senza copertura boscata verificata non ottengono un indice.

Verifica aggiuntiva: `node tests/forecast.test.mjs` controlla assenza dati, data selezionata, massimo e finestra di giorni consecutivi. La pubblicazione resta limitata ai due account autorizzati.
