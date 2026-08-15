import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm
import csv
from dog_breed.data.dataset import stanford_dataset
from dog_breed.data.transforms import train_transforms, val_test_transforms
from dog_breed.model import create_model, save_model
import matplotlib.pyplot as plt
from dog_breed.paths import REPORTS_DIR, metrics_file, plot_file, model_file
from dog_breed.experiments import EXPERIMENTS, parse_experiment
from dog_breed.data.splits import RANDOM_SEED
from dog_breed.device import resolve_device
from dog_breed.metrics import correct_predictions, evaluation


BATCH_SIZE = 32



def train_one_epoch(model: torch.nn.Module, loader: DataLoader, loss_fn, optimizer, device):
    model.train()
    total_loss = 0
    total_correct = 0
    for images, labels in tqdm(loader, desc="Training one epoch..."):
        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)

        loss = loss_fn(outputs, labels)
        total_loss += loss.item() * labels.size(0)

        y_preds = outputs.argmax(dim=1)
        total_correct += correct_predictions(y_pred=y_preds, y_true=labels)

        loss.backward()
        optimizer.step()


    return total_loss / len(loader.dataset), total_correct / len(loader.dataset)


def main():
    torch.manual_seed(RANDOM_SEED)
    torch.cuda.manual_seed(RANDOM_SEED)

    name = parse_experiment(EXPERIMENTS)
    exp = EXPERIMENTS[name]

    # Device
    device = resolve_device()
    print(f"Selected device: {device}")

    # Model and config
    model = create_model(model_name=exp['model_name'], freeze_backbone=exp['freeze_backbone']).to(device)
    cfg = model.pretrained_cfg

    # Datasets
    train_ds = stanford_dataset("train", transform=train_transforms(cfg))
    val_ds = stanford_dataset("val", transform=val_test_transforms(cfg))

    # Dataloaders
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=4, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=4, pin_memory=True)

    loss_fn = nn.CrossEntropyLoss()
    params = model.get_classifier().parameters() if exp["freeze_backbone"] else model.parameters()
    optimizer = torch.optim.AdamW(params, lr=exp['lr'])

    epochs = exp['epochs']

    # Metrics
    best_acc = 0
    train_acc_history = []
    val_acc_history = []
    train_loss_history = []
    val_loss_history = []

    # Metrics file
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(metrics_file(name), 'w', encoding='utf-8', newline='') as f:
        csv.writer(f).writerow(['epoch', 'train_loss', 'train_acc', 'val_loss', 'val_acc'])

    # Training loop
    for epoch in tqdm(range(epochs), desc=f"Training {name} model..."):
        train_loss, train_acc = train_one_epoch(model=model, loader=train_loader, loss_fn=loss_fn, optimizer=optimizer, device=device)
        val_loss, val_acc = evaluation(model=model, loader=val_loader, loss_fn=loss_fn, device=device)

        # Update metrics history
        train_acc_history.append(train_acc)
        val_acc_history.append(val_acc)
        train_loss_history.append(train_loss)
        val_loss_history.append(val_loss)

        # Write metrics on metrics file
        with open(metrics_file(name), "a", encoding='utf-8', newline='') as f:
            csv.writer(f).writerow([epoch + 1, train_loss, train_acc, val_loss, val_acc])

        if val_acc > best_acc: 
            best_acc = val_acc
            save_model(model=model, epoch=epoch + 1, val_acc=val_acc, dest=model_file(name))


        print(f"Epoch: {epoch + 1} | Train loss: {train_loss:.4f}, Train acc: {train_acc * 100:.2f}% | Val loss: {val_loss:.4f}, Val acc: {val_acc * 100:.2f}%")

    print(f"Training done, best validation accuracy achieved: {best_acc}")

    # Plot
    epoch_range = range(1, epochs + 1)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    fig.suptitle(name)

    # Accuracy plot
    ax1.plot(epoch_range, train_acc_history, label="Train Accuracy", marker="o")
    ax1.plot(epoch_range, val_acc_history, label="Val Accuracy", marker="o")
    ax1.set_title("Accuracy per Epoca")
    ax1.set_xlabel("Epoca")
    ax1.set_ylabel("Accuracy")
    ax1.grid(True)
    ax1.legend()

    # Loss plot
    ax2.plot(epoch_range, train_loss_history, label="Train Loss", marker="o")
    ax2.plot(epoch_range, val_loss_history, label="Val Loss", marker="o")
    ax2.set_title("Loss per Epoca")
    ax2.set_xlabel("Epoca")
    ax2.set_ylabel("Loss")
    ax2.grid(True)
    ax2.legend()

    plt.tight_layout()

    # Save plot image
    plt.savefig(plot_file(name))


if __name__ == "__main__":
    main()

