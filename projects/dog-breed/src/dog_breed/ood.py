"""Out-of-distribution gate.

The classifier always returns 120 logits: hand it a cat, a chair or a blank
wall and it still answers with a breed and a confidence. Softmax has no way
to say "not a dog".

So the decision is made one layer earlier. The 768-dimensional penultimate
features of the training dogs form a cloud; the Mahalanobis distance to the
nearest class centre measures how far an image falls outside it. Unlike
Euclidean distance, it accounts for how far the cloud actually spreads in
each direction, which matters when the 768 dimensions have wildly different
scales and are correlated.

Fitting uses the training split. The threshold is calibrated on Oxford's
dogs, not on Stanford validation: Oxford photos come from a different source,
which is also true of whatever a user uploads. Calibrating on validation
looked fine there and rejected 12% of real Oxford dogs.

The gate is then measured against Oxford's cats: near-distribution negatives
(fur, four legs, a muzzle, the same pet-photo framing) rather than the easy
kind.
"""

import csv

import numpy as np
import torch
import torch.nn as nn
from sklearn.covariance import LedoitWolf
from torch.utils.data import DataLoader
from tqdm import tqdm

from dog_breed.experiments import parse_experiment
from dog_breed.model import load_trained_model
from dog_breed.data.dataset import stanford_dataset, oxford_cat_dataset, oxford_dataset
from dog_breed.data.transforms import val_test_transforms
from dog_breed.paths import MODEL_DIR, OOD_REPORT_FILE, REPORTS_DIR, features_file, ood_file
from dog_breed.data.splits import LABEL_SIZE

BATCH_SIZE = 32

# Accept this share of the calibration dogs. A product decision rather than a
# tuned value, but not an arbitrary one: it was 95, and moved after using the
# deployed demo showed that photographs taken from a few metres away were being
# turned away. Measured against Stanford's own bounding boxes, the gate accepted
# 99.7% of photos where the dog filled most of the frame and only 77.3% where it
# filled under a tenth of it. The gate was not malfunctioning. Both calibration
# sets are pet portraits, so a distant dog genuinely is far from the training
# distribution, and the gate said so.
#
# Sweeping the threshold against Oxford's dogs and cats:
#
#   TPR     oxford dogs   cats accepted   dogs under 10% of frame
#   95.0          95.0%           1.18%                     77.3%
#   97.0          97.0%           1.98%                     84.1%
#   97.5          97.5%           2.36%                     85.8%
#   98.0          98.0%           4.47%                     87.6%
#   98.5          98.5%           8.10%                     88.8%
#   99.0          99.0%          17.80%                     92.3%
#
# The cliff is at 99, where the gate admits nearly a fifth of all cats and stops
# being a gate. Everything at or below 98.5 is on the safe side of it, so the
# choice between those values is a product judgement rather than something the
# data settles: on a public demo a false negative costs more than a false
# positive, because a visitor whose own dog is turned away concludes the thing
# is broken, while a visitor who feeds it a cat is deliberately probing it.
#
# 98 rather than 98.5 because of what each further step buys. From 95 the price
# runs 3 cats per point recovered on distant dogs, then 28, then 65 above 98.
# The curve has already turned by 98.5, and at 8.10% cats that setting sits 1.9
# points under the 10% ceiling this project committed to before it had any of
# these numbers, where 98 leaves 5.5. A limit worth quoting is a limit worth
# keeping room under.
#
TARGET_TPR = 98

# Which set the threshold is read off. Stands in for production, so it has to
# be the one furthest from the training distribution.
CALIBRATION_SET = "oxford_dogs"

CSV_HEADER = ['experiment', 'calibrated_on', 'threshold', 'dataset', 'n', 'accept_rate']


def extract_features(model: nn.Module, loader: DataLoader, device: str):
    """Penultimate-layer features, one row per image.

    forward_head(pre_logits=True) stops after the pooling and skips the
    classifier: the 120 logits are a projection of these 768 numbers and have
    already lost the geometry the distance relies on.
    """
    feats_batches, label_batches = [], []
    model.eval()
    with torch.inference_mode():
        for images, labels in tqdm(loader, desc="Extracting features..."):
            x = model.forward_features(images.to(device))
            x = model.forward_head(x, pre_logits=True)
            # Off the GPU per batch: keeping them there would grow with the
            # dataset for no reason.
            feats_batches.append(x.cpu())
            label_batches.append(labels)
    return torch.cat(feats_batches), torch.cat(label_batches)


def fit_mahalanobis(features, labels):
    """Per-class means, one shared covariance (Lee et al. 2018).

    85 images per breed cannot support 120 separate 768x768 covariances, but
    10200 residuals can support one.
    """
    means = np.array([features[labels == c].mean(axis=0) for c in range(LABEL_SIZE)])

    # Each vector minus the centre of its own class. Estimating the covariance
    # on the raw features instead would capture how far the breeds sit from
    # each other, making the empty space between two breeds look ordinary --
    # which is exactly where a cat can land.
    residuals = features - means[labels]

    # Shrinkage, not the empirical estimate: in 768 dimensions the empirical covariance is 
    # near-singular and inverting it amplifies rounding error.
    precision = LedoitWolf().fit(residuals).precision_
    return means, precision


def mahalanobis_score(features, means, precision):
    """Distance to the nearest class centre, one score per image."""
    dists = []
    for c in range(LABEL_SIZE):
        diff = features - means[c]
        # The quadratic form d^T P d, row by row. `diff @ precision @ diff.T`
        # would build an (N, N) matrix to then use only its diagonal.
        d2 = (diff @ precision * diff).sum(axis=1)
        dists.append(d2)

    d2_all = np.stack(dists, axis=1)
    # Nearest centre: resembling one breed is enough to be a dog. The clamp is insurance, not a fix
    return np.sqrt(np.maximum(d2_all.min(axis=1), 0))


def score_dataset(model, dataset, means, precision, device):
    loader = DataLoader(dataset=dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=4)
    feats, _ = extract_features(model=model, loader=loader, device=device)
    return mahalanobis_score(feats.numpy(), means, precision)


def main():
    name = parse_experiment()

    device = 'cuda' if torch.cuda.is_available() else 'cpu'

    model, _ = load_trained_model(name, device)
    tf = val_test_transforms(model.pretrained_cfg)
    ds = stanford_dataset("train", tf)
    loader = DataLoader(dataset=ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=4)

    feats, labels = extract_features(model, loader, device)
    print(f"feats shape: {feats.shape} | labels shape: {labels.shape}")

    # Cached so later work on the statistics does not re-run the GPU pass.
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    feature_path = features_file(name)
    np.savez(feature_path, features=feats.numpy(), labels=labels.numpy())
    print(f"Saved features into: {feature_path}")

    f_np, l_np = feats.numpy(), labels.numpy()
    means, precision = fit_mahalanobis(f_np, l_np)
    print(f"means shape: {means.shape} | precision shape: {precision.shape}")

    # Oxford's dogs are in here as a control: outside data, but still dogs,
    # so they must pass. If they did not, the gate would be rejecting photos
    # for where they came from rather than for what they show -- and every
    # user upload would be rejected too.
    datasets = (
        ("train (fitted on)", ds),
        ("val_dogs", stanford_dataset('val', tf)),
        ("oxford_dogs", oxford_dataset(tf)),
        ("oxford_cats", oxford_cat_dataset(tf))
    )
    scores = {}
    for label, dataset in datasets:
        scores[label] = score_dataset(model, dataset, means, precision, device)

    # Never from train, whose scores are optimistically low: the means and
    # covariance were fitted on those very images.
    threshold = np.percentile(scores[CALIBRATION_SET], TARGET_TPR)

    rows = []
    for label, s in scores.items():
        # The score is a distance, so low means dog-like: accepted is `<`.
        accept_rate = (s < threshold).mean()
        print(f"{label}: {accept_rate * 100:.2f}% accepted")
        rows.append([name, CALIBRATION_SET, threshold, label, len(s), accept_rate])

    # How well the gate performs: evidence for a reader, not something the
    # server loads.
    write_header = not OOD_REPORT_FILE.exists()
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(OOD_REPORT_FILE, 'a', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(CSV_HEADER)
        writer.writerows(rows)
    print(f"Written {OOD_REPORT_FILE}")

    # The gate itself: everything the server needs to score an image and
    # decide. The raw features were only ever a means to these three.
    ood_path = ood_file(name)
    np.savez(ood_path, means=means, precision=precision, threshold=threshold)
    print(f"Saved ood into: {ood_path}")
    

if __name__ == "__main__":
    main()