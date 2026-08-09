"""Checks that need the extracted dataset on disk.

Marked `dataset` and skipped automatically when the images are absent, so a
fresh clone and CI stay green without downloading 750 MB.

Run only these:      uv run pytest -m dataset
Skip them locally:   uv run pytest -m "not dataset"
"""

import pytest

from dog_breed.data.splits import (
    LABEL_SIZE,
    TEST_DATA_SIZE,
    TRAIN_DATA_SIZE,
    build_splits,
)
from dog_breed.paths import BREEDS_DIR

pytestmark = [
    pytest.mark.dataset,
    pytest.mark.skipif(
        not BREEDS_DIR.exists(),
        reason=(
            "dataset not extracted; run dog_breed.data.download "
            "then dog_breed.data.extract"
        ),
    ),
]


def test_every_referenced_image_exists(split_rows):
    """Catches a wrong path composition, and any file lost in extraction."""
    missing = [path for path, _, _ in split_rows if not (BREEDS_DIR / path).is_file()]
    assert not missing, f"{len(missing)} missing images, e.g. {missing[:3]}"


def test_disk_holds_exactly_what_the_split_describes():
    """No extra images on disk that the split forgot about, and none missing."""
    on_disk = {
        f"{path.parent.name}/{path.name}" for path in BREEDS_DIR.rglob("*.jpg")
    }

    assert len(on_disk) == TRAIN_DATA_SIZE + TEST_DATA_SIZE


def test_breed_folders_match_the_expected_count():
    folders = [path for path in BREEDS_DIR.iterdir() if path.is_dir()]

    assert len(folders) == LABEL_SIZE


def test_regenerating_reproduces_the_committed_split(split_rows):
    """Determinism, checked end to end.

    Rebuilding from the .mat files must yield byte-for-byte the split that is
    committed. If this goes red, either the seed, the fraction, or a library
    version changed — and every metric recorded so far refers to a different
    partition than the one on disk.
    """
    train, val, test = build_splits()

    regenerated = sorted(
        [(path, label, "train") for path, label in train]
        + [(path, label, "val") for path, label in val]
        + [(path, label, "test") for path, label in test]
    )

    assert regenerated == split_rows
