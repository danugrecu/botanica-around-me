# Architettura di Botanica Around Me

Questa guida indica dove si trova ogni funzione e dove intervenire. Il frontend non usa framework: i file dentro `dist/` sono moduli JavaScript caricati direttamente dal browser. Il build genera soltanto il Worker della versione ospitata.

## Flusso completo

```text
click sulla mappa / GPS / zona campione
                 |
                 v
            dist/app.mjs
                 |
                 +--> /api/environment --> bosco + suolo + rilievo + meteo
                 |                              |
                 |                              v
                 |                     dist/ecology.mjs
                 |                              |
                 |                              v
                 |                    indice 0-100 + fattori
                 |
                 +--> dist/forecast.mjs --> confronto dei 21 boschi campione
                 |
                 +--> dist/around.mjs --> /api/around
                                              |
                                              +--> trekking OSM + catalogo locale
                                              +--> flora GBIF
                                              +--> aree protette OSM + Regione Toscana
                                              +--> meteo per l'uscita
```

In locale le API sono implementate da `server.py`. Sul sito privato hanno lo stesso contratto ma sono implementate da `hosted/backend.mjs`. `scripts/build-hosted.mjs` copia il backend nel file generato `dist/server/index.js`.

## Mappa dei file

| File | Responsabilita' | Modificarlo quando |
| --- | --- | --- |
| `dist/index.html` | Struttura delle schermate e testi statici | si aggiunge una scheda, un comando o una sezione |
| `dist/style.css` | Colori, layout responsive, mappa, schede e stampa | cambia l'aspetto grafico |
| `dist/app.mjs` | Controller, mappa Leaflet, punto selezionato, confronto 3x3 e diario | cambia il comportamento generale della UI o della mappa |
| `dist/forecast.mjs` | Graduatoria dei boschi e finestra migliore nei sette giorni | cambia il confronto automatico tra zone |
| `dist/ecology.mjs` | Habitat, profili delle specie, fattori e indice sperimentale | cambiano soglie, pesi o specie fungine |
| `dist/around.mjs` | Centro/raggio, trekking, flora, natura e meteo dell'uscita | cambia la vista "Intorno a me" |
| `dist/weather.mjs` | Richiesta Open-Meteo dal browser e indice meteo per uscire | cambiano i parametri meteo comuni |
| `dist/model.mjs` | Zone pilota e compatibilita' con il modello precedente | si rinomina o descrive una macrozona |
| `dist/forecast-points.json` | 21 punti campione usati nelle previsioni | si aggiunge o corregge un bosco campione |
| `dist/trekking-fallback.json` | Catalogo stabile di trekking e luoghi naturali | si aggiorna il censimento territoriale |
| `server.py` | Server locale, cache e adattatori delle fonti | cambia un'API o una fonte nella versione locale |
| `hosted/backend.mjs` | Stesse API nella versione ospitata | la stessa modifica deve arrivare al sito privato |
| `scripts/build-hosted.mjs` | Genera il Worker ospitato | cambia il formato richiesto dall'hosting |
| `research/` | Fonti, metodo e limiti dichiarati | si aggiunge evidenza scientifica o territoriale |
| `tests/` | Controlli del modello, parsing e API | cambia una regola con effetto osservabile |

## Contratti delle API

### `GET /api/environment?lat=...&lon=...`

Restituisce l'analisi completa di un punto:

- `forest`: poligono UCS 2019, vegetazione regionale e inventario forestale storico;
- `soil`: capacita' idrica disponibile e attributi pedologici restituiti dalla Regione;
- `terrain`: quota, pendenza e orientamento da Copernicus GLO-90;
- `weather`: 30 giorni passati e 7 futuri da Open-Meteo;
- `lat`, `lon`: coordinate arrotondate a cinque decimali.

### `GET /api/land?lat=...&lon=...`

Restituisce bosco, suolo e rilievo senza meteo. Serve al confronto 3x3 attorno al punto selezionato.

### `GET /api/around?lat=...&lon=...&radius=5|10|25|50`

Restituisce trekking, luoghi naturali, osservazioni botaniche e meteo entro il raggio scelto. I risultati live vengono integrati nel browser con `trekking-fallback.json`, cosi' un disservizio temporaneo di Overpass non svuota il catalogo.

Ogni sorgente puo' restituire `status: "unavailable"`. L'interfaccia deve continuare a mostrare i dati rimasti disponibili; un dato mancante non va trasformato in zero.

## Come nasce una percentuale dei funghi

`dist/ecology.mjs` contiene il modello dettagliato. La funzione `predict(env, date, species, override)`:

1. verifica che il punto ricada in copertura boscata;
2. identifica il tipo di bosco e l'albero ospite piu' plausibile;
3. sceglie il profilo di porcino oppure l'ovolo buono;
4. calcola pioggia recente, ritardo dalla pioggia, temperatura, gelo, vento, evaporazione, umidita' e temperatura del suolo;
5. combina i fattori disponibili con i pesi dichiarati;
6. applica limiti quando habitat o dati essenziali sono generici;
7. restituisce `score`, fattori, metriche, limiti e avvertenze.

Il gruppo `porcini` calcola separatamente aereus, reticulatus, edulis e pinophilus e mostra il profilo con indice maggiore. L'indice esprime compatibilita' ambientale sperimentale; non e' una probabilita' calibrata di trovare funghi.

Per aggiungere una specie:

1. aggiungere il profilo in `profiles` dentro `dist/ecology.mjs`;
2. definire temperatura, mesi e compatibilita' con gli ospiti;
3. aggiungere l'opzione nel selettore di `dist/index.html`;
4. estendere i test con casi favorevoli, sfavorevoli e dati mancanti;
5. documentare fonte e motivazione in `research/metodo-v2.md`.

## Come vengono delineati i luoghi sulla mappa

I tre tipi di geometria hanno significati diversi:

- il bosco del punto usa il vero poligono UCS 2019 restituito dal WMS regionale;
- le aree protette e Natura 2000 usano gli strati WMS regionali, visibili come superfici;
- molti percorsi e record botanici arrivano come punto centrale o osservazione. In assenza di una geometria completa verificata, l'app mostra un marcatore e non inventa un tracciato.

`dist/app.mjs` disegna il poligono forestale e i punti di previsione. `dist/around.mjs` gestisce gli strati trekking, flora e natura, mantiene gli indici dei marcatori e centra la mappa quando l'utente sceglie un risultato.

Per aggiungere un bosco previsto, inserire in `dist/forecast-points.json` un oggetto con almeno:

```json
{
  "id": "identificatore-stabile",
  "name": "Nome mostrato",
  "locality": "Riferimento locale",
  "area": "Macrozona",
  "lat": 42.8,
  "lon": 11.1
}
```

Il punto deve ricadere realmente in un poligono boscato. Senza questa verifica il modello non assegna un indice.

## Dove cambiare le fonti

Le fonti live sono adattatori separati:

- `cartography()` per UCS, vegetazione e suolo della Regione Toscana;
- `terrain()` per Copernicus/Open-Meteo elevation;
- `weather()` per Open-Meteo forecast;
- `overpass_context()` / `overpassContext()` per trekking e aree OSM;
- `flora_context()` / `floraContext()` per GBIF.

I nomi con underscore sono in `server.py`; i corrispondenti camelCase sono in `hosted/backend.mjs`. Una modifica al contratto va riportata in entrambi e verificata prima del build.

## Diario e privacy

Il diario e' gestito in `dist/app.mjs` e salvato in `localStorage` nel browser. Esportazione CSV e backup JSON avvengono sul dispositivo. Il server non riceve le note. Le richieste territoriali e meteo inviano ai rispettivi fornitori le coordinate interrogate.

## Sviluppo locale

```bash
python3 server.py
```

Aprire `http://localhost:4173/`. Per usare un'altra porta:

```bash
PORT=4174 python3 server.py
```

Controlli automatici:

```bash
npm test
```

Generazione del Worker ospitato:

```bash
npm run build
```

`dist/server/index.js` e' generato e ignorato da Git. Correggere sempre `hosted/backend.mjs`, poi rigenerare.

## Regole per modifiche sicure

- Conservare il contratto JSON tra frontend, server locale e Worker ospitato.
- Gestire ogni sorgente come potenzialmente assente o temporaneamente non disponibile.
- Non presentare precisione cartografica maggiore della risoluzione della fonte.
- Non cambiare pesi o soglie senza aggiornare `research/metodo-v2.md` e i test.
- Non inserire credenziali, email autorizzate o note personali nel codice o negli archivi.
- Eseguire test e build dopo ogni modifica sostanziale.
