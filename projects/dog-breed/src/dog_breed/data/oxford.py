from dog_breed.paths import OXFORD_LIST_FILE


CAT_SPECIES = 1
DOG_SPECIES = 2


def load_oxford_list():
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
    unique_dog_breeds = set()
    for name, species in rows:
        if species != DOG_SPECIES:
            continue
        dog_breed = name.rsplit('_', 1)[0]
        unique_dog_breeds.add(dog_breed)
    return sorted(unique_dog_breeds)


def main():
    rows = load_oxford_list()
    num_of_dogs = sum(1 for _, species in rows if species == DOG_SPECIES)
    num_of_cats = sum(1 for _, species in rows if species == CAT_SPECIES)
    print(f"Total rows: {len(rows)} | total dogs: {num_of_dogs} | total cats: {num_of_cats}")
    unique_dog_breeds = dog_breeds(rows)
    print(f"Number of dog breeds: {len(unique_dog_breeds)}\n{unique_dog_breeds}")


if __name__ == "__main__":
    main()