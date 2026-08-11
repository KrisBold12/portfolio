from torchvision import transforms
from torchvision.transforms import InterpolationMode 

INTERPOLATION = {
      "bilinear": InterpolationMode.BILINEAR,
      "bicubic":  InterpolationMode.BICUBIC,
  }

def train_transforms(cfg):
    size = cfg["input_size"][1] # 224

    return transforms.Compose([
        transforms.RandomResizedCrop(size, interpolation=INTERPOLATION[cfg["interpolation"]]),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(cfg["mean"], cfg["std"])
    ])

def val_test_transforms(cfg):
    size = cfg["input_size"][1]
    resize = int(size / cfg["crop_pct"])
    return transforms.Compose([
        transforms.Resize(resize, interpolation=INTERPOLATION[cfg["interpolation"]]),
        transforms.CenterCrop(size),
        transforms.ToTensor(),
        transforms.Normalize(cfg["mean"], cfg["std"])
    ])
