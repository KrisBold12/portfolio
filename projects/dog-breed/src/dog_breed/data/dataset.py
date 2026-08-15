from torch.utils.data import Dataset
from dog_breed.data.splits import load_split
from PIL import Image
from dog_breed.paths import BREEDS_DIR, OXFORD_PHOTOS_DIR
from dog_breed.data.oxford import mapped_dog_samples, cat_samples


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


def oxford_cat_dataset(transform=None):
    return DogBreedDataset(cat_samples(), OXFORD_PHOTOS_DIR, transform)


def test_evaluations(transform=None) -> tuple[tuple[str, DogBreedDataset], ...]:
    """The three test sets every model is scored on, and their published names.

    Three and not two: Stanford's test split covers 120 breeds while Oxford
    only shares 21, so comparing them directly would blend the different photo
    source with the fact that those 21 breeds may be easier than average. The
    middle entry isolates the first.

    Defined once because the names are join keys. evaluate.py and zero_shot.py
    write them into separate CSVs that the README puts side by side, and two
    hand-copied spellings would drift without anything failing.
    """
    mapped_labels = {label for _, label in mapped_dog_samples()}
    return (
        ("Stanford test (120 breeds)", stanford_dataset("test", transform)),
        ("Stanford test (21 breeds)", stanford_dataset("test", transform, keep_labels=mapped_labels)),
        ("Oxford dogs (21 breeds)", oxford_dataset(transform)),
    )
