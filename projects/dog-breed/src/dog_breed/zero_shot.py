"""What each backbone scores on this task with no training at all.

Stanford's 120 breeds are ImageNet-1k classes, so every pretrained backbone
already ships a classifier for them. Slice the 1000-way head down to those 120
columns and it is a dog breed classifier that has never seen this project —
the baseline the five experiments should have been measured against from the
start, and were not.

One row per backbone and evaluation, because the baseline is a property of the
backbone: convnext_t and convnext_t_probe share theirs. Backbones are read from
EXPERIMENTS, so an experiment cannot be added without its baseline appearing.

Two accuracies per row. `acc_open` lets the model pick among all 1000 classes
and counts a chair as a miss; `acc_restricted` gathers the 120 columns first,
which is the choice the trained models are allowed to make. They differ by
about 0.2 points: the prediction leaves the dog classes roughly once in 400
images, and `out_of_space_rate` is how often.
"""

import timm
from timm.data import ImageNetInfo
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import csv
from tqdm import tqdm

from dog_breed.paths import SPLIT_FILE, REPORTS_DIR, ZERO_SHOT_FILE
from dog_breed.data.splits import LABEL_SIZE
from dog_breed.data.transforms import val_test_transforms
from dog_breed.data.dataset import stanford_dataset, oxford_dataset
from dog_breed.data.oxford import mapped_dog_samples
from dog_breed.train import correct_predictions
from dog_breed.experiments import EXPERIMENTS

BATCH_SIZE = 32
CSV_HEADER = ['model', 'tag', 'evaluation', 'num_images', 'acc_open', 'acc_restricted', 'out_of_space_rate']


def imagenet_indices() -> list[int]:
    """Stanford label -> ImageNet-1k class index, ordered by label.

    The Stanford folder prefix is a WordNet ID and label_names() lists the 1000
    WNIDs in class-index order, so the mapping is mechanical. Ordering by label
    is what makes `logits[:, idx]` come out already in the project's own label
    space. Its invariants are in tests/test_imagenet_mapping.py.
    """
    names = ImageNetInfo("imagenet-1k").label_names()
    wnid_to_index = {wnid: i for i, wnid in enumerate(names)}
    indices = [None] * LABEL_SIZE
    with open(SPLIT_FILE, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter=';')
        next(reader)
        for file_dir, label,_ in reader:
            wnid = file_dir.split("/")[0].split("-")[0]
            label = int(label)
            indices[label] = wnid_to_index[wnid]
    return indices


def zero_shot_accuracy(model: nn.Module, loader: DataLoader, idx: torch.Tensor, device: str):
    """Open accuracy, restricted accuracy and out-of-space rate, from one pass.

    Both predictions come from the same logits, so the two accuracies cost one
    forward pass rather than two. Restricting can only change the answer when
    the open argmax fell outside the 120 columns — otherwise it is still the
    argmax of the subset — so the gap between them is bounded by the third
    number, and falls short of it whenever restricting picks the wrong breed.
    """
    total_correct_open = 0
    total_correct_restricted = 0
    total_out_of_space = 0
    with torch.inference_mode():
        for images, labels in tqdm(loader, desc="Evaluating the model..."):
            images, labels = images.to(device), labels.to(device)
            logits = model(images)

            pred_open = logits.argmax(dim=1)
            total_correct_open += correct_predictions(y_pred=pred_open, y_true=idx[labels])
            total_out_of_space += (~torch.isin(pred_open, idx)).sum()

            pred_restricted = logits[:, idx].argmax(dim=1)
            total_correct_restricted += correct_predictions(y_pred=pred_restricted, y_true=labels)

    return total_correct_open / len(loader.dataset), total_correct_restricted / len(loader.dataset), total_out_of_space.item() / len(loader.dataset)


def main():
    backbones = {cfg["model_name"] for cfg in EXPERIMENTS.values()}
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    idx = torch.tensor(imagenet_indices(), device=device)

    rows = []
    rows.append(CSV_HEADER)

    for backbone in sorted(backbones):
        model = timm.create_model(backbone, pretrained=True)
        tf = val_test_transforms(model.pretrained_cfg)

        evaluations = (
            ("Stanford test (120 breeds)", stanford_dataset('test', tf)),
            ("Stanford test (21 breeds)", stanford_dataset('test', tf, keep_labels={label for _, label in mapped_dog_samples()})),
            ("Oxford dogs (21 breeds)", oxford_dataset(tf)),
        )

        model.to(device).eval()
        for eval_name, ds in evaluations:
            print(f"Evaluating backbone '{backbone}' on: {eval_name}")
            loader = DataLoader(dataset=ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=4, pin_memory=True)
            open_acc, restricted_acc, out_of_space_rate = zero_shot_accuracy(model, loader, idx, device)
            rows.append([backbone, model.pretrained_cfg['tag'], eval_name, len(ds), open_acc, restricted_acc, out_of_space_rate])
            print(f"Evaluated on: {eval_name} | open accuracy: {open_acc} | restricted accuracy: {restricted_acc} | total images: {len(ds)}")

    with open(ZERO_SHOT_FILE, 'w', encoding='utf-8', newline='') as f:
        csv.writer(f).writerows(rows)
    print(f"Written zero_shot_file in: {ZERO_SHOT_FILE}")


if __name__ == "__main__":
    main()