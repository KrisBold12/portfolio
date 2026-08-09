from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
DATASET_DIR = DATA_DIR / "stanford_dogs"
IMAGES_DIR = DATASET_DIR / "images"
LISTS_DIR = DATASET_DIR / "lists"
BREEDS_DIR = IMAGES_DIR / "Images"
SPLIT_DIR = PROJECT_ROOT / "splits"
SPLIT_FILE = SPLIT_DIR / "data_splits.csv"
