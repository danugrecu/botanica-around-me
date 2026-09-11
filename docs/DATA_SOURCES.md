# Inventario delle fonti dati

Inventario basato esclusivamente su URL, parametri e commenti presenti nella repository. Quando il codice non permette di verificare dataset, versione o risoluzione, è indicato `TODO`.

## Fonti runtime

| Fonte / provider | Endpoint o servizio | Modulo/funzione | Dati recuperati | Risoluzione o periodo dichiarato | Cache | Fallback / limiti verificabili | Provenance repository |
|---|---|---|---|---|---|---|---|
| Regione Toscana GEOscopio, UCS/vegetazione/IFT | WMS `https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms`, map `wmsucs`, `GetFeatureInfo`, `INFO_FORMAT=text/gml` | `server.py:cartography`, `hosted/backend.mjs:cartography`, layer Leaflet in `app.mjs` | UCS 2019, vegetazione forestale, IFT storico e geometrie/proprietà del punto | UCS 2019 1:10.000; vegetazione 250 m / scala nominale 1:250.000; IFT storico 400 m, anni '90, secondo ricerca/UI | Backend 24 h; layer browser senza cache applicativa dichiarata | Il WMS può restituire vicini: il codice conserva solo poligoni che contengono il punto. Non-bosco/copertura ignota impediscono l'indice. | `research/metodo-v2.md`, `research/maremma-territoriale-2026-09-11.md`, `dist/index.html`, `dist/model.mjs` |
| Regione Toscana GEOscopio, pedologia | OWS `https://www502.regione.toscana.it/ows2/com.rt.wms.RTmap/wms`, map `owspedologia`, layer `awc_available_water_capacity` | `cartography(..., soil=True)` in entrambi i backend | AWC, tessitura e proprietà grezze dell'unità pedologica | La ricerca dichiara database pedologico 1:10.000; la risposta non è una misura puntuale | Backend 24 h | La geometria viene rimossa dalla risposta suolo; drenaggio/sostanza organica non sono usati come pesi autonomi. Errori diventano `status: unavailable`, non zero. | `research/metodo-v2.md`, `dist/index.html` |
| Regione Toscana, sentieristica | WMS `https://www502.regione.toscana.it/ows_sentieristica/com.rt.wms.RTmap/wms?map=owssentieristica`; documentazione WMS con link GEOscopio | Layer in `around.mjs`; catalogo generato da `build_maremma_catalog.py` | Itinerario Naturalistico Toscano e sentieri REI | Il codice non espone scala/versione del layer | Nessuna cache applicativa dichiarata | Solo overlay mappa; non è usato per calcolare la distanza dei punti OSM. Limiti/accessibilità non sono certificati. | `research/maremma-territoriale-2026-09-11.md`, `dist/around.mjs` |
| Regione Toscana, aree protette/Natura 2000 | WMS `...wmsarprot`, layer `rt_arprot.idrisnatreg.rt.poly,rt_arprot.idsir.rt.poly` | Overlay `around.mjs`; riferimenti catalogo/script | Perimetri di riserve e siti Natura 2000 | TODO: versione/data e scala del layer non ricavabili dal codice | Nessuna cache applicativa dichiarata | Perimetro cartografico, non autorizzazione ad accesso/raccolta; punti nominati live arrivano da OSM. | `research/maremma-territoriale-2026-09-11.md`, `dist/index.html` |
| Regione Toscana, NatNet2 | Layer `rt_arprot.rilievi_specie_habitat_natnet2_veg` sullo stesso WMS regionale | Overlay `around.mjs` | Contesto di rilievi di specie e habitat vegetali | TODO: data, scala e dataset esatto non ricavabili | Nessuna cache applicativa dichiarata | È solo contesto visivo; i record Flora applicativi arrivano da GBIF. | `research/maremma-territoriale-2026-09-11.md`, `dist/around.mjs` |
| Open-Meteo Forecast API | `https://api.open-meteo.com/v1/forecast` | `server.py:weather`, `hosted/backend.mjs:weather`, `dist/weather.mjs` | Codice meteo, pioggia, temperature, vento, ET0; temperatura/umidità suolo, RH e VPD orari | `past_days=30`, `forecast_days=7`, timezone `Europe/Rome`; griglia modellistica dell'ordine dei km | Backend 1 h; browser fallback senza cache propria oltre alle cache chiamanti | Se manca `daily`/`hourly`, risposta non disponibile. Dati modellistici, non sensori del bosco; modello/meteo provider non fissato nel codice. | `research/metodo-v2.md`, `dist/index.html`, `dist/weather.mjs` |
| Open-Meteo Elevation API / Copernicus DEM | `https://api.open-meteo.com/v1/elevation` | `server.py:terrain`, `hosted/backend.mjs:terrain` | Cinque quote per centro e offset nord/sud/est/ovest; pendenza/aspetto derivati | Offset nominale 90 m; sorgente dichiarata Copernicus DEM GLO-90 | Backend 24 h | Risposta deve contenere esattamente 5 valori finiti; pendenza/aspetto sono stime DEM, non rilievo in campo. | `research/metodo-v2.md`, `dist/index.html` |
| OpenStreetMap / Overpass API | `https://overpass-api.de/api/interpreter?` e fallback `https://overpass.kumi.systems/api/interpreter?` | `server.py:overpass_context`, `hosted/backend.mjs:overpassContext` | Relazioni `route=hiking`, `leisure=nature_reserve`, `boundary=protected_area`, tag e centro | Query bbox del raggio; massimo 140 elementi upstream, 40 trekking e 30 natura restituiti | Backend 1 h; Worker 1 h | Fallback tra due endpoint; filtra distanza geodetica; dati OSM possono essere incompleti/non aggiornati; il centro non è partenza. | `research/maremma-territoriale-2026-09-11.md`, `dist/index.html` |
| GBIF Occurrence API | `https://api.gbif.org/v1/occurrence/search` | `server.py:flora_context`, `hosted/backend.mjs:floraContext` | Record vegetali con coordinate, specie, famiglia, data, incertezza, basis of record e URL | `taxon_key=6`, ultimi 5 anni, bbox del raggio, `limit=300`; massimo 35 specie mostrate | Backend 30 min; frontend Around Me cache locale 30 min | Distanza reale rifiltra il bbox; conserva il record più vicino per specie; archivio, non presenza attuale o censimento completo. | `research/maremma-territoriale-2026-09-11.md`, `dist/index.html`, `dist/around.mjs` |
| OpenStreetMap tile service | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | `app.mjs` | Sfondo cartografico | TODO: policy/cache non documentate nel repository | Gestione cache del browser | Attribution presente; tileerror mostra messaggio ma la mappa può restare senza sfondo. | `dist/app.mjs`, `dist/index.html` |
| Browser Geolocation API | API del browser, nessun endpoint fisso | `app.mjs:navigator.geolocation` | Latitudine, longitudine, accuratezza dichiarata | Precisione variabile del dispositivo; non equivale a precisione predittiva | Nessuna cache (`maximumAge: 0`) | Permesso negato/errore; il punto è accettato solo nell'area UI. | `dist/app.mjs`, `dist/index.html` |

## Cataloghi e fonti territoriali statiche

| Fonte | Uso | Data/versione | Cache o artefatto | Limiti |
|---|---|---|---|---|
| OpenStreetMap/Overpass acquisito dal generatore | 426 relazioni e luoghi filtrati sul confine della Provincia di Grosseto | `verifiedAt: 2026-09-11` nel JSON; input grezzi non versionati | `dist/trekking-fallback.json`, usato come fallback browser | Non è aggiornamento live; input in `/private/tmp` non incluso e quindi rigenerazione non riproducibile dalla repository sola. |
| Parco Regionale della Maremma | Lunghezze/difficoltà delle relazioni ufficiali e coordinate A4 Cala di Forno | URL ufficiali; data di acquisizione non registrata nello script | Incorporato nel catalogo JSON | Regole e accessi stagionali possono cambiare; il catalogo non certifica apertura. |
| Confine Provincia di Grosseto | Filtro geometrico del catalogo | File `/private/tmp/grosseto-province.geojson`; data dichiarata nel catalogo | Non presente nella repository | TODO: versionare hash/data e licenza del confine usato. |
| Campioni forestali | Coordinate di `forecast-points.json` selezionate interrogando UCS | Script scrive `checkedOn: 2026-09-11` | JSON dentro `dist/` | Le risposte WMS usate per la selezione non sono archiviate; dati live possono cambiare. |

## Fonti di ricerca, non provider runtime

`research/metodo-v2.md` cita Forestas per *Amanita caesarea*, Parco Appennino per i quattro porcini, due studi scientifici su acqua/micelio, documentazione Regione Toscana, Open-Meteo e SoilGrids FAQ. Queste fonti giustificano assunzioni o limiti del modello, ma il codice runtime non le interroga.

La documentazione cita inoltre PIT-PPR, ambiti paesaggistici regionali e regole toscane di raccolta. Sono riferimenti informativi/editoriali, non input al calcolo.

## Cache e fallback trasversali

- Cache backend in memoria, indicizzata dall'URL completo: territorio/elevazione 24 h, meteo 1 h, Overpass 1 h, GBIF 30 min.
- `around.mjs` conserva dati per centro/raggio in `localStorage` per 30 minuti e fonde il catalogo statico.
- `forecast.mjs` conserva l'ambiente per punto in `localStorage` per un'ora.
- `app.mjs` usa Open-Meteo dal browser se il backend non restituisce il meteo.
- Errori di fonte sono esposti come `status: unavailable`; i dati mancanti non diventano zero.

## Informazioni da completare

- TODO: versione precisa/API revision e licenza dei layer regionali usati.
- TODO: modello numerico e griglia esatta dell'endpoint Forecast per ogni variabile.
- TODO: data di acquisizione e hash degli input del catalogo Maremma.
- TODO: schema formale/versione delle risposte `/api/environment`, `/api/land`, `/api/around`.
- TODO: policy di attribuzione/cache per tile OpenStreetMap e dataset GBIF/OSM.
- TODO: fonte autorizzativa per account e configurazione del dispatcher hosted: non è nel repository.
