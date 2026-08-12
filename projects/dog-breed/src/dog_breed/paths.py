from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
DATASET_DIR = DATA_DIR / "stanford_dogs"
RAW_DIR = DATASET_DIR / "raw"
IMAGES_DIR = DATASET_DIR / "images"
LISTS_DIR = DATASET_DIR / "lists"
BREEDS_DIR = IMAGES_DIR / "Images"
SPLIT_DIR = PROJECT_ROOT / "splits"
SPLIT_FILE = SPLIT_DIR / "data_splits.csv"

MODEL_DIR = PROJECT_ROOT / "artifacts"
MODEL_FILE = MODEL_DIR / "best_model.pt"

REPORTS_DIR = PROJECT_ROOT / "reports"
METRICS_FILE = REPORTS_DIR / "training_metrics.csv"
PLOT_FILE = REPORTS_DIR / "training_metrics.png"
EVAL_FILE = REPORTS_DIR / "evaluation.csv"

OXFORD_DIR = DATA_DIR / "oxford_pet"
OXFORD_RAW_DIR = OXFORD_DIR / "raw"
OXFORD_IMAGES_DIR = OXFORD_DIR / "images"
OXFORD_ANNOTATIONS_DIR = OXFORD_DIR / "annotations"
OXFORD_PHOTOS_DIR = OXFORD_IMAGES_DIR / "images"
OXFORD_LIST_FILE  = OXFORD_ANNOTATIONS_DIR / "annotations" / "list.txt"