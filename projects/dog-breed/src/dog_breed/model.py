import timm
import torch
from dog_breed.data.splits import LABEL_SIZE
from dog_breed.paths import MODEL_DIR, model_file
from pathlib import Path

def create_model(model_name="resnet50", num_classes=120, freeze_backbone=True, pretrained=True) -> torch.nn.Module:
    """
    Create a model using the timm library.
    """  
    model = timm.create_model(model_name, pretrained=pretrained, num_classes=num_classes)
    if freeze_backbone:
        for param in model.parameters():
            param.requires_grad = False
        for param in model.get_classifier().parameters():
            param.requires_grad = True
    return model

def load_trained_model(name: str, device: str) -> tuple[torch.nn.Module, dict]:
    """Rebuild an experiment's model and load its best checkpoint.

    `pretrained=False` because the ImageNet weights would be overwritten by
    load_state_dict one line later; `pretrained_cfg` stays populated either
    way, so the preprocessing config is still available to the caller.
    """
    ckpt = torch.load(model_file(name), map_location=device)
    model = create_model(
        model_name=ckpt["model_name"],
        num_classes=LABEL_SIZE,
        freeze_backbone=False,
        pretrained=False,
    )
    model.load_state_dict(ckpt["state_dict"])
    return model.to(device), ckpt


def save_model(model: torch.nn.Module, epoch: int, val_acc: float, dest: Path):
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    torch.save({
        "state_dict": model.state_dict(),
        "epoch": epoch,
        "val_acc": val_acc,
        "model_name": model.pretrained_cfg["architecture"]
    }, dest)

