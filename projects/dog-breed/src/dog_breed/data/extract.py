from pathlib import Path
import tarfile
from dog_breed.paths import RAW_DIR, IMAGES_DIR, LISTS_DIR, BREEDS_DIR, OXFORD_RAW_DIR, OXFORD_IMAGES_DIR, OXFORD_ANNOTATIONS_DIR, OXFORD_PHOTOS_DIR, OXFORD_LIST_FILE


EXPECTED_BREEDS = 120
EXPECTED_IMAGES = 20580
OXFORD_EXPECTED_IMAGES = 7390

EXTRACTIONS = (
    (RAW_DIR, {"images.tar": IMAGES_DIR, "lists.tar": LISTS_DIR}),
    (OXFORD_RAW_DIR, {"images.tar.gz": OXFORD_IMAGES_DIR,
                    "annotations.tar.gz": OXFORD_ANNOTATIONS_DIR}),
)


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


def verify_stanford() -> None:
    actual_breeds = len([d for d in BREEDS_DIR.iterdir() if d.is_dir()])
    if actual_breeds != EXPECTED_BREEDS:
        raise ValueError(f"Expected {EXPECTED_BREEDS} breeds, but found {actual_breeds}.")

    actual_images = sum(len(list(d.glob("*.jpg"))) for d in BREEDS_DIR.iterdir() if d.is_dir())
    if actual_images != EXPECTED_IMAGES:
        raise ValueError(f"Expected {EXPECTED_IMAGES} images, but found {actual_images}.")


def verify_oxford() -> None:
    actual_images = len(list(OXFORD_PHOTOS_DIR.glob("*.jpg")))
    if actual_images != OXFORD_EXPECTED_IMAGES:
        raise ValueError(f"Expected {OXFORD_EXPECTED_IMAGES} images, but found {actual_images}.")
    if not OXFORD_LIST_FILE.exists():
        raise FileNotFoundError(f"Could not find the list file for Oxford's dataset in {OXFORD_LIST_FILE}")


def main() -> None:
    for raw_dir, tar_files in EXTRACTIONS:
        for key in tar_files:
            tar_path = raw_dir / key
            extract_to = tar_files[key]
            extract_to.parent.mkdir(parents=True, exist_ok=True)
            extract_tar_file(tar_path, extract_to)

    verify_stanford()
    verify_oxford()


if __name__ == "__main__":
    main()