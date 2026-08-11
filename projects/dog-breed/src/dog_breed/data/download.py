from pathlib import Path
import requests
from dog_breed.paths import RAW_DIR, OXFORD_RAW_DIR
from tqdm import tqdm

STANFORD_BASE_URL = "http://vision.stanford.edu/aditya86/ImageNetDogs/"
OXFORD_BASE_URL   = "https://thor.robots.ox.ac.uk/~vgg/data/pets/"

DATASETS = (
    (STANFORD_BASE_URL, ("images.tar", "lists.tar"), RAW_DIR),
    (OXFORD_BASE_URL,   ("images.tar.gz", "annotations.tar.gz"), OXFORD_RAW_DIR),
)


def download_file(url: str, dest_path: Path) -> None:
    if dest_path.exists():
        print(f"File already exists at {dest_path}. Skipping download.")
    else:
        print(f"Downloading data to {dest_path}...")
        response = requests.get(url, stream=True, timeout=20)
        response.raise_for_status()
        total = int(response.headers.get("Content-Length", 0))
        temp_file_path = dest_path.with_name(dest_path.name + ".part")
        with open(temp_file_path, "wb") as f:
            with tqdm(total=total, unit="B", unit_scale=True) as bar:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
                    bar.update(len(chunk))
        temp_file_path.rename(dest_path)
        print("Download complete.")
        

def main() -> None:
    for base_url, file_names, dest_dir in DATASETS:
        dest_dir.mkdir(parents=True, exist_ok=True)
        for file_name in file_names:
            download_file(base_url + file_name, dest_dir / file_name)


if __name__ == "__main__":
    main()