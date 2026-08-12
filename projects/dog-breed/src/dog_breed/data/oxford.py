from dog_breed.paths import OXFORD_LIST_FILE
from dog_breed.paths import SPLIT_FILE
import csv


CAT_SPECIES = 1
DOG_SPECIES = 2

# Oxford breeds that exist in Stanford under a different name
BREED_ALIASES = {
    "basset_hound":               "basset",
    "leonberger":                 "leonberg",
    "japanese_chin":              "japanese_spaniel",
    "german_shorthaired":         "german_short-haired_pointer",
    "scottish_terrier":           "scotch_terrier",
    "staffordshire_bull_terrier": "staffordshire_bullterrier",
    "wheaten_terrier":            "soft-coated_wheaten_terrier",
    "english_cocker_spaniel":     "cocker_spaniel",
}

# Oxford breeds with no Stanford equivalent — excluded from the cross-eval,
# kept as in-distribution-dog negatives for the OOD gate
UNMAPPED_BREEDS = (
    "american_bulldog",
    "american_pit_bull_terrier",   # close to american_staffordshire_terrier, but a distinct breed
    "havanese",
    "shiba_inu",
)


def stanford_breed(oxford_breed: str) -> str | None:
    """
    Returns the corresponding oxford breed if it's mapped, 
    returns the passed breed otherwise.
    """
    if oxford_breed in UNMAPPED_BREEDS:
        return None
    return BREED_ALIASES.get(oxford_breed, oxford_breed)


def stanford_label_index() -> dict[str, int]:
    """
    Returns a dictionary with unique breeds and the
    corresponding labels for the stanford's dataset.
    """
    unique_label_index = {}
    with open(SPLIT_FILE, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter=';')
        next(reader)
        for file_dir, label,_ in reader:
            name = file_dir.split("/")[0].split("-", 1)[1].lower()
            idx = int(label)
            if name not in unique_label_index.keys():
                unique_label_index[name] = idx
    return unique_label_index
            


def load_oxford_list():
    """
    Returns a list of tuples with the image file name and the corresponding species.
    """
    rows = []
    with open(OXFORD_LIST_FILE, encoding='utf-8') as f:
        for row in f:
            row = row.strip()
            if not row or row.startswith('#'):
                continue
            fields = row.split()
            name = fields[0]
            species = int(fields[2])
            rows.append((name, species))
    return rows


def dog_breeds(rows):
    """
    Returns only unique dog breeds, excluding other species (e.g. cats).
    """
    unique_dog_breeds = set()
    for name, species in rows:
        if species != DOG_SPECIES:
            continue
        dog_breed = name.rsplit('_', 1)[0]
        unique_dog_breeds.add(dog_breed)
    return sorted(unique_dog_breeds)


def mapped_dog_samples() -> list[tuple[str, int]]:
    """
    Returns tuples of image_paths and the corresponding stanford labels
    """
    samples = []
    rows = load_oxford_list()
    label_index = stanford_label_index()
    for name, species in rows:
        if species != DOG_SPECIES:
            continue
        breed = name.rsplit('_', 1)[0]
        target = stanford_breed(breed)
        if target is None:
            continue
        samples.append((name + ".jpg", label_index[target]))
    return samples


def main():
    rows = load_oxford_list()
    num_of_dogs = sum(1 for _, species in rows if species == DOG_SPECIES)
    num_of_cats = sum(1 for _, species in rows if species == CAT_SPECIES)
    print(f"Total rows: {len(rows)} | total dogs: {num_of_dogs} | total cats: {num_of_cats}")
    unique_dog_breeds = dog_breeds(rows)
    print(f"Number of dog breeds: {len(unique_dog_breeds)}\n{unique_dog_breeds}")

    idx = stanford_label_index()
    print(f"Total number of breeds/labels: {len(idx)}")
    print(f"Is the total number of breeds/labels equal to 120?: {sorted(idx.values()) == list(range(120 ))}")

    samples = mapped_dog_samples()
    print(f"Number of samples: {len(samples)} | Number of unique breeds: {len({label for _, label in samples})}")


if __name__ == "__main__":
    main()
