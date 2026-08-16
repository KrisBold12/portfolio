# Fused Triton kernels — Documento di design

**Data:** 2026-08-16
**Stato:** approvato in sede di brainstorming, da rileggere prima del piano operativo
**Progetto:** secondo progetto del portfolio, slug `triton-kernel`

---

## 1. Obiettivo

Scrivere due kernel Triton fusi per la coda memory-bound di un transformer, e
misurare **dove** quel lavoro paga e dove no.

La card già pubblicata in `web/src/data/projects.ts` fissa la tesi: un kernel è
facile da far sembrare veloce da solo, perché un microbenchmark misura
l'operazione e non il modello attorno. Il progetto consegna quella frase con i
numeri sotto.

Il risultato non è uno speedup. È **una curva di pareggio**: la stessa coppia di
kernel misurata al variare del regime di esecuzione, con il punto in cui il
guadagno passa da irrilevante a decisivo. La domanda a cui la pagina risponde è
*«conviene scrivere questo kernel a mano?»*, e la risposta è *«dipende da un
rapporto fra due numeri, ed eccolo misurato»*.

### Non obiettivi

- **Non è una libreria.** Nessuna API stabile, nessun supporto multi-modello,
  multi-architettura o multi-GPU. I numeri valgono per una RTX 3070 Laptop e il
  README lo dice.
- **Non è ricerca sui kernel.** Le due fusioni sono note e implementate altrove
  (Liger-Kernel, Inductor). Il contributo è la misura, non l'invenzione.
- **Non è un servizio.** Il VPS di produzione non ha GPU e non ne avrà. Nessun
  deploy, nessuna demo live.
- **Non è training.** Solo forward. Nessun backward, anche nel regime prefill.

---

## 2. Vincoli

| Vincolo | Valore | Conseguenza |
|---|---|---|
| GPU | RTX 3070 Laptop, 8 GB VRAM | Modello da ~1B in fp16 sta comodo; niente oltre |
| Banda di memoria | 384–448 GB/s a targa secondo la SKU | Il valore che conta è quello **misurato**, non quello di targa |
| Termica | portatile, scala i clock sotto carico | È la fonte d'errore numero uno; §5.5 la affronta |
| Sistema | Windows 11 con WSL2 Ubuntu già installato | Si lavora in WSL2, §4.2 |
| Repo | su OneDrive | Venv e pesi del modello **fuori** dal repo, §4.2 |
| Deploy | VPS 4 vCPU senza GPU | Il deliverable è la pagina e i numeri, non un servizio |

---

## 3. La tesi, e l'aritmetica che la governa

Questa sezione è il cuore del progetto. È stata calcolata **prima** di scrivere
codice, e il progetto esiste per verificarla o smentirla con misure.

### 3.1 A batch 1 la coda non esiste

TinyLlama-1.1B, per singolo strato, byte mossi per token generato:

| | byte |
|---|---|
| pesi letti (q, k, v, o, gate, up, down) | 44,040,192 parametri → **88,1 MB** |
| tutte le attivazioni elementwise messe insieme¹ | 41,984 elementi → **84,0 KB** |

¹ le due RMSNorm, i due residual, il RoPE su q e k, e `silu(gate) * up`.

Rapporto **1073 : 1**. La coda fondibile è lo **0,09% dei byte mossi**. Anche
azzerandone completamente il traffico si risparmia meno di un millesimo della
banda.

A batch 1 quasi tutta la banda serve a leggere i pesi, e i pesi si leggono
comunque.

### 3.2 Allora perché la coda occupa tempo misurabile

Perché sono molti lanci piccoli: circa venti kernel per strato, ~450 per token,
ognuno con qualche microsecondo di costo fisso lato CPU e quasi nessun lavoro
vero. Non è banda: è costo di lancio.

E i CUDA graph azzerano il costo di lancio. È ciò che
`torch.compile(mode="reduce-overhead")` attiva con una stringa.

**Previsione registrata prima delle misure:** microbenchmark del SwiGLU fuso
3–5× più veloce; end-to-end a batch 1 fra +8% e +12% **senza** CUDA graph, e
attorno a **+0% con** i CUDA graph attivi. Se la previsione regge, il progetto
la riporta come risultato principale a batch 1.

### 3.3 Il conto cambia con il regime

Le attivazioni crescono con il numero di token elaborati insieme. I pesi no.

| regime | attivazioni per strato | pesi per strato | quota della coda |
|---|---|---|---|
| decode, batch 1 | 84 KB | 88,1 MB | **0,09%** |
| decode, batch 64 | 5,4 MB | 88,1 MB | **~6%** |
| prefill, 2048 token | 172 MB | 88,1 MB | **~66%** |

Lo stesso identico kernel è irrilevante nel primo regime e dominante nel terzo.
È il motivo per cui le librerie di kernel fusi scritti a mano (Liger-Kernel)
esistono per il training e non per la generazione a batch 1.

**Questa tabella è la struttura del progetto.** Le misure la sostituiscono con
numeri veri, e la curva che ne esce è il deliverable.

---

## 4. Struttura

### 4.1 Albero

Ricalcato su `projects/dog-breed` perché il repo resti uniforme.

```
projects/triton-kernel/
  pyproject.toml               uv, Python 3.12 pinnato
  src/triton_kernel/
    model.py                   carica TinyLlama, isola i blocchi da attaccare
    kernels/rmsnorm.py         kernel 1
    kernels/swiglu.py          kernel 2 (varianti 2a e 2b)
    bench/device.py            banda e picco fp16 misurati
    bench/profile.py           ripartizione del tempo per operatore
    bench/micro.py             microbenchmark per operazione
    bench/e2e.py               generazione completa, ms/token
    check/correctness.py       i quattro livelli della §7
  reports/                     i CSV, unica fonte dei numeri pubblicati
  README.md                    la documentazione vera
```

Disciplina ereditata dall'altro progetto: **ogni numero pubblicato risale a una
riga di un CSV in `reports/`**, e il README lo dice esplicitamente.

### 4.2 Ambiente: WSL2, non Windows nativo

Triton a monte è un progetto Linux; su Windows esiste solo un fork della
comunità che insegue le versioni. Ma la ragione decisiva è un'altra:
`torch.compile` su Windows è storicamente fragile, e qui `torch.compile` non è
un accessorio — è metà dell'esperimento. Se il baseline non gira, non c'è
progetto.

WSL2 vede la 3070 in passthrough CUDA. Due accortezze, entrambe dovute a
OneDrive:

- **Venv fuori dal repo**, in `~/.venvs/triton-kernel` lato WSL, via
  `UV_PROJECT_ENVIRONMENT`. Migliaia di file piccoli su `/mnt/c` visti da WSL
  sono lentissimi, e OneDrive tenterebbe di sincronizzarli.
- **Pesi fuori dal repo.** `HF_HOME` dentro WSL. I 2,2 GB di TinyLlama non
  toccano né git né OneDrive.

Il `.gitignore` va esteso ancorando le regole a `projects/triton-kernel/`, come
già si fa per l'altro progetto.

### 4.3 Modello: TinyLlama-1.1B-Chat-v1.0

Scelto perché ha l'architettura giusta (RMSNorm + SwiGLU + RoPE), si scarica
senza accettare licenze — cosa che conta se un giorno il lavoro va reso
riproducibile — sta in 2,2 GB fp16, ed è il modello-cavia standard nei lavori
sui kernel, quindi i numeri sono confrontabili con quelli di altri.

Geometria che ricorre in tutti i calcoli: dimensione interna 2048, MLP 5632,
22 strati, 32 teste di attenzione con 4 teste KV.

---

## 5. Metodo di misura

I kernel sono due file. Il metodo è il progetto.

### 5.1 Il tetto si dichiara prima di cominciare

Primo passo, prima di scrivere Triton: profilare TinyLlama in decode e in
prefill e ripartire il tempo per operazione. Da lì esce il numero che governa
tutto il resto — **quanta percentuale del tempo sta nella coda elementwise**.

Se è il 15%, il guadagno end-to-end non potrà superare il 15% qualunque kernel
scriviamo, e ogni risultato successivo va letto contro quel tetto. Dichiararlo
in anticipo è ciò che distingue il progetto da un tutorial: il tutorial misura e
poi si stupisce.

### 5.2 Quattro configurazioni, sempre tutte e quattro

1. PyTorch eager
2. `torch.compile` default
3. `torch.compile(mode="max-autotune")`
4. i nostri kernel

La terza non è una formalità: con `max-autotune` Inductor può sostituire cuBLAS
con template Triton e quindi fondere l'epilogo delle matmul — cioè gli si
concede esattamente l'arma che contesta l'argomento centrale del progetto
(§6.2). Se vinciamo comunque, il numero vale; se non vinciamo, l'abbiamo
scoperto invece di nasconderlo.

Prima di scrivere qualsiasi kernel si legge il Triton che Inductor genera
(`TORCH_LOGS=output_code`) e si **verifica** che `gate` e `up` finiscano davvero
in VRAM. L'argomento della §6.2 poggia su quel fatto, e va confermato al primo
giorno e non all'ultimo.

### 5.3 Prefill e decode misurati separatamente

Il prefill elabora tutto il prompt in una volta: è compute-bound, i kernel lì
hanno un ruolo diverso, e mescolarlo al decode sporca il numero in modo
irreparabile. Righe distinte, sempre.

### 5.4 Stessa politica di lancio sui due lati

I CUDA graph eliminano il costo di lanciare i kernel, e a batch 1 quel costo può
valere più della fusione stessa (§3.2). Si misurano **entrambi i regimi** —
senza CUDA graph per isolare l'effetto della fusione, con CUDA graph perché è il
numero realistico — riportati come due righe distinte, mai mescolati.

Confrontare kernel fusi senza CUDA graph contro `torch.compile` con CUDA graph,
o viceversa, produce un numero che misura la politica di lancio e lo chiama
fusione. È l'errore più facile da commettere in questo progetto.

I due lati ottengono i CUDA graph per vie diverse, e questo è lavoro vero, non
un parametro: `torch.compile` li attiva con `mode="reduce-overhead"`, mentre
eager e i nostri kernel richiedono una cattura manuale con
`torch.cuda.CUDAGraph`. La cattura pretende forme e indirizzi stabili fra un
passo e l'altro, quindi impone una **cache KV statica** preallocata alla
lunghezza massima. Va messo in conto nella tappa 5: senza cache statica il
braccio «con CUDA graph» semplicemente non esiste per due configurazioni su
quattro, e il confronto torna sbilanciato.

La matrice completa è quindi 4 configurazioni × 2 politiche di lancio × N
regimi. Le celle sono cicli di macchina, non lavoro manuale, ma lo script di
misura va scritto per attraversarla tutta e scrivere una riga per cella.

### 5.5 Il picco è quello misurato

Prima di dire «siamo all'80% della banda» si misura la banda vera con un
benchmark di copia. Tipicamente esce il 75–85% del valore di targa. Tutte le
percentuali di picco si calcolano su quello, e `device_peaks.csv` è il primo
CSV prodotto.

### 5.6 Il calore

Su un portatile misurare quattro configurazioni in quattro blocchi consecutivi
significa misurare la temperatura, non il codice. Contromisure, tutte da
documentare nel README:

- clock bloccati con `nvidia-smi -lgc` dove il driver lo consente
- warmup lungo prima di ogni serie
- configurazioni **alternate** A/B/A/B, mai in blocchi
- mediana, non media
- **dispersione riportata accanto a ogni valore**

Un delta del 3% senza dispersione dichiarata non è un risultato.

### 5.7 Il roofline

Il grafico che rende visibile l'unica idea del progetto: intensità aritmetica
(flop per byte) sull'asse x, throughput raggiunto sull'asse y, le due rette del
tetto — banda e calcolo — e ogni operazione del profilo come un punto.

Si vede a colpo d'occhio che l'intero decode è ammassato a sinistra sotto la
retta della banda, e dove si spostano i punti al cambiare del regime.

---

## 6. I kernel

### 6.1 Kernel 1 — RMSNorm + residual

Un blocco Llama ha questa forma:

```
h   = x + attn(rmsnorm(x))
out = h + mlp(rmsnorm(h))
```

Il motivo fondibile è `somma residual → rmsnorm`. Un kernel che legge `x` e
l'uscita del sotto-blocco e scrive **due** tensori: `h`, che serve al residual
successivo, e `h` normalizzato, che entra nel blocco dopo. In eager sono tre o
quattro kernel con altrettanti viaggi in VRAM.

Dettaglio che vale la pena fare bene: RMSNorm in PyTorch legge la riga due
volte, una per la somma dei quadrati e una per dividere. Se la riga sta nella
memoria on-chip diventa una lettura sola. Con dimensione interna 2048 in fp16
sono 4 KB per riga, quindi ci sta larga: un blocco per riga, riduzione nei
registri, nessuna rilettura.

Difficoltà bassa. È il kernel su cui si impara Triton.

### 6.2 Kernel 2 — SwiGLU, in due varianti

La differenza fra le due varianti **è** l'argomento del progetto.

**2a — solo l'elementwise.** Fonde `silu(gate) * up` lasciando i matvec a
cuBLAS. È ciò che Inductor fa già. Non serve a vincere: serve da **controllo**.
Se pareggia con quello di Inductor, sappiamo che scriviamo Triton decente e che
i confronti successivi misurano l'idea e non l'inesperienza.

**2b — l'epilogo dentro il matvec.** `gate` e `up` non vengono mai scritti in
VRAM: il kernel calcola le due proiezioni e applica `silu` e il prodotto
nell'epilogo, nei registri.

Questo è il kernel di punta, e la ragione per cui può battere `torch.compile`
è strutturale, non accidentale. Inductor classifica le operazioni in due
categorie e fonde solo dentro la prima: *pointwise/reduction* → memory-bound →
fondi; *matmul* → compute-bound → non toccare, chiama cuBLAS. **Quella regola è
ottima al training e falsa a batch 1**, dove una matmul contro un vettore è
memory-bound quanto una somma. Inductor la spedisce comunque a cuBLAS come
scatola nera, e una scatola nera non ha epilogo in cui fondere.

Va detto con onestà: nel regime prefill — quello in cui la coda pesa davvero —
2b smette di essere un matvec e diventa un problema di tiling su due dimensioni,
cioè compete con cuBLAS sul suo terreno. Si misura, non si promette.

### 6.3 Autotuning

Parametri di blocco scelti con `triton.autotune` misurando sulla 3070, e la
griglia esplorata salvata in `reports/`. Va documentato che è stato usato:
altrimenti il confronto con `max-autotune` è sbilanciato dalla parte opposta.

---

## 7. Correttezza

Quattro livelli, dal più debole al più forte. Servono tutti perché i primi due
passano anche con kernel sottilmente rotti.

1. **Confronto col riferimento PyTorch.** Tolleranze dichiarate esplicitamente e
   giustificate, non quelle di default di `allclose`.
2. **Forme storte.** Dimensioni non multiple del blocco, ultimo blocco parziale,
   batch dispari. È lì che i kernel Triton si rompono, ed è l'unico posto in cui
   si rompono in silenzio.
3. **Uguaglianza dei token.** Stesso prompt, decode greedy, con e senza i
   kernel: la sequenza generata dev'essere identica. Test binario.
4. **Perplexity su un estratto di WikiText**, con e senza. Deve coincidere alle
   prime tre o quattro cifre. È l'unico livello che cattura la deriva lenta —
   quella che non cambia il token scelto sui prompt di prova ma degrada il
   modello altrove.

---

## 8. Output

### 8.1 I CSV

| file | contenuto |
|---|---|
| `device_peaks.csv` | banda e picco fp16 **misurati**: i denominatori di ogni «% del picco» |
| `profile_decode.csv`, `profile_prefill.csv` | ripartizione del tempo per operatore = il tetto dichiarato |
| `micro_<kernel>.csv` | microbenchmark: kernel × configurazione × forma |
| `e2e_regimes.csv` | la curva: regime × configurazione × ms/token, mediana e dispersione |
| `correctness.csv` | i quattro livelli, esito e scarti numerici |

Ogni CSV porta in testata revisione git, versioni di driver / torch / triton, e
**se i clock erano bloccati**. Senza quelli non sono numeri riproducibili, sono
aneddoti.

### 8.2 Il sito

La card esiste già in `web/src/data/projects.ts` come `planned: true`. A
progetto concluso passa a voce reale con `href` e tre figure numeriche, e la
rotta va aggiunta in `web/src/routes.ts` — altrimenti il titolo prerenderizzato
diverge da quello a runtime, che è il guasto descritto nel `CLAUDE.md`.

Il contenuto della pagina si decide quando i numeri esistono. Due decisioni però
sono già visibili e vanno prese da qualcuno invece di lasciarle accadere:

- **Il testo della card va riscritto, non ritoccato.** Dice «fuses it into *one*
  custom Triton kernel» (sono due) e promette un confronto fra microbenchmark ed
  end-to-end che ora sappiamo essere una curva sui regimi.
- **I colori semantici non si trasferiscono.** Nel design system
  `--signal` / `--probe` / `--reject` stanno per Stanford / Oxford / rifiutato:
  sono i due dataset del progetto 1. Qui dataset non ce ne sono, e la variabile
  sotto discussione è la configurazione. Ipotesi da confermare con la pagina:
  `--signal` = i nostri kernel, `--probe` = `torch.compile`, eager senza colore
  perché non è la variabile.

---

## 9. Sequenza di lavoro

Sei tappe, ognuna con un esito verificabile. Il punto della sequenza è che **il
valore si accumula presto**: dopo la tappa 2 esiste già contenuto pubblicabile,
anche se i kernel andassero male.

1. **Ambiente.** WSL2 + Triton + torch che vede la 3070. Banda e picco misurati
   → `device_peaks.csv`.
2. **Profilo.** TinyLlama in decode e in prefill, e lettura del codice generato
   da Inductor → il tetto dichiarato e la verifica dell'assunto della §6.2.
3. **Kernel 1** e i quattro livelli di correttezza.
4. **Kernel 2a** (controllo) e **2b** (quello vero), stessa verifica.
5. **Campagna di misura sui regimi** → la curva di pareggio.
6. **README e CSV finali**, poi la pagina.

---

## 10. Rischi

| Rischio | Probabilità | Che si fa |
|---|---|---|
| I kernel non battono `torch.compile` a batch 1 | **alta, è la previsione della §3.2** | È il risultato, non il fallimento. La curva della §3.3 esiste proprio perché a batch 1 non c'è niente da prendere. |
| 2b perde contro cuBLAS anche in prefill | media | Si riporta, con il roofline che mostra quanto distano entrambi dal tetto. 2a resta come controllo valido. |
| Le misure sono rumorose oltre il segnale | media, è un portatile | §5.6. Se la dispersione resta più grande del delta, il risultato è «indistinguibile», e va scritto così. |
| Triton in WSL2 non collabora con la 3070 | bassa | Tappa 1 esiste per scoprirlo il primo giorno. Ripiego: fork `triton-windows`, accettando che `torch.compile` diventi fragile. |
| L'aritmetica della §3.1 è sbagliata | bassa | La tappa 2 la verifica prima che venga scritta una riga di kernel. |

---

## 11. Fuori scopo

Uno scopo senza confini si allarga da solo.

- **Niente quantizzazione**, niente `dequant + matvec`. È l'unica strada in cui
  a batch 1 si vince davvero, ed è per questo che è un altro progetto.
- **Niente attention, niente flash-decoding.**
- **Niente Liger-Kernel** come terzo baseline: eager + `torch.compile` (default
  e `max-autotune`).
- **Solo forward.** Nessun backward, anche nel regime prefill.
- **Nessuna demo live, nessun notebook riproducibile.** Eventualmente si
  aggiungono dopo; non sono nel perimetro.
- **Una GPU, un'architettura.** I numeri valgono per una RTX 3070 Laptop e il
  README lo dice in prima riga.
