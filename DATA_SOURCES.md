# DATA_SOURCES.md

## Premessa

Questa documentazione raccoglie le fonti realmente usate dal progetto e le scelte metodologiche che sono ancora valide nel prototipo attuale. Le fonti non hanno la stessa risoluzione, età o valore probativo: vengono usate in modo coerente con i limiti del dato, non come se fossero equivalenti.

## Elenco delle fonti di runtime

| Fonte | Servizio / endpoint | Modulo che la usa | Dati recuperati | Risoluzione / periodo | Cache | Fallback | Limiti / provenienza |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Regione Toscana UCS 2019 | WMS Regione Toscana (`wmsraster/com.rt.wms.RTmap/wms`) | `server.py`, `src/backend/hosted/backend.mjs` | Uso del suolo/forestale, copertura boschiva, poligoni e geometrie contenenti il punto | scala 1:10.000, dataset 2019 | cache backend in memoria 24 h | filtra solo geometrie contenenti il punto | `UCS 2019` è la fonte principale per capire se il punto è in bosco; non equivale a verifica in campo |
| Vegetazione forestale regionale | WMS Regione Toscana | backend locale e hosted | tipo vegetazione/categoria forestale del punto | griglia 250 m, scala nominale 1:250.000 | cache backend in memoria | nessun fallback alternativo automatizzato | la griglia non equivale a precisione puntuale; è un contesto classificativo |
| IFT storico | WMS Regione Toscana / Inventario forestale storico | backend locale e hosted | informazioni forestali storiche e contesto specie / copertura | maglia 400 m; rilievi storici, non aggiornati in tempo reale | cache backend in memoria | non sostituisce il dato attuale | usato come informazione secondaria, non come prova di presenza attuale |
| Pedologia | WMS Regione Toscana (`owspedologia`) | `cartography(..., soil=True)` in backend locale e hosted | AWC, tessitura, classe pedologica e attributi grezzi del suolo | scala 1:10.000; dataset regionale | cache backend 24 h | geometria rimossa dalla risposta del suolo; dati mancanti restano null | non sono usati parametri inventati come pH locale, lettiera, ecc. |
| Sentieristica regionale | WMS Regione Toscana `SENTIERISTICA` | frontend map / around | linee di sentieri e percorso di riferimento | dati regionali, non aggiornati in tempo reale | nessuna cache applicativa dichiarata | catalogo locale `data/catalog/trekking-fallback.json` | la linea non certifica accessibilità, chiusura o manutenzione |
| Aree protette / Natura 2000 | WMS Regione Toscana `AREE_PROTETTE` e layer di siti Natura 2000 | frontend around / backend contesto | perimetri di riserve e aree protette | variabili per layer; la documentazione non sempre riporta il dataset esatto | nessuna cache applicativa dichiarata | overlay visuale; non autorizza accesso o raccolta | sono dati cartografici, non permessi o condizioni di uscita |
| NatNet2 | layer regionale di rilievi specie/habitat | frontend around / map | contesto di specie e habitat vegetali | layer regionale; data non sempre dichiarata | nessuna cache applicativa dichiarata | layer visuale / contesto, non fonte di scoring | usato come contesto, non come dato ad alta precisione |
| Open-Meteo Forecast | `https://api.open-meteo.com/v1/forecast` | backend `weather()`, frontend `clients/weather.mjs` | pioggia, temperatura, vento, umidità, VPD, suolo e dati storici 30 giorni | meteo modellistico, scala di ordine dei km | cache di backend 1 h; cache locale browser | fallback browser con Open-Meteo | dati modello, non sensore del bosco; non misurano il punto reale del sottobosco |
| Open-Meteo Elevation / Copernicus GLO-90 | `https://api.open-meteo.com/v1/elevation` | backend `terrain()` | quota, pendenza, esposizione da DEM | risoluzione DEM 90 m | cache backend 24 h | derivato da DEM, non rilievo in campo | pendenza e aspetto sono stime, non misura vera del terreno |
| OpenStreetMap / Overpass | endpoint Overpass vari (`overpass-api.de`, `overpass.kumi.systems`) | backend `overpass_context()` | sentieri, aree naturali, luoghi e confini | dati OSM; aggiornamento esterno non controllato | cache backend 1 h | fallback locale `data/catalog/trekking-fallback.json` | OSM può essere incompleto o non aggiornato; centro non è punto di partenza |
| OpenStreetMap tile | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | frontend app/map | sfondo cartografico | tile service standard; policy di cache del browser | browser cache | tile error messaggiato, mappa può restare senza sfondo | attribution e policy del provider non sono state rese come dipendenza runtime |
| GBIF | `https://api.gbif.org/v1/occurrence/search` | backend `flora_context()` | osservazioni vegetali, specie, data, incertezza, coordinate | ultimi 5 anni, bbox del raggio, massimo 300 record | cache backend 30 min e foglia locale in UI | filtro geografico e record più vicino per specie | archivio storico, non presenza attuale o censimento completo |
| Browser Geolocation | API del browser | frontend app / geolocalizzazione | latitudine, longitudine, accuratezza | precisione variabile del dispositivo | nessuna cache (`maximumAge: 0`) | permesso negato / errore / fallback manuale | non è una misura ecologica; identifica solo il punto di osservazione |
| Catalogo trekking fallback | `data/catalog/trekking-fallback.json` | frontend around / map | elenco stabile di itinerari e luoghi naturali | catalogo statico e verificato in repo | localStorage / file statico in dist | usato quando OSM/live fallisce | non è aggiornamento live né certificazione di accessibilità |
| Forecast points | `data/forecast/forecast-points.json` | frontend forecast | punti di campionamento forestale usati per la comparazione | selezione geografica e ambientale; non definisce nuova evidenza scientifica | cache locale in frontend | i punti si basano su UCS e su verifica del bosco | non ogni punto garantisce un indice se il bosco non è verificato |

## Fonti scientifiche/metodologiche precedenti

### EVIDENZA / FONTI ECOLOGICHE

Queste fonti sono state citate in precedenti documenti di ricerca come evidenza per il modello e per i limiti interpretativi del prototipo:

- Forestas: descrizione dell' Amanita caesarea e del legame con boschi caldi di querce e castagni
- Parco Appennino: descrizione ecologica dei porcini e differenze tra specie e ambienti
- studio sperimentale su funghi ectomicorrizici e acqua profonda in condizioni di siccità
- studio su castagneti e micelio di edulis/reticulatus
- documentazione regionale Toscana su uso del suolo, pedologia e ambiti paesaggistici
- Open-Meteo documentation e Open-Meteo Elevation API
- SoilGrids FAQ come riferimento di limitazione di un servizio non adottato

Queste fonti sostengono l'interpretazione del modello e i suoi limiti, ma non sono chiamate runtime dal codice attuale.

### SCELTE EURISTICHE DEL PROTOTIPO

Il modello ecologico attuale è un prototipo euristico e non un modello scientificamente validato. Le regole di pesatura attuali sono:

- 35% idratazione
- 25% temperatura
- 25% ospiti
- 10% sequenza pioggia
- 5% rilievo

Questi pesi sono scelte del prototipo, NON parametri scientificamente validati. Le soglie e le penalità sono interpretazioni progettuali e non una misura di probabilità biologica.

## Dati non osservati e quindi non sostituiti a caso

Il prototipo NON assume automaticamente i seguenti fattori come se fossero osservati o misurati nel punto:

- micelio presente a livello locale
- pH del suolo puntuale
- lettiera e humus
- gestione recente del bosco
- chioma e struttura del soprassuolo
- incendi o tagli recenti
- pressione di raccolta
- disponibilità di acqua effettiva nel suolo del punto
- presenza reale di sporocarpi in quel preciso luogo

Questi elementi restano fuori dal modello o vengono usati come limiti dichiarati, non come numeri inventati.

## Regole di trattamento delle fonti

- `missing data != zero`: i dati mancanti restano null o assenti.
- il modello usa dati modellistici e cartografici come contesto, non come misure puntuali.
- prezzi/commenti/attributi non verificati non vengono inventati.
- le osservazioni botaniche storiche non diventano presenze attuali.
- i dati delle aree protette e dei sentieri non certificano accessibilità, sicurezza o apertura del sito.
- le coordinate interrogate vengono inviate ai provider esterni, non le note private del diario.

## Contratti e API utilizzate

Le richieste alle API Botanica passano da `src/frontend/clients/botanica-api.mjs`. L'eccezione intenzionale è il fallback browser Open-Meteo in `src/frontend/clients/weather.mjs`, che chiama direttamente `https://api.open-meteo.com/v1/forecast` per ottenere dati meteo quando la path backend non è disponibile o è incompleta.

I contratti principali sono:

- `GET /api/environment?lat=...&lon=...`
- `GET /api/land?lat=...&lon=...`
- `GET /api/around?lat=...&lon=...&radius=...`

## Cache, fallback e limiti trasversali

- cache backend in memoria per meteo e cartografia
- fallback locale per sentieri/luoghi naturali
- fallback browser Open-Meteo per dati meteo
- i dati mancanti non vengono trasformati in zero
- `status: "unavailable"` è il modo standard per segnalare la perdita della fonte
- la provenienza e la risoluzione delle fonti vanno sempre mantenute distinte

## Fonti statiche del repository

### `data/catalog/trekking-fallback.json`

Catalogo locale di trekking e luoghi naturali. È usato come fallback quando i provider live non rispondono o restituiscono dati incompleti.

### `data/forecast/forecast-points.json`

Punti campione per il forecast sostenuto da UCS e validati come copertura forestale quando possibile.

## Riepilogo dei limiti

- dati storici ≠ presenza attuale
- modello meteorologico ≠ sensore di bosco
- DEM 90 m ≠ rilievo in campo
- codice cartografico ≠ accessibilità autorizzata
- griglia forestale ≠ verifica puntuale di specie
- output del prototipo ≠ previsione scientificamente validata
