# Base di ricerca e scelte della versione 2

Ricerca e verifica delle fonti: 10 settembre 2026. Obiettivo: affinare il luogo da esplorare in Maremma, senza confondere cartografia dettagliata con certezza biologica.

## Evidenze ecologiche

I cucchi sono qui interpretati come Amanita caesarea. Forestas ne descrive il legame con boschi caldi di querce e castagni. Fonte: https://www.sardegnaforeste.it/fungo/amanita-caesarea

I quattro porcini sono separati. Le schede del Parco Appennino descrivono l'estivo sotto latifoglie e in condizioni più calde, edulis in ambienti più freschi, pinophilus anche in castagneti e faggete, e aereus in boschi più caldi. Sono descrizioni ecologiche di un contesto diverso dalla Maremma, non parametri quantitativi direttamente trasferibili. Fonte (pagine stampate 4–5): https://www.parcoappennino.it/campionato.mondiale.fungo/pdf/Brochure.funghi.mondiale.pdf

La disponibilità d'acqua non si riduce alla pioggia degli ultimi giorni. Uno studio sperimentale su funghi ectomicorrizici, incluso B. edulis, documenta il possibile contributo di acqua profonda durante la siccità. Non consente di ricavare soglie universali in Maremma. Fonte: https://nph.onlinelibrary.wiley.com/doi/10.1111/j.1469-8137.2009.02775.x

Uno studio su castagneti e micelio di edulis e reticulatus evidenzia interazioni fra suolo e clima e differenze fra specie. Studiare il micelio non equivale a prevedere la comparsa dei corpi fruttiferi. Struttura del bosco e gestione restano potenziali fattori non osservati. Fonte: https://www.frontiersin.org/journals/soil-science/articles/10.3389/fsoil.2023.1159793/full

## Dati integrati e risoluzioni

| Dato | Fonte | Impiego | Limite |
|---|---|---|---|
| Punto e accuratezza dispositivo | Geolocation API | Localizzazione, non punteggio | GPS variabile; nessuna equivalenza con precisione predittiva |
| Uso del suolo | Regione Toscana UCS 2019, 1:10.000 | Poligono contenente il punto e maschera boscata | Carta del 2019, non stato attuale certificato |
| Vegetazione | Regione Toscana, griglia 250 m / carta 1:250.000 | Tipo di alberi quando reperibile | Griglia non equivale ad accuratezza di 250 m |
| Alberi da IFT | Inventario storico, 400 m | Ulteriore informazione specie se disponibile | Rilievi molto datati; segnala conflitti con UCS |
| AWC | Pedologia regionale | Modula la penalità da deficit idrico | Capacità dell'unità di suolo, non acqua misurata |
| Sabbia, limo, argilla | Pedologia regionale | Contesto visibile | Nessun peso biologico inventato |
| Sostanza organica e drenaggio grezzi | Pedologia regionale | Conservati nella risposta | Esclusi dal calcolo: interpretazione/unità o legenda non sufficientemente verificate |
| Quota, pendenza, esposizione | Copernicus GLO-90 via Open-Meteo | Quota e morfologia, piccola modifica microclimatica | Campioni 90 m; non TWI o rilievo in campo |
| Pioggia 7/14/30 giorni, siccità, impulso | Open-Meteo | Antecedenti idrici e sequenza delle piogge | Passato modellistico, non pluviometro |
| ET0 e bilancio P−ET0 | Open-Meteo | Indicatore di asciugatura | ET0 di riferimento non ET reale del bosco |
| Temperatura del suolo, aria, gelo | Open-Meteo | Compatibilità termica specie | Modello su celle chilometriche |
| Umidità suolo a due profondità | Open-Meteo | Disponibilità d'acqua modellata | Non sensori del sottobosco |
| Vento, RH e VPD | Open-Meteo | Penalità di stress evaporativo | Variabili correlate, contributi limitati |
| Mesi e preferenze degli ospiti | Profili euristici basati su ecologia qualitativa | Compatibilità e stagionalità | Non soglie validate |
| Uscite, coordinate, tempo ed esito | Diario privato | Valutazione futura | Nessun apprendimento automatico e bias di osservazione |

Fonti cartografiche:
- https://www502.regione.toscana.it/geoscopio/servizi/wms/USO_E_COPERTURA_DEL_SUOLO.htm
- https://www502.regione.toscana.it/geoscopio/servizi/wms/PEDOLOGIA.htm
- https://www.regione.toscana.it/documents/11974914/12673503/Procedure_tecniche_e_metodologiche_di_rilevamento_pedologico_RT.pdf
- https://open-meteo.com/en/docs
- https://open-meteo.com/en/docs/elevation-api

## Modello implementato

`src/frontend/ecology/ecology.mjs` è la fonte esatta delle formule. Tutte le soglie seguenti sono scelte di prototipo, non risultati dimostrati dalla letteratura.

- 35% idratazione: pioggia antecedente su 14/30 giorni combinata con umidità modellata in superficie e in profondità. Se manca il suolo, usa il solo segnale di pioggia e segnala la mancanza. AWC modula la penalità per P−ET0 negativo, non viene sommata come prova indipendente.
- 25% temperatura: media 3 giorni del suolo a 6 cm, con ripiego sulla media 5 giorni dell'aria. Intervalli di lavoro distinti per specie, con penalità graduali fuori intervallo.
- 25% ospiti: compatibilità qualitativa fra profilo e tipo di bosco. Boschi non identificati per specie: limite prudenziale 69. Fuori bosco o copertura ignota: nessun indice automatico.
- 10% sequenza pioggia: ultimo impulso di almeno 10 mm in tre giorni, ricercato nel passato. È una forma euristica di ritardo, non una regola di nascita.
- 5% rilievo: pendenza, con lieve modifica da esposizione in funzione del caldo/fresco. Nessuna pretesa di modellare la circolazione idrica del versante.
- Penalità limitate per VPD, aria secca e vento; moltiplicatori per gelo, siccità marcata e fuori stagione.
- Una finestra favorevole raggruppa giorni consecutivi con indice almeno 70 intorno al massimo previsto. Può non esistere.

Il gruppo porcini prende il massimo tra quattro profili. Nella vista settimanale il profilo vincente può cambiare. Non sommare i punteggi e non interpretarli come percentuali di trovare funghi.

## Elementi necessari non ancora osservati

pH e chimica del suolo nel punto, micelio effettivamente presente, lettiera, struttura attuale della chioma, età e gestione del bosco, incendi e tagli recenti, ruscellamento reale, pressione di raccolta e dati micologici prospettici. Non vengono sostituiti con numeri arbitrari. SoilGrids REST non è stato scelto come dipendenza: la documentazione ISRIC dichiara il servizio temporaneamente sospeso (https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_02.html). La luna non è stata introdotta: nessuna evidenza verificata qui ne giustifica un contributo.

## Verifica della qualità predittiva

Confrontare uscite con sforzo simile, includere esiti negativi e campionare più habitat e stagioni. Salvare previsioni prima delle uscite in un protocollo futuro; lo snapshot odierno del diario è contemporaneo e può essere successivo alla ricerca. Valutare su dati non usati per calibrare. Solo dopo questo confronto sarà lecito dichiarare un aumento misurato dell'accuratezza.

## Privacy e pubblicazione

La nuova versione è locale. Nessun nuovo push, salvataggio versione remota o deployment autorizzato. Diario e snapshot restano nel browser. I fornitori esterni ricevono le coordinate delle interrogazioni e della cartografia, mai le note delle uscite.
