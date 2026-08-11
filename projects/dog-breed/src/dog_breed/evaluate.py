from dog_breed.paths import MODEL_FILE
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from dog_breed.model import create_model
from dog_breed.data.splits import LABEL_SIZE
from dog_breed.data.dataset import DogBreedDataset
from dog_breed.data.transforms import val_test_transforms
from dog_breed.train import evaluation

BATCH_SIZE = 32

def load_trained_model(device: str) -> tuple[nn.Module, dict]:
    ckpt = torch.load(MODEL_FILE, map_location=device)
    model = create_model(model_name=ckpt['model_name'], num_classes=LABEL_SIZE, freeze_backbone=False, pretrained=False)
    model.load_state_dict(ckpt['state_dict'])
    return model.to(device), ckpt


def main():
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model, ckpt = load_trained_model(device)
    cfg = model.pretrained_cfg
    test_ds = DogBreedDataset(split_name='test', transform=val_test_transforms(cfg))
    loader = DataLoader(dataset=test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=4)
    loss, acc = evaluation(model=model, loader=loader, loss_fn=nn.CrossEntropyLoss(), device=device)
    print(f"Model checkpoint on epoch {ckpt['epoch']} | Loss on test set: {loss:.4f} | Accuracy on test set: {acc * 100:.2f}%")


if __name__ == "__main__":
    main()