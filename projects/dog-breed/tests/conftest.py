"""Shared fixtures.

The committed split CSV is the artifact under test: it fully describes the
partition, so most invariants can be checked without the 750 MB of images.
"""

import csv

import pytest

from dog_breed.data.splits import CSV_DELIMITER
from dog_breed.paths import SPLIT_FILE


@pytest.fixture(scope="session")
def split_rows() -> list[tuple[str, int, str]]:
    """Every row of the committed split file, as (path, label, split)."""
    assert SPLIT_FILE.exists(), (
        f"{SPLIT_FILE} is missing. It is a committed artifact — regenerate it "
        f"with: uv run python -m dog_breed.data.splits"
    )

    with open(SPLIT_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=CSV_DELIMITER)
        return [
            (row["file_name"], int(row["label"]), row["split"]) for row in reader
        ]
