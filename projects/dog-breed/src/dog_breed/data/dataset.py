from torch.utils.data import Dataset
from dog_breed.data.splits import load_split
from PIL import Image
from dog_breed.paths import BREEDS_DIR, OXFORD_PHOTOS_DIR
from dog_breed.data.oxford import mapped_dog_samples


class DogBreedDataset(Dataset):
    def __init__(self, samples, root, transform=None):
        self.samples = samples
        self.root = root
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        with Image.open(self.root / path) as img:
            img = img.convert("RGB")
            if self.transform:
                img = self.transform(img)
        return img, label
    

def stanford_dataset(split_name, transform=None, keep_labels=None):
    samples = load_split(split_name)
    if keep_labels is not None:
        samples = [(path, label) for path, label in samples if label in keep_labels]
    return DogBreedDataset(samples, BREEDS_DIR, transform)


def oxford_dataset(transform=None):
    return DogBreedDataset(mapped_dog_samples(), OXFORD_PHOTOS_DIR, transform)

