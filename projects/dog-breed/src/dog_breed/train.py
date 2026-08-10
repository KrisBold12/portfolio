import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm
from dog_breed.data.dataset import DogBreedDataset
from dog_breed.data.transforms import train_transforms, val_test_transforms
from dog_breed.model import create_model, save_model


BATCH_SIZE = 32


def accuracy(y_pred, y_true):
    return (y_pred == y_true).sum().item() / len(y_pred)


def train_one_epoch(model: torch.nn.Module, loader: DataLoader, loss_fn, optimizer, device):
    model.train()
    total_loss = 0
    total_acc = 0
    for images, labels in tqdm(loader, desc="Training one epoch..."):
        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)

        loss = loss_fn(outputs, labels)
        total_loss += loss.item()

        y_preds = outputs.argmax(dim=1)
        total_acc += accuracy(y_pred=y_preds, y_true=labels)

        loss.backward()
        optimizer.step()


    return total_loss / len(loader), total_acc / len(loader)


def evaluation(model: torch.nn.Module, loader: DataLoader, loss_fn, device):
    model.eval()
    with torch.inference_mode():
        total_loss = 0
        total_acc = 0
        for images, labels in tqdm(loader, desc="Evaluating the model..."):
            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)

            loss = loss_fn(outputs, labels)
            total_loss += loss.item()

            y_preds = outputs.argmax(dim=1)
            total_acc += accuracy(y_pred=y_preds, y_true=labels)   

    return total_loss / len(loader), total_acc / len(loader)


def main():
    device = 'cuda' if torch.cuda.is_available() else 'cpu'

    train_ds = DogBreedDataset("train", transform=train_transforms())
    val_ds = DogBreedDataset("val", transform=val_test_transforms())

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=4, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=4, pin_memory=True)

    model = create_model().to(device)
    loss_fn = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.get_classifier().parameters(), lr=0.001)

    best_acc = 0
    epochs = 15
    for epoch in tqdm(range(epochs), desc="Training..."):
        train_loss, train_acc = train_one_epoch(model=model, loader=train_loader, loss_fn=loss_fn, optimizer=optimizer, device=device)
        val_loss, val_acc = evaluation(model=model, loader=val_loader, loss_fn=loss_fn, device=device)

        if val_acc > best_acc: 
            best_acc = val_acc
            save_model(model=model, epoch=epoch, val_acc=val_acc)


        print(f"Epoch: {epoch} | Train loss: {train_loss}, Train acc: {train_acc} | Val loss: {val_loss}, Val acc: {val_acc}")

    print(f"Training done, best validation accuracy achieved: {best_acc}")


if __name__ == "__main__":
    main()

