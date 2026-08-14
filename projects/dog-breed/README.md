# Dog breed classifier

Classifies a photo into one of the 120 breeds of Stanford Dogs, with a deployment
budget fixed in advance: p95 under 300 ms on CPU, container under 500 MB.

The interesting part is not the accuracy. Stanford Dogs is built from ImageNet
images, and all 120 breeds are ImageNet classes, so any ImageNet-pretrained
backbone has already seen the test set during pretraining. The benchmark number
is inflated and nobody reports by how much.

This project measures it. On the 21 breeds that Stanford Dogs and Oxford-IIIT Pet
have in common, the same model scores **94.11%** on Stanford photos and **87.87%**
on Oxford photos. Six points of the headline number come from the source of the
images, not from the model.

## Results

Selected model: `convnext_tiny.in12k_ft_in1k`, backbone frozen, linear head.

| Evaluation | Images | Accuracy |
|---|---:|---:|
| Stanford test, 120 breeds | 8580 | 89.99% |
| Stanford test, 21 shared breeds | 1630 | 94.11% |
| Oxford-IIIT Pet, same 21 breeds | 4178 | **87.87%** |

The three-way split matters. Comparing 89.99% directly against 87.87% would blend
two effects, because the 21 shared breeds are easier than the average of 120. The
middle row holds the breed set fixed so the remaining gap is attributable to the
photos alone.

That gap appears in every configuration tried, between 4.7 and 7.3 points across
three architectures and two training regimes. It is a property of the benchmark,
not of a particular model.

## Model selection

Five configurations, same data, same seed, same preprocessing.

| Experiment | Architecture | Regime | Stanford 120 | Oxford 21 | Model p95 |
|---|---|---|---:|---:|---:|
| convnext_t_probe | convnext_tiny | frozen | **89.99%** | 87.87% | 126.6 ms |
| baseline | resnet50 | frozen | 86.86% | 81.38% | 61.4 ms |
| effnet_b0 | efficientnet_b0 | fine-tuned | 80.85% | 79.44% | 13.7 ms |
| convnext_t | convnext_tiny | fine-tuned | 77.65% | 72.67% | 117.0 ms |
| effnet_b0_probe | efficientnet_b0 | frozen | 76.31% | 74.25% | 13.2 ms |

Freezing the backbone helps convnext by 12.3 points and hurts efficientnet by 4.5.
The training regime is not what decides the outcome: the quality of the pretrained
features is. `convnext_tiny.in12k_ft_in1k` is pretrained on ImageNet-12k and its
representations are good enough that a linear separator reaches 90%; fine-tuning on
85 images per breed damages them. EfficientNet-B0's ImageNet-1k features are weaker,
so adapting them pays off.

The chosen model costs ten times more inference time than the fastest candidate for
13.7 points of accuracy. On 8580 test images the standard error is about 0.36 points,
so that gap is real, and so is the 3.1-point gap over the resnet50 baseline.

## Latency

Measured with onnxruntime, batch 1, two CPU threads, 200 runs after 20 warmup runs.
Batch 1 because users upload one photo; two threads to approximate a small VPS
rather than this development machine.

| Scenario | p50 | p95 | p99 |
|---|---:|---:|---:|
| Model only, 224x224 tensor | 104.7 ms | 126.6 ms | 130.3 ms |
| End to end, 3840x2160 JPEG | 237.0 ms | 264.0 ms | 280.5 ms |
| End to end, scaled JPEG decoding | 141.8 ms | **160.3 ms** | 170.4 ms |

The first end-to-end measurement was the useful one: decoding a 4K JPEG cost more
than the inference itself. `Image.draft()` lets libjpeg decode at 1/8 scale directly
in the DCT domain, which cuts preprocessing roughly in half without changing the
output resolution the model receives. What remains is Huffman decoding of the full
stream, which cannot be avoided server-side.

160 ms p95 on two desktop threads extrapolates to roughly 240-400 ms on a low-end
VPS, which straddles the 300 ms budget. This is an open risk, not a solved problem.
Two levers are available and unmeasured: downscaling client-side before upload, and
int8 quantisation of the ONNX graph.

## Data

Stanford Dogs, 20580 images across 120 breeds, using the official 12000/8580
train/test split. The training portion is re-split 85/15 into 10200 training and
1800 validation images, stratified so every breed contributes exactly 85 and 15.

The split is generated once and committed as a single CSV. Because each image
appears on exactly one row, the partition property alone proves the three splits
are disjoint, and the file is small enough that most invariants can be tested in
CI without downloading 750 MB of images.

Oxford-IIIT Pet supplies the second evaluation. Its 25 dog breeds map onto Stanford's
120 by name for 13 of them and by alias for 8 more (`japanese_chin` is Stanford's
`japanese_spaniel`, `basset_hound` is `basset`, and so on). Four are excluded:
three have no Stanford equivalent, and `american_pit_bull_terrier` is deliberately
not mapped to `american_staffordshire_terrier` because they are distinct breeds and
conflating them would inject label noise into the number the project exists to
measure. The alias table is hand-written domain knowledge, so it is covered by tests
that verify every entry still refers to a breed that exists.

Oxford's 2371 cat photos are kept aside as near-distribution negatives for the
out-of-distribution gate.

## Rejecting what isn't a dog

The classifier always returns 120 logits. Hand it a cat and it answers with a
breed and a confidence, because softmax has no way to say "not a dog".

The gate works one layer earlier, on the 768-dimensional features the classifier
reads from. The training dogs form a cloud there; the Mahalanobis distance to the
nearest breed centre measures how far an image falls outside it. Per-breed means
with one shared covariance, since 85 images per breed cannot support 120 separate
768x768 estimates but 10200 residuals can support one.

The negatives are Oxford's 2371 cats, not blank walls: fur, four legs, a muzzle,
the same pet-photo framing. Rejecting a photo of a car proves nothing.

| Threshold calibrated on | Val dogs | Oxford dogs | Oxford cats |
|---|---:|---:|---:|
| Stanford validation | 95.0% | 87.8% | 0.25% |
| **Oxford dogs** | 97.8% | **95.0%** | **1.18%** |

Both columns of dogs should be high and the cats column low. The first row is what
calibrating on the development distribution gets you: it looks correct on Stanford
and quietly rejects one real Oxford dog in eight. Since user uploads will resemble
Oxford far more than Stanford, the threshold is read off Oxford's dogs instead. That
buys 7 points of real-photo acceptance for 22 additional cats out of 2371.

At 1.18%, the gate is well inside the 10% ceiling the design set for escalating to a
dedicated binary dog detector, so that model was not needed.

## Making the percentage mean something

A softmax output is not a confidence. Networks are systematically overconfident,
so showing the raw number to a user is a claim the model cannot back.

Measured with expected calibration error: group predictions by stated confidence,
and in each bucket compare that confidence against the accuracy actually achieved.
A calibrated model says 80% and is right 80% of the time.

Temperature scaling corrects it by dividing the logits by one scalar before the
softmax. Fitted on validation by minimising negative log-likelihood, which is
smooth and convex in T, unlike the ECE itself: optimising a step function of the
binning invites solutions that game the bins rather than fix the model.

| | Uncalibrated | T = 1.21 |
|---|---:|---:|
| Validation, 1800 images | 2.86% | 1.63% |
| **Test, 8580 images** | **3.12%** | **0.98%** |

Three times better on data the temperature never saw. The bucket that matters is
0.93-1.00, which holds 5814 of the 8580 test images: stated confidence 0.985
against 0.985 accuracy, a gap of zero to three decimals.

Dividing by a positive constant cannot reorder the logits, so not a single
prediction changes and accuracy is untouched. Only the number shown moves.

The division is folded into the exported graph rather than left for the server
to apply, so the deployed model cannot be served uncalibrated by forgetting a
step. The metadata records the value alongside `"applied": "in_graph"`, which
is there to stop a reader from applying it a second time.

## Engineering notes

**Reproducibility.** Training is seeded, the split is a committed artifact, and
pretrained weights should be pinned by tag: `resnet50` alone resolves to whatever
timm's current default is, and there are 39 published checkpoints behind that name.

**Preprocessing comes from the model.** Resize ratio, interpolation and
normalisation are read from timm's `pretrained_cfg` rather than hardcoded. The three
architectures use different crop ratios (0.95, 0.875, 0.95); hardcoding 0.875, as
most tutorials do, would have silently mis-preprocessed two of them.

**The exported model is checked, not assumed.** `verify_onnx.py` compares logits and
predictions between PyTorch and onnxruntime over the full test set, both on CPU so
the runtime is the only variable. For the selected model: same accuracy to two
decimals, and zero disagreements across 8580 images. The raw logits do differ, on
the order of 1e-05, because the two runtimes accumulate the same sums in a different
order and fuse operators differently. What matters is that no prediction flips.

**Measurement bugs found along the way.** Accuracy was averaging per-batch means,
which weights the last incomplete batch as heavily as a full one. Weakening the
training augmentation from `scale=(0.08, 1.0)` to `(0.5, 1.0)` cost 2.2 points of
validation accuracy: with 85 images per breed the aggressive crop was doing real
regularisation work, and the low training accuracy that prompted the change was not
a symptom of anything, just the difference between augmented crops and clean ones.

**The model describes itself.** `export.py` writes a JSON next to the ONNX carrying
the preprocessing config and the 120 class names in label order. The serving project
is independent — no timm, no torch, no split CSV — so without it the container would
have to hardcode both, and would keep using the old crop ratio the day the model
changes. Tests rebuild the preprocessing from the JSON alone and assert the tensors
are identical to the ones the model was evaluated with.

**Tests.** 59 tests here, 28 of which need only the committed split CSV and run
without either dataset; the rest are marked `dataset`, `export` or `serving` and
skip when the images or artifacts are absent. The assertions that matter were
checked by mutation: shifting the class list by one position, or changing the crop
ratio to the value most tutorials hardcode, has to turn something red. Two tests
were rewritten after that check showed they passed anyway. The same pass over the
distance formula found one guard that no test covers — the clamp that stops a
rounding error from reaching a square root — and the test says so in as many
words, rather than implying coverage it does not have.

## Running it

```
uv sync
uv run python -m dog_breed.data.download
uv run python -m dog_breed.data.extract
uv run python -m dog_breed.data.splits

uv run python -m dog_breed.train      convnext_t_probe
uv run python -m dog_breed.evaluate   convnext_t_probe
uv run python -m dog_breed.calibrate  convnext_t_probe
uv run python -m dog_breed.export     convnext_t_probe
uv run python -m dog_breed.verify_onnx convnext_t_probe
uv run python -m dog_breed.benchmark  convnext_t_probe --image photo.jpg
uv run python -m dog_breed.ood        convnext_t_probe

uv run pytest
uv run pytest -m "not dataset"
```

Experiments are declared in `src/dog_breed/experiments.py` and every script takes
the experiment name, so results never overwrite each other.

On an 8 GB GPU, set `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` before
training convnext; without it the allocator fragments and fails mid-run.

## Serving

The model is deployed by [`serving/`](../../serving/README.md): a FastAPI service
around the exported graph, containerised, carrying neither torch nor timm. It
reimplements the evaluation transform and the Mahalanobis distance on PIL and
numpy, and both are held to the originals by parity tests that run from this
project.

Measured inside the container: 100 ms median per request, a Chihuahua photo at
99.60% with a distance of 32.4 against the 49.27 threshold, and an Abyssinian cat
rejected at 61.5 with its best guess reaching only 10.3%.

## Status

Done: data pipeline, five experiments, evaluation on both datasets, ONNX export
with self-describing metadata, parity verification, CPU latency benchmark, the
out-of-distribution gate, confidence calibration, the prediction API, and the
container image.

Next: deployment to a VPS, and the frontend.

Open: the 300 ms p95 budget has not been tested on VPS hardware. Client-side
downscaling before upload and int8 quantisation are the two levers, both
unmeasured.
