"""Check that the exported ONNX model is the model, not an approximation of it.

Two checks. The first compares raw logits on one batch: the expected gap is
around 1e-5, because the two runtimes accumulate the same sums in a different
order and fuse operators differently. A gap of 1e-2 would mean something is
actually broken, not merely rounded differently.

The second runs the whole test set through both and counts how often they
disagree on the predicted breed — what the user actually sees, and what a
handful of near-ties could still flip.

Both run on CPU: torch on GPU differs from torch on CPU too, and comparing
across devices would measure two things at once.

Finally, the results are written on the onnx parity file.
"""

import numpy as np
import onnxruntime as ort
import torch
from torch.utils.data import DataLoader
from tqdm import tqdm
import csv

from dog_breed.data.dataset import stanford_dataset
from dog_breed.data.transforms import val_test_transforms
from dog_breed.experiments import parse_experiment
from dog_breed.model import load_trained_model
from dog_breed.paths import onnx_file
from dog_breed.paths import REPORTS_DIR, ONNX_PARITY_FILE

BATCH_SIZE = 32
CSV_HEADER = ['experiment', 'model', 'max_abs_logit_difference', 'onnx_acc', 'torch_acc', 'disagreements', 'num_images']


def compare_full(model, session, loader):
    """Returns (onnx_correct, torch_correct, disagreements) over the whole loader."""
    onnx_correct = torch_correct = disagreements = 0

    for images, labels in tqdm(loader, desc="Comparing onnx against torch"):
        with torch.inference_mode():
            torch_pred = model(images).argmax(dim=1).numpy()
        onnx_pred = session.run(["logits"], {"input": images.numpy()})[0].argmax(axis=1)
        labels_np = labels.numpy()

        onnx_correct += (onnx_pred == labels_np).sum()
        torch_correct += (torch_pred == labels_np).sum()
        disagreements += (onnx_pred != torch_pred).sum()

    return onnx_correct, torch_correct, disagreements


def main():
    name = parse_experiment()

    model, ckpt = load_trained_model(name, "cpu")
    model.eval()
    session = ort.InferenceSession(str(onnx_file(name)), providers=["CPUExecutionProvider"])

    ds = stanford_dataset("test", val_test_transforms(model.pretrained_cfg))
    loader = DataLoader(ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=4)

    # 1. one batch, raw logits
    images, _ = next(iter(loader))
    with torch.inference_mode():
        torch_logits = model(images)
    onnx_logits = session.run(["logits"], {"input": images.numpy()})[0]

    max_diff = np.abs(torch_logits.numpy() - onnx_logits).max()
    agreement = (torch_logits.argmax(dim=1).numpy() == onnx_logits.argmax(axis=1)).mean() * 100
    print(f"{name}: max |logit difference| on one batch: {max_diff:.2e}")
    print(f"{name}: argmax agreement on that batch: {agreement:.2f}%")

    # 2. the whole test set
    total = len(ds)
    onnx_correct, torch_correct, disagreements = compare_full(model, session, loader)
    onnx_frac = onnx_correct / total
    torch_frac = torch_correct / total
    print(f"onnx accuracy:  {onnx_frac * 100:.2f}%")
    print(f"torch accuracy: {torch_frac * 100:.2f}%")
    print(f"disagreements:  {disagreements} of {total} images")

    # Write on report file
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    # Checked before opening: 'a' creates the file, so exists() would always
    # be True afterwards and the header would never be written.
    write_header = not ONNX_PARITY_FILE.exists()
    with open(ONNX_PARITY_FILE, 'a', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(CSV_HEADER)
        writer.writerow([name, ckpt['model_name'], max_diff, onnx_frac, torch_frac, disagreements, total])


if __name__ == "__main__":
    main()
