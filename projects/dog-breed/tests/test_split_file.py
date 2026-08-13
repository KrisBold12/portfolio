"""Invariants of the committed split file.

These run anywhere — CI included — because they only need the 1 MB CSV, not
the dataset. If one of them goes red, the split is no longer the one every
recorded metric was measured against.
"""

from collections import Counter

from dog_breed.data.splits import (
    CSV_HEADER,
    EXAMPLES_PER_CLASS_TRAIN,
    EXAMPLES_PER_CLASS_VAL,
    LABEL_SIZE,
    TEST_DATA_SIZE,
    TRAIN_DATA_SIZE,
    VAL_FRACTION,
    class_names,
)

EXPECTED_VAL_SIZE = int(TRAIN_DATA_SIZE * VAL_FRACTION)
EXPECTED_TRAIN_SIZE = TRAIN_DATA_SIZE - EXPECTED_VAL_SIZE
EXPECTED_TOTAL = TRAIN_DATA_SIZE + TEST_DATA_SIZE


def test_header_matches_the_writer(split_rows):
    """The reader in conftest keys off these names; a rename must break here."""
    assert CSV_HEADER == ["file_name", "label", "split"]


def test_covers_the_whole_dataset(split_rows):
    assert len(split_rows) == EXPECTED_TOTAL


def test_every_image_appears_exactly_once(split_rows):
    """The partition property: this alone proves the three splits are disjoint."""
    paths = [path for path, _, _ in split_rows]
    duplicates = [path for path, n in Counter(paths).items() if n > 1]
    assert not duplicates, f"{len(duplicates)} duplicated paths, e.g. {duplicates[:3]}"


def test_split_sizes(split_rows):
    counts = Counter(split for _, _, split in split_rows)
    assert counts == {
        "train": EXPECTED_TRAIN_SIZE,
        "val": EXPECTED_VAL_SIZE,
        "test": TEST_DATA_SIZE,
    }


def test_labels_are_zero_indexed(split_rows):
    labels = {label for _, label, _ in split_rows}
    assert len(labels) == LABEL_SIZE
    assert min(labels) == 0
    assert max(labels) == LABEL_SIZE - 1


def test_train_is_stratified(split_rows):
    """Every breed contributes the same number of training images."""
    counts = Counter(label for _, label, split in split_rows if split == "train")
    assert len(counts) == LABEL_SIZE
    off = {k: v for k, v in counts.items() if v != EXAMPLES_PER_CLASS_TRAIN}
    assert not off, f"breeds with the wrong training count: {off}"


def test_val_is_stratified(split_rows):
    """The check that actually proves `stratify=` was passed and took effect."""
    counts = Counter(label for _, label, split in split_rows if split == "val")
    assert len(counts) == LABEL_SIZE
    off = {k: v for k, v in counts.items() if v != EXAMPLES_PER_CLASS_VAL}
    assert not off, f"breeds with the wrong validation count: {off}"


def test_test_covers_every_breed(split_rows):
    """The official test split is not uniform per breed, but nothing is missing."""
    counts = Counter(label for _, label, split in split_rows if split == "test")
    assert len(counts) == LABEL_SIZE


def test_rows_are_sorted_by_path(split_rows):
    """Keeps regeneration diffs readable."""
    paths = [path for path, _, _ in split_rows]
    assert paths == sorted(paths)


def test_class_names_are_indexed_by_label(stanford_index):
    """Position in the list must equal the logit index. This is the mapping
    the served model.json ships, and the one thing that fails silently: a
    list shifted by one turns every prediction into a plausible wrong breed
    with nothing raised anywhere.
    """
    names = class_names()

    assert len(names) == LABEL_SIZE
    misplaced = {
        breed: (label, names[label])
        for breed, label in stanford_index.items()
        if names[label] != breed
    }
    assert not misplaced, f"breeds at the wrong index: {misplaced}"


def test_class_names_has_no_duplicates():
    """Two labels sharing a name would make one breed unreachable in the API."""
    names = class_names()
    assert len(set(names)) == len(names)


def test_label_matches_the_breed_folder(split_rows):
    """A path's parent folder determines its label, consistently everywhere."""
    by_folder = {}
    for path, label, _ in split_rows:
        folder = path.split("/")[0]
        by_folder.setdefault(folder, set()).add(label)

    inconsistent = {f: labels for f, labels in by_folder.items() if len(labels) > 1}
    assert not inconsistent, f"folders mapped to several labels: {inconsistent}"
    assert len(by_folder) == LABEL_SIZE
