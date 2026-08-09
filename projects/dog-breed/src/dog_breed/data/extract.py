from pathlib import Path
import tarfile
from dog_breed.paths import RAW_DIR, DATASET_DIR, IMAGES_DIR, LISTS_DIR, BREEDS_DIR


EXPECTED_BREEDS = 120
EXPECTED_IMAGES = 20580


def extract_tar_file(tar_path: Path, extract_to: Path) -> None:
    if not tar_path.exists():
        raise FileNotFoundError(f"The tar file {tar_path} does not exist.")
    if extract_to.exists():
        print(f"The directory {extract_to} already exists. Skipping extraction.")
        return
    temp_dir = extract_to.with_name(extract_to.name + ".part")
    with tarfile.open(tar_path) as tar:
        tar.extractall(path=temp_dir, filter="data")
    temp_dir.rename(extract_to)


def verify_dataset() -> None:
    actual_breeds = len([d for d in BREEDS_DIR.iterdir() if d.is_dir()])
    if actual_breeds != EXPECTED_BREEDS:
        raise ValueError(f"Expected {EXPECTED_BREEDS} breeds, but found {actual_breeds}.")

    actual_images = sum(len(list(d.glob("*.jpg"))) for d in BREEDS_DIR.iterdir() if d.is_dir())
    if actual_images != EXPECTED_IMAGES:
        raise ValueError(f"Expected {EXPECTED_IMAGES} images, but found {actual_images}.")


def main() -> None:
    DATASET_DIR.mkdir(parents=True, exist_ok=True)

    tar_files = {
        "images.tar": IMAGES_DIR,
        "lists.tar": LISTS_DIR,
    }

    for tar_file, extract_to in tar_files.items():
        tar_path = RAW_DIR / tar_file
        extract_tar_file(tar_path, extract_to)

    verify_dataset()


if __name__ == "__main__":
    main()