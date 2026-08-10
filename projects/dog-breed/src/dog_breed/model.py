import timm
import torch
from dog_breed.paths import MODEL_DIR, MODEL_FILE

def create_model(model_name="resnet50", num_classes=120, freeze_backbone=True) -> torch.nn.Module:
    """
    Create a model using the timm library.
    """  
    model = timm.create_model(model_name, pretrained=True, num_classes=num_classes)
    if freeze_backbone:
        for param in model.parameters():
            param.requires_grad = False
        for param in model.get_classifier().parameters():
            param.requires_grad = True
    return model

def save_model(model: torch.nn.Module, epoch: int, val_acc: float):
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    torch.save({
        "state_dict": model.state_dict(),
        "epoch": epoch,
        "val_acc": val_acc,
        "model_name": model.pretrained_cfg["architecture"]
    }, MODEL_FILE)

