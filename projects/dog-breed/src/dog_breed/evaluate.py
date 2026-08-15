"""Evaluate a trained experiment on three test sets.

Three numbers, not two. Stanford's test split covers 120 breeds while Oxford
only shares 21, so comparing them directly would blend two effects: the
different photo source, and the fact that those 21 breeds may be easier or
harder than average. The middle row isolates the first.

Results are appended to reports/evaluation.csv, one row per evaluation, so
every experiment accumulates in the same comparable table.
"""

import csv

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from dog_breed.data.dataset import test_evaluations
from dog_breed.data.transforms import val_test_transforms
from dog_breed.device import resolve_device
from dog_breed.experiments import parse_experiment
from dog_breed.metrics import evaluation
from dog_breed.model import load_trained_model
from dog_breed.paths import EVAL_FILE, REPORTS_DIR

BATCH_SIZE = 32
CSV_HEADER = ["experiment", "model", "epoch", "evaluation", "num_images", "loss", "acc"]


def run_eval(model, dataset, device):
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=4)
    return evaluation(model=model, loader=loader, loss_fn=nn.CrossEntropyLoss(), device=device)


def main():
    name = parse_experiment()
    device = resolve_device()

    model, ckpt = load_trained_model(name, device)
    tf = val_test_transforms(model.pretrained_cfg)

    evaluations = test_evaluations(tf)

    print(f"Evaluating '{name}' ({ckpt['model_name']}, epoch {ckpt['epoch']}) on {device}")

    rows = []
    for eval_name, dataset in evaluations:
        loss, acc = run_eval(model=model, dataset=dataset, device=device)
        print(f"  {eval_name}: {len(dataset)} images | loss {loss:.4f} | acc {acc * 100:.2f}%")
        rows.append([name, ckpt["model_name"], ckpt["epoch"], eval_name, len(dataset), loss, acc])

    # Checked before opening: 'a' creates the file, so exists() would always
    # be True afterwards and the header would never be written.
    write_header = not EVAL_FILE.exists()
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(EVAL_FILE, "a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(CSV_HEADER)
        writer.writerows(rows)

    print(f"Appended {len(rows)} rows to {EVAL_FILE}")


if __name__ == "__main__":
    main()
