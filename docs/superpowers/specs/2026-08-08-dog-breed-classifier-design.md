# Dog Breed Classifier — Documento di design

**Data:** 2026-08-08
**Stato:** approvato, pronto per il piano operativo
**Progetto:** primo progetto del portfolio MLE

---

## 1. Obiettivo

Costruire un classificatore di razze canine con demo web pubblica, come **progetto di punta** del portfolio da MLE junior.

Il progetto deve reggere lo sguardo su quattro fronti contemporaneamente:

1. **Risultati del modello** — accuratezza competitiva e onestamente misurata
2. **Qualità del training** — esperimenti tracciati, scelte motivate, error analysis
3. **Messa in produzione** — API containerizzata, deploy reale, test, CI, monitoraggio
4. **Frontend** — interfaccia curata e usabile, upload immagine, risultati leggibili

Criterio guida: un visitatore tecnico deve capire in 5 minuti che chi l'ha scritto **sa cosa sta facendo**, non che ha seguito un tutorial.

### Non obiettivi

- Non è un prodotto. Nessun utente reale da servire, nessun SLA.
- Non è ricerca. Nessuna architettura nuova, nessuno stato dell'arte da battere.
- Non è la vetrina del portfolio. Il sito indice dei progetti è un **progetto separato**, da affrontare quando esisterà almeno un progetto da indicizzare.

---

## 2. Vincoli

| Vincolo | Valore | Conseguenza |
|---|---|---|
| Hardware training | RTX 3070 Laptop, 8 GB VRAM | Training in locale, zero costi, batch e modelli di taglia media |
| Hardware inferenza | VPS 2 vCPU, ~4 GB RAM, **no GPU** | Il modello va scelto contro un budget di latenza CPU |
| Budget | 5–10 €/mese | VPS piccolo sempre acceso; niente GPU cloud |
| Competenze presenti | training reti neurali, frontend | Su queste si procede spediti |
| Competenze da acquisire | API Python, Docker, ops | Su queste il piano operativo va più a fondo |

**Ambiente già disponibile:** Python 3.12/3.13, conda, uv, Docker 29, Node 22, git.

---

## 3. Architettura

Tre componenti indipendenti, deployati separatamente.

```
                  ┌─────────────────────────┐
   utente ────────│  web/  React statico    │
                  │  Cloudflare Pages       │
                  │  gratis, CDN, istantaneo│
                  └───────────┬─────────────┘
                              │ HTTPS, JSON
                              ▼
                  ┌─────────────────────────┐
                  │  serving/  FastAPI+ONNX │
                  │  Docker su VPS + Caddy  │
                  │  sempre acceso          │
                  └───────────┬─────────────┘
                              │ carica all'avvio
                              ▼
                  ┌─────────────────────────┐
                  │  model.onnx + model.json│
                  │  HuggingFace Hub        │
                  └───────────▲─────────────┘
                              │ pubblicato da
                  ┌───────────┴─────────────┐
                  │  projects/dog-breed/    │
                  │  training, mai deployato│
                  │  gira solo in locale    │
                  └─────────────────────────┘
```

### Perché frontend e API sono separati

Il frontend statico su CDN si apre istantaneamente ovunque e non può rompersi insieme al server. L'API sul VPS è l'unica cosa che richiede manutenzione. Quando arriverà la vetrina del portfolio, si aggiungerà accanto al frontend senza toccare il serving.

### Perché il serving non sa nulla di PyTorch

Il container di serving installa solo `onnxruntime`, `fastapi`, `pillow`, `numpy`. **PyTorch non entra**: sono ~2 GB che non servono a nessuno in produzione. Questa ignoranza deliberata rende il servizio piccolo, veloce da deployare e semplice da testare.

### Perché non esiste una cartella `shared/`

Con un solo progetto non è possibile sapere cosa sarà davvero comune: qualunque astrazione ora sarebbe un'ipotesi. Si estrarrà quando ci saranno due o tre casi reali.

Il rischio che `shared/` risolverebbe — il **train/serve skew**, cioè preprocessing divergente tra training e produzione — viene risolto diversamente e meglio: **il modello si autodescrive**.

Accanto a `model.onnx` viene pubblicato `model.json`:

```json
{
  "model_version": "convnext_tiny-v1.2",
  "input_size": 224,
  "interpolation": "bicubic",
  "mean": [0.485, 0.456, 0.406],
  "std":  [0.229, 0.224, 0.225],
  "classes": ["affenpinscher", "..."],
  "ood": { "method": "mahalanobis", "threshold": null }
}
```

Il serving legge quel file e si configura da solo. Non esistono due copie della verità, quindi non possono divergere.

(`threshold` è `null` finché la taratura del gate OOD non lo determina, in M3.)

---

## 4. Struttura del repository

```
portfolio/
├── projects/dog-breed/
│   ├── data/            # dataset scaricati — gitignored
│   ├── src/dogbreed/    # package: data, model, train, eval, export, ood
│   ├── configs/         # configurazione degli esperimenti
│   ├── notebooks/       # esplorazione ed error analysis
│   ├── artifacts/       # checkpoint e onnx — gitignored
│   ├── reports/         # metriche, confusion matrix, model card — versionati
│   ├── tests/
│   └── pyproject.toml
├── serving/
│   ├── app/             # FastAPI: endpoint, preprocessing, inferenza, gate OOD
│   ├── tests/
│   ├── Dockerfile       # multi-stage
│   └── pyproject.toml
├── web/                 # React + TypeScript + Vite
├── deploy/              # docker-compose.yml, Caddyfile
├── docs/superpowers/specs/
└── README.md
```

**Lingua:** documenti interni (design, note) in italiano; artefatti rivolti all'esterno (README principale, model card, commenti nel codice) **in inglese**, perché sono ciò che legge chi valuta.

---

## 5. Dataset e strategia di valutazione

### Dataset primario — Stanford Dogs

120 razze, 20.580 immagini, ~750 MB, split ufficiale 12.000 train / 8.580 test. È lo standard del task, quindi i risultati sono confrontabili con la letteratura.

### Il problema della contaminazione

Stanford Dogs è **derivato da ImageNet**. Ogni backbone pre-addestrato su ImageNet-1k ha già visto quelle immagini in pretraining. L'accuratezza sul test set ufficiale è quindi **contaminata**: misura in parte memorizzazione, non riconoscimento.

Quasi tutti i progetti simili riportano quel numero senza commentarlo. Questo progetto lo dichiara e lo **misura**.

### Valutazione incrociata — Oxford-IIIT Pet

Dataset raccolto indipendentemente, contiene ~25 razze canine che si sovrappongono con Stanford Dogs. Il modello viene valutato lì **senza riaddestramento**: il divario tra i due numeri quantifica quanto il primo era gonfiato.

Lo stesso download fornisce anche **12 razze di gatti**, usate come negativi difficili per tarare il gate OOD (quattro zampe, pelo, muso, stessa inquadratura: se il gate regge sui gatti, regge su tutto).

Un solo dataset aggiuntivo, tre usi.

### Opzionale

50–100 foto scattate col telefono (sfocate, cani di spalle, poca luce) come terzo set di valutazione. Da fare solo se il resto è finito.

### Metriche riportate

Generate da codice, mai scritte a mano:

- accuracy top-1 e top-5 su Stanford Dogs test *(numero contaminato)*
- accuracy top-1 su Oxford-IIIT Pet *(numero onesto)*
- % di gatti classificati come cani *(falsi positivi OOD)*
- % di cani veri rifiutati *(falsi negativi OOD)*
- latenza CPU p50 / p95
- confusion matrix e top confusioni tra razze

---

## 6. Modello e criterio di selezione

Libreria: **`timm`**. Risoluzione: **224px**. Training con AMP sulla 3070.

Tre esperimenti, non dieci:

| # | Configurazione | Ruolo | Attesa |
|---|---|---|---|
| 1 | Linear probe su backbone congelato (`resnet50`) | baseline, stabilisce il pavimento | ~70–75% |
| 2 | Fine-tuning completo `efficientnet_b0` (~5M par.) | candidato veloce | ~85–88% |
| 3 | Fine-tuning completo `convnext_tiny` (~28M par.) | candidato accurato | ~90–93% |

Ognuno richiede 20–40 minuti sulla GPU locale.

### Criterio di selezione — fissato prima di allenare

**Non si sceglie il modello più accurato. Si sceglie il più accurato che rispetta il budget di produzione:**

- **latenza p95 sotto 300 ms** su CPU (2 vCPU), modello quantizzato
- **immagine Docker sotto 500 MB**

Se il candidato accurato sfora, vince quello veloce — e il README lo spiega. Un modello scelto contro un vincolo dichiarato in anticipo è una storia molto più forte di "ho preso quello con l'accuracy più alta".

### Export

PyTorch → ONNX → **quantizzazione dinamica int8**. La perdita di accuratezza dovuta alla quantizzazione viene **misurata e riportata**, non data per trascurabile.

Il modello esporta due output: le **logits** (per la classificazione) e l'**embedding penultimo** (per il gate OOD), così una sola inferenza serve entrambi.

---

## 7. Gate "non è un cane" (OOD detection)

### Perché la soglia sulla confidenza non basta

Il softmax distribuisce probabilità **solo tra le 120 razze note**: non può rispondere "nessuna delle precedenti", la somma deve fare 1. Le reti risultano quindi sistematicamente **troppo sicure** su input mai visti — la foto di un'automobile può produrre `0.87 Chihuahua`. Filtrare sulla confidenza cattura solo i casi facili.

### Soluzione scelta — distanza nello spazio delle feature

Durante l'export si calcolano e si salvano le statistiche degli embedding del training set (medie per classe e covarianza condivisa). A inferenza si misura la **distanza di Mahalanobis** dell'embedding in arrivo da quella distribuzione.

Un cane cade dentro. Un'automobile cade fuori **anche se** il softmax urla "chihuahua", perché la distanza osserva una proprietà diversa dalla classificazione.

Costo: nessun modello aggiuntivo, nessun training aggiuntivo, nessun dataset aggiuntivo. Poche centinaia di kB di statistiche e un prodotto matrice-vettore a inferenza.

### Taratura e criterio di escalation

Soglia scelta sui negativi Oxford-IIIT Pet, con questo criterio: **mantenere sotto il 2% i cani veri rifiutati**, e riportare la percentuale di gatti che passano.

> **Regola di escalation, decisa ora:** se più del **10%** dei gatti passa per cane, si costruisce un **classificatore binario dedicato** (MobileNetV3-Small, ~2 MB int8, ~10 ms) come secondo modello.
>
> Non è un ripiego: è la sequenza corretta. *"Ho implementato la soluzione leggera, ho misurato, non bastava, ho costruito quella dedicata"* vale più di entrambe le soluzioni prese da sole, perché mostra il ragionamento invece del solo risultato.

### Comportamento verso l'utente

Nessun rifiuto binario secco — esistono casi genuinamente ambigui (lupi, volpi, disegni). Tre stati:

| verdict | Messaggio |
|---|---|
| `dog` | top-5 normali |
| `uncertain` | "Non sono sicuro che ci sia un cane, ma se c'è potrebbe essere…" + predizioni |
| `not_dog` | "Questa non sembra la foto di un cane" + invito a riprovare |

---

## 8. Contratto dell'API

```
GET  /health     → stato del servizio e versione del modello caricato
POST /predict    → immagine multipart → predizioni
GET  /metadata   → 120 razze, versione, metriche, input size
```

`/metadata` esiste perché **il frontend non deve contenere la lista delle razze**: duplicarla creerebbe due verità destinate a divergere.

### Risposta di `/predict`

```json
{
  "verdict": "dog",
  "predictions": [
    { "breed": "golden_retriever", "label": "Golden Retriever", "probability": 0.87 },
    { "breed": "labrador_retriever", "label": "Labrador Retriever", "probability": 0.06 }
  ],
  "ood_score": 0.12,
  "model_version": "convnext_tiny-v1.2",
  "inference_ms": 143
}
```

`verdict` è **separato** dalle probabilità: il frontend non deve conoscere nessuna soglia. La logica sta in un solo posto, il server, dove è stata misurata.

### Errori

| Codice | Caso |
|---|---|
| 400 | immagine illeggibile o formato non supportato |
| 413 | file troppo grande |
| 422 | campo mancante o malformato |
| 429 | rate limit superato |
| 503 | modello non caricato |

### Flusso di una richiesta

```
Browser                              Server
  │
  │ 1. utente trascina la foto
  │ 2. valida tipo e peso, ridimensiona a max 1024px   ← lato client
  │ 3. POST multipart ───────────────►
  │                              4. guardia dimensione + decompression bomb
  │                              5. decodifica + correzione orientamento EXIF
  │                              6. resize / crop / normalize secondo model.json
  │                              7. ONNX Runtime → logits + embedding
  │                              8. softmax → top-5;  distanza → verdict
  │ ◄───────────────────────────  9. JSON
```

### Tre dettagli che sono bug veri, non rifiniture

**Ridimensionare lato client (passo 2).** Le foto da telefono pesano 4–8 MB; il modello lavora a 224px. Caricare l'originale è banda sprecata che l'utente attribuisce alla lentezza del modello.

**Correzione EXIF (passo 5).** Le foto verticali da telefono sono spesso salvate orizzontali con un tag EXIF di rotazione. Il browser lo rispetta, Pillow lo ignora: il modello riceve un cane coricato. Una riga (`ImageOps.exif_transpose`), ma senza di essa il modello sembra scemo esattamente sulle foto che caricheranno i visitatori.

**Caricare il modello all'avvio, non per richiesta.** La sessione ONNX si apre nel `lifespan` di FastAPI e resta in memoria. All'avvio si esegue anche un'**inferenza fittizia**: la prima chiamata a ONNX Runtime alloca buffer ed è più lenta, e quel costo deve pagarlo l'avvio, non il primo visitatore.

---

## 9. Deploy e operatività

| Componente | Dove | Costo |
|---|---|---|
| Frontend | Cloudflare Pages | gratis |
| API | VPS Hetzner CX22 (2 vCPU, 4 GB) | ~4,5 €/mese |
| Reverse proxy + HTTPS | Caddy sul VPS (certificati automatici) | — |
| Immagini container | GitHub Container Registry | gratis |
| Modello + model card | HuggingFace Hub | gratis |

Il modello **non entra in git** (30–100 MB). Vive su HF Hub e viene scaricato **in fase di build** del Dockerfile, così è già dentro l'immagine e non costa nulla all'avvio. In più la model card pubblica su HF è vetrina aggiuntiva, linkabile dal CV.

### Hardening — obbligatorio, non opzionale

L'endpoint è pubblico e decodifica immagini arbitrarie:

- rate limiting per IP
- limite rigido di dimensione del file
- guardia contro le **decompression bomb** (`Image.MAX_IMAGE_PIXELS`)
- CORS ristretto all'origine del frontend
- firewall, SSH solo a chiave, aggiornamenti automatici di sicurezza

### Osservabilità minima

- log strutturati delle predizioni: timestamp, latenza, verdict, top-1, **nessuna immagine salvata**
- endpoint `/metrics` con contatori e istogrammi di latenza
- restart automatico dei container e un check di uptime esterno

Il rischio concreto da mitigare non è tecnico ma temporale: **tra sei mesi il VPS potrebbe essere spento o pieno di log**, e un link morto nel CV fa più danno di una demo lenta.

---

## 10. Test e CI

### La distinzione fondamentale

| | **Test** | **Valutazione** |
|---|---|---|
| Domanda | Il codice fa quello che dice? | Il modello è buono? |
| Esito | verde / rosso | un numero |
| Durata | secondi | minuti |
| Dove | in CI, a ogni commit | a mano, quando si allena |
| Se fallisce | c'è un bug | il modello è mediocre |

Un modello all'82% non è un test rosso. Un export ONNX che diverge da PyTorch **è un bug**, e deve essere rosso.

### Test da scrivere

**Dati**
- gli split non si sovrappongono (`train ∩ test = ∅`) — protezione contro il data leakage
- il preprocessing produce forma e range dichiarati in `model.json`

**Export — i più importanti**
- **parity PyTorch ↔ ONNX**: stesse logits entro tolleranza
- **parity ONNX fp32 ↔ int8**: perdita da quantizzazione entro soglia dichiarata

Un export sbagliato non lancia eccezioni: il modello continua a rispondere, solo peggio. Senza questi test lo si scopre in produzione sospettando il modello, quando la colpa è dell'export.

**API**
- percorso felice: 200 con struttura corretta
- percorsi cattivi: non-immagine, PNG corrotto, file da 50 MB, campo mancante, decompression bomb — ognuno con l'errore giusto e senza far cadere il processo

**Gate OOD**
- embedding vicino → `dog`; embedding lontano → `not_dog`

**Regressione del modello**
- set "golden" di ~200 immagini con predizioni attese, eseguibile in CI in meno di un minuto: rete di sicurezza sul modello senza valutare 8.580 immagini a ogni commit

### Pipeline CI

```
push (qualsiasi branch):  ruff → pytest → build immagine Docker
merge su main:            ↑ + push su GHCR → deploy via SSH (docker compose pull && up -d)
frontend:                 Cloudflare Pages si aggancia automaticamente al repo
```

Nessun orchestratore. Per un servizio su una macchina, `docker compose` è la scelta corretta.

---

## 11. Definizione di "finito"

Il rischio principale di un progetto di portfolio non è farlo male: **è non finirlo mai**. Criteri binari:

- [ ] URL pubblico che si apre e funziona, **anche da telefono**
- [ ] README con i **due** numeri di accuratezza e la tabella modelli accuratezza/latenza
- [ ] Model card pubblicata su HuggingFace Hub
- [ ] CI verde su main
- [ ] Parity test ONNX presente e passante
- [ ] Percentuale di gatti che passano il gate misurata e scritta nel README
- [ ] **Una persona diversa dall'autore l'ha usata senza ricevere spiegazioni**

---

## 12. Fuori scope — lista chiusa

Ogni idea che compare durante il lavoro va in `IDEAS.md`, non nel progetto:

autenticazione · database · riaddestramento automatico · più modelli selezionabili a runtime · traduzioni · app mobile · caching delle predizioni · A/B test · segmentazione · **Grad-CAM**

*Grad-CAM (heatmap di dove guarda il modello) è la tentazione più forte perché è visivamente bellissima. È un'ottima v2, non è la v1.*

---

## 13. Milestone

| # | Milestone | Esito verificabile |
|---|---|---|
| M0 | **Catena completa ma stupida online** | Browser → API → VPS → risposta, con modello non addestrato |
| M1 | Dataset e baseline | Stanford Dogs caricato, split verificati, linear probe allenato |
| M2 | Esperimenti | Tre modelli allenati, tabella accuratezza/latenza, candidato scelto |
| M3 | Export | ONNX + int8, parity test verdi, statistiche OOD calcolate |
| M4 | API completa | `/predict` reale con gate OOD, test sugli input cattivi |
| M5 | Ops | Caddy + HTTPS, rate limiting, log, deploy da CI |
| M6 | Frontend | Drag-and-drop, risultati, tre stati del verdict, mobile |
| M7 | Documentazione | README con i due numeri, model card, error analysis |

**M0 è deliberatamente prima del dataset.** Tutti i problemi di infrastruttura vanno incontrati quando non c'è ancora niente da perdere, non alla fine con il modello buono in mano.

**Stima realistica:** 5–7 settimane lavorando la sera e nei weekend. Chi dice "un weekend" sta parlando del notebook, non di questo.

---

## 14. Rischi

| Rischio | Mitigazione |
|---|---|
| Il VPS diventa un buco di tempo ops invece che ML | Se dopo M5 il tempo speso su infrastruttura supera quello su modello, si torna su HF Spaces gratuito senza drammi |
| Scope creep (Grad-CAM, altri modelli, altre feature) | Lista chiusa alla §12 e `IDEAS.md` |
| Il progetto non viene finito | Milestone piccole, M0 online da subito, definizione di finito binaria |
| La demo muore silenziosamente tra sei mesi | Restart automatico + check di uptime esterno |
| Il candidato accurato sfora il budget di latenza | Criterio di selezione già deciso: vince il veloce, e il README lo spiega |
