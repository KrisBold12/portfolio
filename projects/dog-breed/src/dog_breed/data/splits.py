"""Build the three-way train/validation/test split of Stanford Dogs.

The dataset ships a two-way official split (12000 train / 8580 test) stored in
MATLAB .mat files. The test set must stay untouched until the very end, so the
validation set used for model selection is carved out of the official training
set, stratified by breed.

The result is a single CSV describing the complete partition, one row per
image. Running this module is deterministic: same code, same seed, same file.
If git reports a diff after a run, something meaningful changed.

The invariants this split must satisfy live in tests/, not here.
"""

import csv
from pathlib import Path

import scipy.io as sio
from sklearn.model_selection import train_test_split

from dog_breed.paths import LISTS_DIR, SPLIT_FILE

TRAIN_DATA_SIZE = 12000
TEST_DATA_SIZE = 8580
LABEL_SIZE = 120
EXAMPLES_PER_CLASS_TRAIN = 85
EXAMPLES_PER_CLASS_VAL = 15

VAL_FRACTION = 0.15
RANDOM_SEED = 42

CSV_DELIMITER = ";"
CSV_HEADER = ["file_name", "label", "split"]


def load_mat_file(file_path: Path) -> dict:
    """
    Load a .mat file and return its contents as a dictionary.

    Args:
        file_path (Path): The path to the .mat file.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"The file {file_path} does not exist.")

    try:
        data = sio.loadmat(file_path)
        return data
    except Exception as e:
        raise RuntimeError(f"Failed to load .mat file {file_path}: {e}") from e


def convert_mat_to_list(mat_data) -> list[tuple[str, int]]:
    """
    Convert the loaded .mat data to a list of (relative_path, label) pairs.

    MATLAB indexes classes from 1. Labels are shifted to 0-119 here, once, so
    that no other module has to know the data came from MATLAB.

    Args:
        mat_data (dict): The data loaded from the .mat file.
    """
    if not isinstance(mat_data, dict):
        raise ValueError("Input must be a dictionary returned by scipy.io.loadmat.")

    converted_data = []
    for i in range(len(mat_data['file_list'])):
        pair = (
            str(mat_data['file_list'][i][0][0]),
            int(mat_data['labels'][i][0]) - 1   # Adjusting label to be 0-indexed (1, 120) -> (0, 119)
            )
        converted_data.append(pair)

    return converted_data


def build_splits() -> tuple[list, list, list]:
    """
    Read the official lists and derive the three-way split.

    Returns:
        (train, val, test), each a list of (relative_path, label) pairs.
    """
    train_data = convert_mat_to_list(load_mat_file(LISTS_DIR / "train_list.mat"))
    test_data = convert_mat_to_list(load_mat_file(LISTS_DIR / "test_list.mat"))

    train_samples, val_samples = train_test_split(
        train_data,
        test_size=VAL_FRACTION,
        stratify=[label for _, label in train_data],
        random_state=RANDOM_SEED,
    )

    return train_samples, val_samples, test_data


def save_split_to_file(
    train_split: list,
    val_split: list,
    test_split: list,
    output_path: Path,
) -> None:
    """
    Write the complete partition to a CSV file.

    Rows are sorted by path: regenerating the file then produces a readable
    diff instead of 20580 reshuffled lines.

    Args:
        train_split (list): (relative_path, label) pairs for training.
        val_split (list): (relative_path, label) pairs for validation.
        test_split (list): (relative_path, label) pairs for testing.
        output_path (Path): Destination CSV file.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    data_list = [(path, label, 'train') for path, label in train_split] + \
                [(path, label, 'val') for path, label in val_split] + \
                [(path, label, 'test') for path, label in test_split]
    data_list.sort()

    with open(output_path, 'w', newline='', encoding="utf-8") as f:
        csv_writer = csv.writer(f, delimiter=CSV_DELIMITER)
        csv_writer.writerow(CSV_HEADER)
        csv_writer.writerows(data_list)


def main() -> None:
    train_samples, val_samples, test_samples = build_splits()
    save_split_to_file(train_samples, val_samples, test_samples, SPLIT_FILE)

    print(
        f"train {len(train_samples)}  "
        f"val {len(val_samples)}  "
        f"test {len(test_samples)}  ->  {SPLIT_FILE}"
    )


if __name__ == "__main__":
    main()
