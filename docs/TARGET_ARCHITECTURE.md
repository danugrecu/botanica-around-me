# Architettura target proposta

Questa è una proposta di riordino incrementale. Non modifica ancora file applicativi, contratti o algoritmi. Mantiene una singola applicazione semplice e due backend compatibili durante la transizione.

## Principi

- Un solo prodotto modulare, non microservizi.
- Nessun framework frontend/backend imposto.
- Nessun database: il diario resta locale finché non emerge un requisito reale.
- `dist/`, se mantenuta, contiene solo output generato.
- Provider esterni dietro adattatori espliciti; business logic e UI non conoscono URL grezzi.
- Ecologia pura e testabile senza rete.
- Dati generati con input, data, versione e provenance verificabili.
- Contratti API documentati e testati su entrambi i backend.

## Struttura proposta

```text
.
├── src/                              # SOURCE CODE
│   ├── frontend/
│   │   ├── ui/                       # viste, rendering, accessibilità
│   │   ├── map/                      # Leaflet, layer, marker, geometrie
│   │   ├── around/                   # Around Me e filtri raggio
│   │   ├── forecast/                 # forecast punti e ranking
│   │   ├── ecology/                  # profili, habitat, predict; logica pura
│   │   ├── diary/                    # localStorage, CSV, backup JSON
│   │   ├── clients/                  # client HTTP browser e fallback meteo
│   │   └── shared/                   # date, distanza, escape, tipi/contratti
│   ├── backend/
│   │   ├── api/                      # routing e validazione endpoint
│   │   ├── services/                 # environment, land, around
│   │   ├── providers/                # Toscana, Open-Meteo, Overpass, GBIF
│   │   ├── geography/                 # GML, poligoni, distanza, bounds
│   │   ├── config/                   # limiti, TTL, endpoint non sensibili
│   │   └── local-python/              # implementazione compatibile Python
│   └── hosted/                       # implementazione Worker compatibile
├── data/                             # DATA
│   ├── catalog/                      # cataloghi statici versionati
│   ├── forecast/                     # punti campione e metadata
│   └── fixtures/                     # risposte ridotte per test
├── research/                         # RESEARCH
├── docs/                             # DOCUMENTATION
├── tests/                            # TESTS
│   ├── unit/
│   ├── contract/
│   ├── integration/
│   └── fixtures/
├── scripts/                          # SCRIPTS riproducibili
├── vendor/                           # THIRD PARTY / VENDOR
│   └── leaflet/
├── public/                           # asset sorgente statici, se distinto da src
└── dist/                             # GENERATED OUTPUT ONLY
```

La suddivisione è un obiettivo, non un invito a spostare subito i file. Ogni spostamento futuro deve conservare URL relativi, asset, contratti e test.

## Confini di responsabilità

- **UI**: interpreta stato e produce DOM; non costruisce query a provider.
- **Mappa**: converte record/geometrie in layer Leaflet; non calcola l'indice ecologico.
- **Around Me**: coordina dati di attività e raggio; usa servizi/client e un modello di vista.
- **Forecast**: coordina punti, cache e ranking; delega il punteggio a Ecology.
- **Funghi/Ecology**: profili, habitat, fattori e soglie; nessun HTTP, localStorage o Leaflet.
- **Diario**: persistenza locale ed export; non modifica previsioni né invia note.
- **API client**: serializza richieste e normalizza errori del browser.
- **API backend**: routing, validazione input e serializzazione del contratto.
- **Services**: compongono provider in `environment`, `land`, `around`.
- **Provider dati**: conoscono endpoint, parametri, parsing, TTL, fallback e provenance.
- **Geografia**: GML, contiene-punto, distanza e bounds condivisi.
- **Configurazione**: limiti territoriali, URL, TTL e versioni; niente credenziali.

## Dati e output

I cataloghi devono uscire da `dist/` e vivere in `data/` come input/runtime versionati. Ogni catalogo dovrebbe avere un metadata minimo: `verifiedAt`, fonte, query o input, versione/hash se disponibile e limiti. Gli asset Leaflet devono vivere in `vendor/` con licenza.

`dist/` viene prodotto dal build e non deve essere il luogo di modifica manuale. Il build deve fallire con un messaggio esplicito se manca un input obbligatorio, come il manifest hosted.

## Backend doppio

### Fase A: compatibilità mantenendo Python e JavaScript

1. Definire uno schema documentato per i tre endpoint e gli errori `status: unavailable`.
2. Estrarre fixtures deterministiche di GML, elevation, forecast, Overpass e GBIF senza dati personali.
3. Mettere le stesse richieste dietro provider nominati in ciascun runtime.
4. Aggiungere contract test che eseguano le funzioni equivalenti dei due backend con fixture e confrontino shape, tipi, limiti, arrotondamenti, status e messaggi essenziali.
5. Aggiungere test HTTP per validazione coordinate, radius, endpoint sconosciuto, HEAD/GET e controlli origin/host dove applicabili.
6. Registrare esplicitamente le differenze inevitabili: Python serve file e ascolta loopback; Worker riceve asset inline; parser XML e cache hanno implementazioni diverse.

In questa fase non si sceglie Python o JavaScript e non si riscrive l'applicazione.

### Fase B: valutazione successiva

Dopo una fase di uso e contract test verdi, confrontare manutenzione, compatibilità runtime, costi/limiti del deployment, osservabilità e riproducibilità. Solo allora decidere se convergere su una implementazione. La decisione deve essere documentata e non può essere implicita in uno spostamento di file.

## Contract test candidati

- `/api/environment` con fixture completa e parziale: chiavi, coordinate arrotondate, quattro fonti e status.
- `/api/land`: assenza di `weather`, presenza di forest/soil/terrain.
- `/api/around`: radius valido, limiti di cardinalità, sources, weather daily e dati mancanti.
- GML con multipolygon e buchi: stesso risultato `contains`.
- Elevation con cinque valori e risposta incompleta.
- Forecast con dati null: nessun zero sintetico.
- Errore upstream: `status: unavailable`, nessuna eccezione non serializzata.
- Input fuori area, raggio non valido e percorso API sconosciuto.

## Migrazione da `dist/` misto

La prima migrazione dovrebbe copiare e adattare i percorsi del build, non riscrivere i moduli. Per ogni gruppo: aggiungere test/import di compatibilità, spostare una sola responsabilità, aggiornare il build, verificare output e solo dopo rimuovere il duplicato. Finché la migrazione non è completa, il vecchio percorso deve restare la baseline funzionante.
