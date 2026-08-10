from torch.utils.data import Dataset
from dog_breed.data.splits import load_split
from PIL import Image
from dog_breed.paths import BREEDS_DIR

class DogBreedDataset(Dataset):
    def __init__(self, split_name, transform=None):
        self.split_name = split_name
        self.transform = transform
        self.data = load_split(split_name)

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        path, label = self.data[idx]
        with Image.open(BREEDS_DIR / path) as img:
            img = img.convert("RGB")
            if self.transform:
                img = self.transform(img)
        return img, label

def test():
    for s in ['train', 'val', 'test']:
      d = DogBreedDataset(s)
      img, label = d[0]
      last_img, last_label = d[len(d) - 1]
      print(f'{s:6} len={len(d):6}  primo: {img.size} {img.mode} label={label}   ultimo: {last_img.size} label={last_label}')

def main():
    test()

if __name__ == "__main__":
    main()
    