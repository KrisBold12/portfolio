import scipy.io as sio
from pathlib import Path
from sklearn.model_selection import train_test_split
import csv
from dog_breed.paths import LISTS_DIR, BREEDS_DIR, SPLIT_DIR


TRAIN_DATA_SIZE = 12000
TEST_DATA_SIZE = 8580
LABEL_SIZE = 120
EXAMPLES_PER_CLASS_TRAIN = 85
EXAMPLES_PER_CLASS_VAL = 15

RANDOM_SEED = 42 


def load_mat_file(file_path: Path) -> dict:
    """
    Load a .mat file and return its contents as a dictionary.

    Args:
        file_path (str or Path): The path to the .mat file.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"The file {file_path} does not exist.")

    try:
        data = sio.loadmat(file_path)
        return data
    except Exception as e:
        raise RuntimeError(f"Failed to load .mat file {file_path}: {e}") from e


def convert_mat_to_list(mat_data) -> list:
    """
    Convert the loaded .mat data to a more Python-friendly list format.

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

def save_split_to_file(train_split: list, val_split: list, test_split: list, output_file_name: str) -> None:
    """
    Save the split data to a text file.

    Args:
        train_split (list): List of tuples containing (file_name, label) for training data.
        val_split (list): List of tuples containing (file_name, label) for validation data.
        test_split (list): List of tuples containing (file_name, label) for testing data.
        output_file_name (str): The name of the output csv file.
    """

    SPLIT_DIR.mkdir(parents=True, exist_ok=True)
    file_path = SPLIT_DIR / output_file_name

    data_list = [(file_name, label, 'train') for file_name, label in train_split] + \
                [(file_name, label, 'val') for file_name, label in val_split] + \
                [(file_name, label, 'test') for file_name, label in test_split]
    data_list.sort()

    with open(file_path, 'w', newline='', encoding="utf-8") as f:
        print(f"Saving data splits to {file_path}...")
        csv_writer = csv.writer(f, delimiter=';')
        csv_writer.writerow(['file_name', 'label', 'split'])  # Write header
        for row in data_list:
            csv_writer.writerow(row)

    print(f"Data splits saved to {file_path} successfully.")

def main() -> None:
    train_data_path = LISTS_DIR / "train_list.mat"
    test_data_path = LISTS_DIR / "test_list.mat"

    train_mat_data = load_mat_file(train_data_path)
    test_mat_data = load_mat_file(test_data_path)

    train_data = convert_mat_to_list(train_mat_data)
    test_data = convert_mat_to_list(test_mat_data)

    # Check if the number of samples matches the expected sizes
    if len(train_data) != TRAIN_DATA_SIZE:
        raise ValueError(f"Expected {TRAIN_DATA_SIZE} training samples, but found {len(train_data)}.")
    if len(test_data) != TEST_DATA_SIZE:
        raise ValueError(f"Expected {TEST_DATA_SIZE} testing samples, but found {len(test_data)}.")

    # Check if the labels are in the expected range and unique
    labels = {label for _, label in train_data + test_data}
    if len(labels) != LABEL_SIZE:
        raise ValueError(f"Expected {LABEL_SIZE} unique labels, but found {len(labels)}.")
    if min(labels) != 0 or max(labels) != LABEL_SIZE - 1:
        raise ValueError(f"Labels should be in the range [0, {LABEL_SIZE - 1}], but found range [{min(labels)}, {max(labels)}].")

    # Check if there is no overlap between training and testing data
    train_files = {file for file, _ in train_data}
    test_files = {file for file, _ in test_data}
    if train_files.intersection(test_files):
        raise ValueError("There is an overlap between training and testing data files.")

    # Check if all files exist in the BREEDS_DIR
    for file, _ in train_data + test_data:
        if not (BREEDS_DIR / file).exists():
            raise FileNotFoundError(f"The file {file} does not exist in the BREEDS_DIR.")
    
    # Split training data into training and validation set
    val_size = 0.15  # 15% for validation
    train_samples, val_samples = train_test_split(train_data, test_size=val_size, stratify=[label for _, label in train_data], random_state=RANDOM_SEED)

    # Check if the split sizes are correct
    expected_train_size = int((1 - val_size) * TRAIN_DATA_SIZE)
    if len(train_samples) != expected_train_size:
        raise ValueError(f"Expected {expected_train_size} training samples after split, but found {len(train_samples)}.")
    expected_val_size = int(val_size * TRAIN_DATA_SIZE)
    if len(val_samples) != expected_val_size:
        raise ValueError(f"Expected {expected_val_size} validation samples, but found {len(val_samples)}.")

    # Check if there is no overlap between training and validation data
    train_files_split = {file for file, _ in train_samples}
    val_files_split = {file for file, _ in val_samples}
    if train_files_split.intersection(val_files_split):
        raise ValueError("There is an overlap between training and validation data files.")

    # Check if the label distribution is maintained in the split, 85 images per class for training set
    train_label_counts = {label: 0 for label in range(LABEL_SIZE)}
    for _, label in train_samples:
        train_label_counts[label] += 1
    for label, count in train_label_counts.items():
        if count != EXAMPLES_PER_CLASS_TRAIN:
            raise ValueError(f"Expected {EXAMPLES_PER_CLASS_TRAIN} samples for class {label} in training set, but found {count}.")

    # Check if each class has the expected number of samples in the validation set
    val_label_counts = {label: 0 for label in range(LABEL_SIZE)}
    for _, label in val_samples:
        val_label_counts[label] += 1

    for label, count in val_label_counts.items():
        if count != EXAMPLES_PER_CLASS_VAL:
            raise ValueError(f"Expected {EXAMPLES_PER_CLASS_VAL} samples for class {label} in validation set, but found {count}.")

    # Save the splits to a file
    save_split_to_file(train_samples, val_samples, test_data, "data_splits.csv")


if __name__ == "__main__":
    main()