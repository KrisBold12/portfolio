from dog_breed.paths import MODEL_FILE, REPORTS_DIR,EVAL_FILE
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from dog_breed.model import create_model
from dog_breed.data.splits import LABEL_SIZE
from dog_breed.data.dataset import stanford_dataset, oxford_dataset
from dog_breed.data.transforms import val_test_transforms
from dog_breed.train import evaluation
from dog_breed.data.oxford import mapped_dog_samples
import csv

BATCH_SIZE = 32

def load_trained_model(device: str) -> tuple[nn.Module, dict]:
    ckpt = torch.load(MODEL_FILE, map_location=device)
    model = create_model(model_name=ckpt['model_name'], num_classes=LABEL_SIZE, freeze_backbone=False, pretrained=False)
    model.load_state_dict(ckpt['state_dict'])
    return model.to(device), ckpt


def run_eval(model, dataset, device):
    loader = DataLoader(dataset=dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=4)
    return evaluation(model=model, loader=loader, loss_fn=nn.CrossEntropyLoss(), device=device)


def main():
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model, ckpt = load_trained_model(device)
    cfg = model.pretrained_cfg
    tf = val_test_transforms(cfg)

    mapped_labels = {label for _, label in mapped_dog_samples()}
    evaluations = (
        ("Stanford test (120 breeds)", stanford_dataset("test", tf)),
        ("Stanford test (21 breeds)", stanford_dataset("test", tf, keep_labels=mapped_labels)),
        ("Oxford dogs (21 breeds)", oxford_dataset(tf)),
    )

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(EVAL_FILE, 'w', encoding='utf-8', newline='') as f:
        print(f"Creating reports dir: {REPORTS_DIR}")
        csv.writer(f).writerow(['model_name', 'epoch', 'evaluation', 'num_images', 'loss', 'acc'])

    print(f"Running {len(evaluations)} evaluations...")
    for eval_name, dataset in evaluations:
        loss, acc = run_eval(model=model, dataset=dataset, device=device)
        print(f"Evaluation name: {eval_name} | Number of images: {len(dataset)} | Loss: {loss:.4f} | Acc: {acc * 100:.2f}%")

        with open(EVAL_FILE, 'a', encoding='utf-8', newline='') as f:
            print(f"Saving eval on: {EVAL_FILE}")
            csv.writer(f).writerow([ckpt['model_name'], ckpt['epoch'], eval_name, len(dataset), loss, acc])


if __name__ == "__main__":
    main()