import torch
from torch.utils.data import DataLoader

from tqdm import tqdm


def correct_predictions(y_pred, y_true):
    return (y_pred == y_true).sum().item()


def evaluation(model: torch.nn.Module, loader: DataLoader, loss_fn, device):
    model.to(device).eval()
    with torch.inference_mode():
        total_loss = 0
        total_correct = 0
        for images, labels in tqdm(loader, desc="Evaluating the model..."):
            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)

            loss = loss_fn(outputs, labels)
            total_loss += loss.item() * labels.size(0)

            y_preds = outputs.argmax(dim=1)
            total_correct += correct_predictions(y_pred=y_preds, y_true=labels)   

    return total_loss / len(loader.dataset), total_correct / len(loader.dataset)
