"""Measure and correct the model's overconfidence.

Softmax probabilities are not confidences: networks routinely claim 95% and
are right far less often. Showing an uncalibrated number to a user is a claim
the model cannot back.

Temperature scaling (Guo et al., 2017) divides the logits by a single scalar
before the softmax. Dividing by a positive constant cannot reorder them, so
predictions and accuracy are untouched and only the reported number moves.

T is fitted on validation by minimising negative log-likelihood -- smooth and
convex in T, unlike the ECE, which is a step function of the binning and can
be gamed by an optimiser.
"""

import csv
import json

import numpy as np
import torch
from scipy.optimize import minimize_scalar
from torch.utils.data import DataLoader
from tqdm import tqdm

from dog_breed.data.dataset import stanford_dataset
from dog_breed.data.transforms import val_test_transforms
from dog_breed.experiments import parse_experiment
from dog_breed.model import load_trained_model
from dog_breed.paths import MODEL_DIR, REPORTS_DIR, calibration_file, temperature_file
from dog_breed.device import resolve_device

BATCH_SIZE = 32
N_BINS = 15
CSV_HEADER = ['experiment', 'split', 'temperature', 'ece', 'bin_low', 'bin_high', 'n', 'confidence', 'accuracy']


def softmax(logits):
    e = np.exp(logits - logits.max(axis=1, keepdims=True))
    return e / e.sum(axis=1, keepdims=True)


def ece(probs, labels, n_bins=N_BINS):
    confidence = probs.max(axis=1)
    predicted = probs.argmax(axis=1)
    correct = predicted == labels

    edges = np.linspace(0.0, 1.0, n_bins + 1)
    total = len(labels)
    error = 0.0
    table = []

    for lo, hi in zip(edges[:-1], edges[1:]):
        mask = (confidence > lo) & (confidence <= hi)
        if not mask.any(): continue

        n = int(mask.sum())
        acc = correct[mask].mean()
        conf = confidence[mask].mean()
        error += (n / total) * abs(acc - conf)
        table.append((lo, hi, n, conf, acc))
    return error, table


def collect_logits(model, loader, device):
    """Raw logits and labels, one row per image."""
    logit_batches, label_batches = [], []
    model.eval()
    with torch.inference_mode():
        for images, labels in tqdm(loader, desc="Collecting logits..."):
            out = model(images.to(device))
            logit_batches.append(out.cpu())
            label_batches.append(labels)
    return torch.cat(logit_batches).numpy(), torch.cat(label_batches).numpy()


def nll(temperature, logits, labels):
    """Negative log-likelihood of the true classes at this temperature."""
    probs = softmax(logits / temperature)
    return -np.mean(np.log(probs[np.arange(len(labels)), labels] + 1e-12))


def fit_temperature(logits, labels) -> float:
    """The single scalar that best calibrates these logits."""
    result = minimize_scalar(
        nll,
        bounds=(0.5, 5.0),
        method='bounded',
        args=(logits, labels)
    )
    return float(result.x)


def report(label, error, table):
    print(f"\n{label} -- ECE {error:.4f}")
    for lo, hi, n, conf, acc in table:
        print(f"  {lo:.2f}-{hi:.2f} | n={n:5} | conf={conf:.3f} | "
              f"acc={acc:.3f} | gap={conf - acc:+.3f}")


def split_logits(model, split, tf, device):
    """One GPU pass over a split, reusable for any temperature."""
    ds = stanford_dataset(split, tf)
    loader = DataLoader(ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=4)
    return collect_logits(model, loader, device)


def main():
    name = parse_experiment()
    device = resolve_device()

    model, _ = load_trained_model(name, device)
    tf = val_test_transforms(model.pretrained_cfg)

    val_logits, val_labels = split_logits(model, "val", tf, device)
    temperature = fit_temperature(val_logits, val_labels)

    # Test is the number worth quoting: T never saw these 8580 images, whereas
    # the validation figure is measured on the very data it was fitted on.
    test_logits, test_labels = split_logits(model, "test", tf, device)

    results = []
    for split, logits, labels in (("val", val_logits, val_labels),
                                  ("test", test_logits, test_labels)):
        for t in (1.0, temperature):
            error, table = ece(softmax(logits / t), labels)
            report(f"{split:4} T={t:.4f}", error, table)
            results.append((split, t, error, table))

    print(f"\nT = {temperature:.4f} (fitted on val)")
    print(f"NLL on val : {nll(1.0, val_logits, val_labels):.4f} -> "
          f"{nll(temperature, val_logits, val_labels):.4f}")
    for split, t, error, _ in results:
        print(f"ECE {split:4} T={t:.2f}: {error:.4f}", end="  ")
    print()

    # Four tables in one file; the split and temperature columns separate them,
    # so the comparison survives in the repo rather than in a terminal.
    cal_file = calibration_file(name)
    write_header = not cal_file.exists()
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(cal_file, 'a', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(CSV_HEADER)
        writer.writerows(
            [name, split, t, error, *row]
            for split, t, error, table in results
            for row in table
        )
    print(f"Written table at: {cal_file}")

    # Read back by export.py, which folds T into the ONNX graph. Calibrate
    # before exporting, or the served model ships uncalibrated.
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    temp_path = temperature_file(name)
    with open(temp_path, 'w', encoding='utf-8') as f:
        json.dump({"temperature": temperature, "fitted_on": "val"}, f, indent=2)
    print(f"Saved temperature to: {temp_path}")


if __name__ == "__main__":
    main()