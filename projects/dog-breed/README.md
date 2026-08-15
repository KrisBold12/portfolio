# Dog breed classifier

Names one of 120 dog breeds from a photo, turns away anything that is not a dog,
and answers in 123 ms p95 on a 4-vCPU VPS. Live at
[kb-portfolio.dev](https://kb-portfolio.dev).

The model serving that traffic was never trained. It is the classifier that came
inside the pretrained backbone, with 880 of its 1000 output rows deleted.

Getting there took five training runs, three architectures, and one measurement
that should have come first.

## The result

Stanford Dogs is cut from ImageNet, and all 120 of its breeds are ImageNet-1k
classes. Any ImageNet-pretrained backbone therefore already carries a classifier
for exactly this task. Keep the 120 output rows that name dog breeds, throw away
the other 880, and you have a competitor that has seen none of the training data.

Every experiment in this repository loses to it.

| Experiment | Backbone | Trained | Backbone alone | |
|---|---|---:|---:|---:|
| convnext_t_probe | convnext_tiny | 89.99% | 93.11% | −3.12 |
| baseline | resnet50 | 86.86% | 95.05% | −8.19 |
| effnet_b0 | efficientnet_b0 | 80.85% | 93.04% | −12.19 |
| convnext_t | convnext_tiny | 77.65% | 93.11% | −15.46 |
| effnet_b0_probe | efficientnet_b0 | 76.31% | 93.04% | −16.73 |

Stanford test split, 8580 images. The right-hand column is the same backbone with
its original head, restricted to the 120 breeds. Nothing was tuned to produce it.

It holds on the second dataset too, where the photos are not ImageNet photos:

| Experiment | Trained | Backbone alone | |
|---|---:|---:|---:|
| convnext_t_probe | 87.87% | 88.54% | −0.67 |
| baseline | 81.38% | 88.73% | −7.35 |
| effnet_b0 | 79.44% | 86.74% | −7.30 |
| effnet_b0_probe | 74.25% | 86.74% | −12.49 |
| convnext_t | 72.67% | 88.54% | −15.87 |

Two of those training runs stopped early and were probably misconfigured, so their
fifteen-point gaps do not mean much on their own. The comparison that does mean
something is between the best of each column: 89.99% against 95.05%, and the
column that required no work is the one in front.

## What is deployed, and why it is not the highest number

resnet50 has the strongest untouched head of the three, at 95.05%. It is not what
runs in production.

That decision comes from the rest of the project. Stanford's photos are ImageNet
photos, so a score measured on them rewards a model for having memorised them, and
the whole point of the work below is that this inflates the number by roughly six
points. On Oxford-IIIT Pet, whose photos come from somewhere else, resnet50 and
convnext are separated by eight images out of 4178. Not a difference. resnet50 also
falls further between the two datasets, 7.71 points against 6.18, which is what
more memorisation looks like.

Choosing resnet50 would mean choosing on the contaminated number, which is the
mistake this project exists to document. The two are tied on the honest one, so
the tiebreak is cost, and convnext was already deployed with its gate calibrated
and its latency measured.

The production model is `convnext_tiny.in12k_ft_in1k` with rows 151 to 275 of its
ImageNet classifier, reordered into Stanford's label order.

| | Before | After |
|---|---:|---:|
| Stanford test, 120 breeds | 89.99% | **93.11%** |
| Stanford test, 21 shared breeds | 94.11% | 94.72% |
| Oxford-IIIT Pet, same 21 breeds | 87.87% | **88.54%** |

The backbone did not change, only the last matrix. Because the trained model kept
its backbone frozen and ConvNeXt normalises with LayerNorm, which carries no
running statistics, the features are bit-identical between the two. The gate below
was rebuilt from scratch for the new model and came out byte-for-byte the same
file, threshold included. That equality was a prediction before it was a result,
and it is a stronger check on "the backbone really was frozen" than any assertion
in the test suite.

## How much of the score is the benchmark

The three-way evaluation is what makes the rest of this readable.

| Evaluation | Images | Accuracy |
|---|---:|---:|
| Stanford test, 120 breeds | 8580 | 93.11% |
| Stanford test, 21 shared breeds | 1630 | 94.72% |
| Oxford-IIIT Pet, same 21 breeds | 4178 | **88.54%** |

Comparing the first row against the third would mix two things, since the 21
breeds Stanford and Oxford share are easier than the average of 120. Holding the
breed set fixed and changing only where the photographs came from leaves 6.18
points, and those belong to the source of the images.

Every configuration shows it, between 4.7 and 8.1 points across three
architectures, two training regimes and the untrained heads. It is a property of
the benchmark rather than of any model, which is the reason a single Stanford
Dogs accuracy is not worth quoting on its own.

## Rejecting what isn't a dog

A classifier with 120 outputs answers every photo with a breed. Softmax has no
way to say "none of these", so a cat gets a confident wrong answer.

The gate works one layer earlier, on the 768 features the classifier reads. The
training dogs form a cloud there, and the Mahalanobis distance to the nearest
breed centre measures how far outside it an image falls. Per-breed means share one
covariance matrix: 85 images per breed cannot support 120 separate 768×768
estimates, while 10200 residuals support one.

The negatives are Oxford's 2371 cats rather than blank walls. Fur, four legs, a
muzzle, the same pet-photo framing. Rejecting a photograph of a car would prove
nothing.

| Threshold calibrated on | Val dogs | Oxford dogs | Oxford cats |
|---|---:|---:|---:|
| Stanford validation | 95.0% | 87.8% | 0.25% |
| Oxford dogs, 95% TPR | 97.8% | 95.0% | 1.18% |
| **Oxford dogs, 98% TPR** | 99.0% | **98.0%** | **4.47%** |

Both dog columns should be high and the cat column low. The first row shows what
calibrating on the development distribution buys: it looks fine on Stanford and
quietly turns away one real Oxford dog in eight. User uploads resemble Oxford far
more than Stanford, so the threshold is read off Oxford's dogs.

4.47% sits inside the 10% ceiling the design fixed for escalating to a dedicated
binary dog detector, so that model was never built. In hindsight 10% was a loose
bar and never had a chance to bind. It is quoted as written because a criterion is
only worth anything if it was fixed before the measurement.

## Step back from the dog and the gate stops working

The first version shipped at a 95% true positive rate. Using the deployed demo
turned up something neither dataset could: photographs taken from a few metres
away were being refused.

Stanford ships a bounding box with every image, so the test split already held the
explanation. Binning all 8580 photos by how much of the frame the dog occupies:

| Dog fills | Images | Accepted by the gate | Median distance |
|---|---:|---:|---:|
| under 10% | 233 | **77.3%** | 39.7 |
| 10 to 20% | 622 | 91.6% | 31.4 |
| 20 to 35% | 1331 | 96.1% | 27.6 |
| 35 to 50% | 1560 | 98.3% | 25.0 |
| 50 to 70% | 2176 | 99.0% | 23.4 |
| over 70% | 2658 | 99.7% | 22.7 |

Acceptance falls 22 points across that range and nearly a quarter of the most
distant dogs are refused.

This table used to carry a third column, the classifier's accuracy per bin. It
was measured on the trained probe and has not been re-run against the deployed
head, so it is not quoted. The two columns above are unaffected: both come from
the penultimate features, which the head swap left identical.

Nothing was malfunctioning. Both calibration sets are pet portraits, so a dog
filling a twentieth of the frame really is far from the training distribution, and
the median distance climbing from 22.7 to 39.7 is the gate reporting that
correctly. It answered the question it was asked. The question was wrong.

Sweeping the threshold shows where the cost turns:

| TPR | Threshold | Oxford dogs | Cats | Dogs under 10% of frame |
|---:|---:|---:|---:|---:|
| 95.0 | 49.27 | 95.0% | 1.18% | 77.3% |
| 97.0 | 53.18 | 97.0% | 1.98% | 84.1% |
| 97.5 | 54.26 | 97.5% | 2.36% | 85.8% |
| **98.0** | **56.36** | **98.0%** | **4.47%** | **87.6%** |
| 98.5 | 58.24 | 98.5% | 8.10% | 88.8% |
| 99.0 | 60.85 | 99.0% | 17.80% | 92.3% |
| 99.5 | 65.72 | 99.5% | 39.48% | 94.8% |

The cliff is at 99, where the gate admits a fifth of all cats and stops being a
gate. Anything at or below 98.5 is on the safe side, so choosing among those is a
product judgement and not something the data settles. On a public demo, a visitor
whose own dog is refused concludes the thing is broken, while a visitor who feeds
it a cat is deliberately poking at it.

98 rather than 98.5 because of what each further step costs. From 95 the price
runs 3 cats per point recovered on distant dogs, then 28, then 65 above 98. At
8.10% cats, 98.5 would sit 1.9 points under the ceiling where 98 leaves 5.5.

## Making the percentage mean something

Softmax output is not confidence, and showing the raw number to a user is a claim
the model cannot back. Expected calibration error measures the mismatch: group
predictions by stated confidence, then compare each group's confidence against the
accuracy it actually reached. A calibrated model says 80% and is right 80% of the
time.

Temperature scaling fixes it with one scalar, dividing the logits before the
softmax. T is fitted on validation against negative log-likelihood, which is
smooth and convex in T. Fitting the ECE directly would optimise a step function of
the binning and invite solutions that rearrange bins instead of fixing anything.

The textbook result is that networks are overconfident and T lands above 1. That
happened with the trained probe. It did not happen here.

| | T | ECE before | ECE after |
|---|---:|---:|---:|
| convnext_t_probe | 1.2100 | 3.12% | 0.98% |
| **imagenet_head** | **0.7573** | **5.71%** | **0.84%** |

T below 1 sharpens rather than flattens: the pretrained head states less confidence
than it earns. Two models on the same backbone, on opposite sides of the same
correction. The likely reason is the recipe rather than the architecture, since
timm's `in12k_ft_in1k` fine-tune uses label smoothing and mixup, both of which
teach a network never to commit, while the probe here was trained with plain
cross-entropy. Guo et al. described models from 2017, before those recipes were
standard, and the generic advice has aged.

After correction the top bucket holds 6412 of the 8580 test images at a stated
0.9872 against 0.9894 achieved. Dividing by a positive constant cannot reorder
logits, so no prediction moves and accuracy is untouched; only the number shown
changes. The division is folded into the exported graph rather than left to the
server, so the model cannot be served uncalibrated by forgetting a step.

## Latency

Measured with onnxruntime, batch 1, two CPU threads, 200 runs after 20 warmups.
Batch 1 because people upload one photo, two threads to approximate a small VPS
rather than the development machine.

| Scenario | p50 | p95 | p99 |
|---|---:|---:|---:|
| Model only, 224×224 tensor | 104.7 ms | 126.6 ms | 130.3 ms |
| End to end, 3840×2160 JPEG | 237.0 ms | 264.0 ms | 280.5 ms |
| End to end, scaled JPEG decoding | 141.8 ms | **160.3 ms** | 170.4 ms |

The first end-to-end run was the useful one, because decoding a 4K JPEG turned out
to cost more than the inference. `Image.draft()` lets libjpeg decode at 1/8 scale
inside the DCT domain, which roughly halves preprocessing without changing what
the model receives. What is left is Huffman decoding of the full stream, and that
cannot be avoided server-side.

160 ms on two desktop threads was expected to extrapolate to 240-400 ms on a cheap
VPS, straddling the 300 ms budget. On the real hardware it came out better:

| Measured on the deployed service | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|
| The service, on the VPS over loopback | 66 ms | **123 ms** | 130 ms | 134 ms |
| From a laptop in Italy, HTTPS and network included | 127 ms | 157 ms | 369 ms | 1156 ms |

200 requests each, one 27 kB JPEG, re-measured after the head swap.

The loopback row is the one to quote, because it is a property of the service
rather than of whoever is measuring it. The second row is the same request seen
through a domestic connection, and the tail belongs to that connection: a
1156 ms request cannot come from a container whose own worst case over the same
200 requests was 134 ms.

Factor of two in hand against the budget, with client-side downscaling and int8
quantisation still unspent. The pre-deployment estimate was pessimistic because
it was taken through Docker Desktop on a WSL2 virtual machine, and the VPS runs
the same image on native cores.

## Data

Stanford Dogs, 20580 images across 120 breeds, using the official 12000/8580
split. The training portion is re-split 85/15 into 10200 training and 1800
validation images, stratified so every breed contributes exactly 85 and 15.

The split is generated once and committed as one CSV. Since each image occupies
exactly one row, the partition property alone proves the three splits are
disjoint, and the file is small enough that most invariants run in CI without
downloading 750 MB of photographs.

Oxford-IIIT Pet supplies the second evaluation. Of its 25 dog breeds, 13 match
Stanford by name and 8 more by alias, `japanese_chin` being Stanford's
`japanese_spaniel` and `basset_hound` being `basset`. Four are dropped: three have
no Stanford equivalent, and `american_pit_bull_terrier` is deliberately not mapped
onto `american_staffordshire_terrier`, because they are distinct breeds and
conflating them would inject label noise into the exact number this project is
built to measure. The alias table is hand-written domain knowledge, so tests check
that every entry still names a breed that exists.

Oxford's 2371 cats are kept aside as near-distribution negatives for the gate.

Two of the 120 Stanford classes describe the same animal. `n02109961` is labelled
"Eskimo dog" and `n02110185` "Siberian husky", and the WordNet synset for the
first lists "husky" as one of its own lemmas. Their class centres are the closest
of all 7140 pairs, 5.1 apart against a median of 31.5, and the confusion between
them runs 65% one way. The literature's answer to non-separable classes is
multi-label evaluation rather than merging, so the labels are left alone and the
demo merges the two for display, with the merge disclosed on the page.

## Engineering notes

**The mapping from labels to ImageNet classes is derived, not written.** Stanford
folder names are WordNet IDs and ImageNet-1k indexes its classes on the same IDs,
so the 120 indices fall out of a dictionary lookup. That is also why it needs
testing: a slip in the parsing produces a permutation rather than an exception,
and a permuted mapping lowers the baseline accuracy with nothing to notice it.
Three tests fix the shape, and a fourth checks each label individually by
asserting the Stanford folder name appears among the WordNet lemmas of the class
it points at. It holds for all 120. Swapping any two entries passes the first
three and fails only the fourth.

**Preprocessing comes from the model.** Resize ratio, interpolation and
normalisation are read from timm's `pretrained_cfg` instead of hardcoded. The
three architectures use crop ratios of 0.95, 0.875 and 0.95, so hardcoding 0.875
the way most tutorials do would have silently mis-preprocessed two of them.

**Pretrained weights are pinned by tag.** `resnet50` on its own resolves to
whatever timm's current default is, and there are 39 published checkpoints behind
that name. The zero-shot table records the tag next to every row, which is how
`in12k_ft_in1k` was ruled out as the explanation: convnext is the only one of the
three pretrained on ImageNet-12k, and it does not have the best untouched head.

**The exported model is checked rather than assumed.** `verify_onnx.py` compares
logits and predictions between PyTorch and onnxruntime across the full test set,
both on CPU so the runtime is the only variable. Same accuracy to two decimals,
zero disagreements over 8580 images. The raw logits differ by about 5e-05, because
the two runtimes accumulate the same sums in a different order and fuse operators
differently. What matters is that no prediction flips.

**The model describes itself.** `export.py` writes a JSON beside the ONNX carrying
the preprocessing config and the 120 class names in label order. The serving
project is independent, with no timm, no torch and no split CSV, so without that
file the container would hardcode both and would keep using the old crop ratio the
day the model changed. Tests rebuild the preprocessing from the JSON alone and
assert the tensors match the ones the model was evaluated with.

**Measurement bugs found along the way.** Accuracy was averaging per-batch means,
which weights a short final batch as heavily as a full one. Weakening the training
augmentation from `scale=(0.08, 1.0)` to `(0.5, 1.0)` cost 2.2 points of
validation accuracy, since with 85 images per breed the aggressive crop was doing
real regularisation work; the low training accuracy that prompted the change was
just the difference between augmented crops and clean ones.

**Tests.** 63 in this project, 8 more in `serving/`. The ones that need only the
committed split CSV run in CI without either dataset; the rest are marked
`dataset`, `export` or `serving` and skip when the images or artifacts are
missing. The assertions that matter were checked by mutation: shifting the class
list by one position, or setting the crop ratio to the value most tutorials
hardcode, has to turn something red. Two tests were rewritten after that check
found they passed anyway. The same pass over the distance formula found one guard
no test covers, the clamp that stops a rounding error from reaching a square root,
and the test says so plainly rather than implying coverage it does not have.

## What I would do differently

The zero-shot baseline should have been the first measurement, not the last. Five
training runs went into beating a number that had already been beaten by the
weights they all started from.

The reason it came last is worth stating, because it is the same fact as the
finding. A zero-shot baseline only exists here because the 120 target labels are
themselves ImageNet labels. On a genuinely new dataset there is nothing to compare
against, which is why the step is easy to skip. Skipping it means not noticing
that the labels are ImageNet labels, and noticing that is the contamination result.
The mistake and the discovery are one observation seen twice.

Everything above is arranged in the order that makes it readable rather than the
order it was produced in. The git history has the real sequence.

## Running it

```
uv sync
uv run python -m dog_breed.data.download
uv run python -m dog_breed.data.extract
uv run python -m dog_breed.data.splits

uv run python -m dog_breed.zero_shot                          # the baseline, all backbones
uv run python -m dog_breed.train        convnext_t_probe      # the control group
uv run python -m dog_breed.imagenet_head convnext_t_probe     # the deployed model

uv run python -m dog_breed.evaluate     imagenet_head
uv run python -m dog_breed.calibrate    imagenet_head
uv run python -m dog_breed.ood          imagenet_head
uv run python -m dog_breed.export       imagenet_head
uv run python -m dog_breed.verify_onnx  imagenet_head
uv run python -m dog_breed.benchmark    imagenet_head --image photo.jpg

uv run pytest
uv run pytest -m "not dataset"
```

`imagenet_head` takes the name of a trained experiment and reads only the backbone
from it, then writes an ordinary checkpoint that every script downstream opens
without knowing it was never trained.

Experiments are declared in `src/dog_breed/experiments.py` and every script takes
the experiment name, so results never overwrite each other.

On an 8 GB GPU, set `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` before
training convnext, or the allocator fragments and fails mid-run.

## Serving

[`serving/`](../../serving/README.md) holds the deployed half: a FastAPI service
around the exported graph, containerised, carrying neither torch nor timm. It
reimplements the evaluation transform and the Mahalanobis distance on PIL and
numpy alone, and both are held to the originals by parity tests that run from this
project.

Deployed at **https://kb-portfolio.dev/api** behind nginx on a 4-vCPU VPS, at
123 ms p95 measured on the machine itself.
