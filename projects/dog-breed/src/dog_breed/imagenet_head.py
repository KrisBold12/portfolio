"""Build a 120-class checkpoint out of the pretrained ImageNet head.

Stanford's 120 breeds are ImageNet-1k classes, so the backbone already carries
a classifier for them among its 1000 outputs. Keeping the 120 rows that matter
gives a dog breed classifier that was never trained here, and zero_shot.py
measured that it beats all five that were.

The output is an ordinary checkpoint in save_model's format, which is the whole
point: calibrate, ood, export and verify_onnx open it like any other and none of
them had to change. The command-line argument is the source experiment, used
only to read which backbone to slice.
"""

import torch
from torch.utils.data import DataLoader
import timm

from dog_breed.paths import model_file
from dog_breed.experiments import parse_experiment, EXPERIMENTS, HEAD_NAME
from dog_breed.zero_shot import imagenet_indices
from dog_breed.model import create_model, save_model
from dog_breed.data.splits import LABEL_SIZE
from dog_breed.data.transforms import val_test_transforms
from dog_breed.data.dataset import stanford_dataset
from dog_breed.metrics import evaluation
from dog_breed.device import resolve_device

BATCH_SIZE = 32


def main():
    name = parse_experiment(EXPERIMENTS)
    ckpt = torch.load(model_file(name), map_location='cpu')
    model_name = ckpt['model_name']
    full = timm.create_model(model_name, pretrained=True)
    clf = full.get_classifier()

    # One row of the weight matrix per output class, so indexing the first
    # dimension keeps the 120 breed detectors and drops the 880 for tables,
    # cats and wolves. Ordered by label, so row 0 is the Chihuahua: the same
    # selection zero_shot.py applies to the logits, moved onto the weights.
    idx = imagenet_indices()
    w, b = clf.weight.data[idx].clone(), clf.bias.data[idx].clone()

    # model.py's create_model rather than timm's: it is the same function
    # load_trained_model will use to rebuild this, so the state_dict matches by
    # construction rather than by inspection.
    model = create_model(model_name=model_name, num_classes=LABEL_SIZE, freeze_backbone=False, pretrained=True)

    head = model.get_classifier()

    # copy_ broadcasts silently in some shape mismatches, and a head with
    # scrambled weights runs and answers wrongly rather than raising.
    assert w.shape == (LABEL_SIZE, head.in_features)

    with torch.no_grad():
        head.weight.copy_(w)
        head.bias.copy_(b)

    tf = val_test_transforms(model.pretrained_cfg)
    ds = stanford_dataset(split_name='val', transform=tf)
    loader = DataLoader(dataset=ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=4, pin_memory=True)

    device = resolve_device()

    _, val_acc = evaluation(model=model, loader=loader, loss_fn=torch.nn.CrossEntropyLoss(), device=device)

    dest = model_file(HEAD_NAME)
    save_model(model=model, epoch=0, val_acc=val_acc, dest=dest)
    print(f"Saved model in: {dest}")


if __name__ == "__main__":
    main()
