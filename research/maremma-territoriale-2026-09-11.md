# Inventario territoriale Maremma — 11 settembre 2026

## Scopo operativo

La parola “Maremma” non coincide con un solo confine amministrativo. Per evitare risultati arbitrari, questa versione usa due livelli distinti:

1. il catalogo stabile di itinerari e luoghi naturali è ritagliato sul confine della Provincia di Grosseto;
2. l’inquadramento ecologico usa gli ambiti paesaggistici regionali 16 Colline Metallifere, 18 Maremma grossetana, 19 Amiata e 20 Bassa Maremma e ripiani tufacei, limitatamente al territorio coperto dall’app.

La Regione Toscana elenca questi ambiti nel PIT-PPR e descrive la Maremma grossetana come un mosaico di sistemi costieri, pianure, colline e rilievi. Fonti: [PIT-PPR](https://www.regione.toscana.it/-/pit-con-valenza-di-piano-paesaggistico-adozione-d-c-r-n-58-del-02-luglio-2014), [Ambito 18](https://www.regione.toscana.it/documents/10180/12604324/18_Maremma_Grossetana.pdf/961af3dd-f582-40e4-b31c-f58b15cd13b0), [Ambito 20](https://www.regione.toscana.it/documents/10180/12604324/20_Bassa_Maremma_e_ripiani_tufacei.pdf/c3cd65dd-269e-4186-8ca6-df2e687c7c56).

## Copertura ottenuta

Il catalogo del sito contiene 426 relazioni `route=hiking` e 28 aree naturali nominate, tutte con centro cartografico interno al confine provinciale salvo Cala di Forno, aggiunta dalla traccia GPX ufficiale del Parco. La distribuzione è suddivisa in otto settori:

| Settore | Itinerari | Luoghi naturali |
|---|---:|---:|
| Bandite, Tirli e costa nord | 113 | 4 |
| Colline Metallifere e Montioni | 93 | 5 |
| Arcipelago maremmano | 43 | 0 |
| Bassa Maremma e ripiani tufacei | 43 | 4 |
| Argentario e costa meridionale | 42 | 5 |
| Amiata e alta valle dell’Albegna | 39 | 4 |
| Maremma grossetana centrale | 38 | 2 |
| Uccellina e costa del Parco | 15 | 4 |

Questi numeri misurano la copertura del catalogo, non l’apertura o la manutenzione corrente. Le relazioni provengono da OpenStreetMap/Overpass, acquisite l’11 settembre 2026. Sulla mappa sono sovrapposte anche le linee ufficiali dell’Itinerario Naturalistico Toscano e i sentieri REI validati da un operatore certificato CAI tramite il [WMS Sentieristica della Regione Toscana](https://www502.regione.toscana.it/geoscopio/servizi/wms/SENTIERISTICA.htm).

Per il Parco Regionale della Maremma sono state confrontate le relazioni cartografiche con l’elenco ufficiale. Le schede del Parco pubblicano codice, difficoltà, lunghezza e, nelle pagine individuali, GPX; la pagina generale comprende A1, A1b, A2, A3, A4, A8, C1, C2, T1, T2 e T3, mentre la sezione passeggiate comprende A5, A6, A7, A9 e A10. Fonti: [Escursioni](https://parco-maremma.it/itinerari/a-piedi/), [Passeggiate](https://parco-maremma.it/itinerari/passeggiate/). Le regole possono cambiare con la stagione: nell’estate 2026 il Parco ha indicato l’obbligo di guida per diversi itinerari dal 15 giugno al 13 settembre, con eccezioni specifiche. Fonte: [informazioni estive 2026](https://parco-maremma.it/visitare-il-parco-in-estate-tutte-le-informazioni/).

## Strati ambientali

Il portale GEOscopio è il punto di accesso regionale ai dati territoriali; la Regione dichiara che consente visualizzazione, interrogazione e scarico della Base Informativa Territoriale e documenta i relativi WMS/WFS. Fonte: [GEOscopio](https://www.regione.toscana.it/-/geoscopio).

L’app usa:

- UCS 2019, scala 1:10.000, per stabilire se il punto ricade in bosco;
- carta della vegetazione forestale, griglia 250 m e scala nominale 1:250.000, per un’indicazione più specifica della formazione;
- IFT storico, maglia 400 m e rilievi integrati nei primi anni Novanta, solo come fonte secondaria;
- database pedologico regionale 1:10.000 per AWC, tessitura e contesto del suolo;
- Copernicus DEM GLO-90 per quota, pendenza ed esposizione;
- aree protette, riserve regionali e siti Natura 2000 per i perimetri di tutela;
- NatNet2 come strato di contesto per rilievi di specie e habitat vegetali.

Le età e le risoluzioni non vengono fuse come se fossero equivalenti. Fonti: [Uso e copertura del suolo](https://www502.regione.toscana.it/geoscopio/servizi/wms/USO_E_COPERTURA_DEL_SUOLO.htm), [Pedologia](https://www502.regione.toscana.it/geoscopio/servizi/wms/PEDOLOGIA.htm), [Aree protette e Natura 2000](https://www502.regione.toscana.it/geoscopio/servizi/wms/AREE_PROTETTE.htm), [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api).

## Flora

La flora mostrata come punti deriva da record georeferenziati GBIF degli ultimi cinque anni. Il sito conserva per ogni specie il record più vicino, mostra data e incertezza delle coordinate quando presenti e distingue esplicitamente un’osservazione archiviata dalla presenza attuale. Fonte: [GBIF Occurrence API](https://techdocs.gbif.org/en/openapi/v1/occurrence).

Questa scelta evita di trasformare elenchi floristici generali in localizzazioni inventate. Il numero di specie visualizzato dipende dai record pubblicati, dal campione massimo interrogato e dal raggio scelto; non è un censimento completo.

## Previsione fungina

La copertura passa da 6 a 21 campioni distribuiti nelle principali fasce forestali: Montioni, Bandite, Massa Marittima, Cornate e Fosini, Roccastrada, Farma, Tirli, Monti Leoni, Uccellina, Civitella-Paganico, Cinigiano, Scansano, Amiata, Pescinello-Monte Labbro, Monte Penna-Castell’Azzara, Sovana, Bosco dei Rocconi, Montauto-Manciano, Capalbio, Argentario e Giglio.

Ogni punto viene interrogato al momento dell’uso. Se UCS 2019 non restituisce copertura forestale, l’app non calcola la percentuale automatica. Se il tipo di alberi ospiti non è abbastanza specifico, il punteggio viene limitato a 69. L’indice combina acqua disponibile, temperatura, alberi ospiti, sequenza delle piogge e rilievo; vento, umidità atmosferica, deficit di vapore, gelo e siccità modificano il risultato.

I dati meteorologici comprendono 30 giorni precedenti e 7 giorni di previsione. Sono dati modellistici; umidità e temperatura del suolo non sono misure di un sensore nel bosco. Fonte: [Open-Meteo Forecast API](https://open-meteo.com/en/docs).

La percentuale esprime compatibilità delle condizioni, non probabilità di trovare funghi. Mancano presenza del micelio, gestione recente, lettiera, chioma attuale, pressione di raccolta, disturbi e misure locali. La validazione richiede uscite prospettiche registrate prima o indipendentemente dal risultato, includendo anche assenze e tempo di ricerca.

## Regole di raccolta

La raccolta in Toscana è disciplinata dalla L.R. 16/1999. La Regione indica autorizzazioni, limite giornaliero ordinario di 3 kg, dimensione minima di 4 cm per i porcini e divieto di raccogliere Amanita caesarea allo stato di ovolo chiuso. Parchi, riserve e singoli territori possono applicare regole ulteriori; gli aggiornamenti vanno controllati prima dell’uscita. Fonte: [Regione Toscana — raccolta funghi](https://www.regione.toscana.it/-/raccolta-funghi-ecco-le-disposizioni).

## Limiti cartografici

- Il centro di una relazione escursionistica non equivale al punto di partenza.
- La distanza mostrata è geodetica fra centro scelto e centro dell’oggetto; non è distanza stradale né lunghezza del percorso.
- I perimetri regionali descrivono l’oggetto cartografico, non autorizzano accesso o raccolta.
- I dati OpenStreetMap possono essere incompleti o non aggiornati; per i sentieri REI e per le aree protette prevalgono i livelli regionali e il sito del gestore.
- Un poligono di bosco riceve il valore del punto campione che contiene; il confine è preciso quanto la carta, il punteggio non ha la stessa risoluzione spaziale.
