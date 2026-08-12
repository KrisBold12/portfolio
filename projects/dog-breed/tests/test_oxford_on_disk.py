"""Checks that need the extracted Oxford-IIIT Pet data on disk.

They pin the numbers the cross-evaluation was measured against: if the
annotation file, the mapping table, or the sample builder change, the
published 83.34% no longer refers to the same 4178 images.

Marked `dataset` and skipped when Oxford is absent, so CI and a fresh clone
stay green without the 810 MB download.
"""

import pytest

from dog_breed.data.oxford import (
    CAT_SPECIES,
    DOG_SPECIES,
    UNMAPPED_BREEDS,
    dog_breeds,
    load_oxford_list,
    mapped_dog_samples,
    stanford_breed,
)
from dog_breed.paths import OXFORD_LIST_FILE, OXFORD_PHOTOS_DIR

EXPECTED_ROWS = 7349
EXPECTED_DOGS = 4978
EXPECTED_CATS = 2371
EXPECTED_OXFORD_BREEDS = 25
EXPECTED_MAPPED_BREEDS = 21
EXPECTED_MAPPED_SAMPLES = 4178

pytestmark = [
    pytest.mark.dataset,
    pytest.mark.skipif(
        not OXFORD_LIST_FILE.exists(),
        reason=(
            "Oxford-IIIT Pet not extracted; run dog_breed.data.download "
            "then dog_breed.data.extract"
        ),
    ),
]


@pytest.fixture(scope="module")
def oxford_rows() -> list[tuple[str, int]]:
    return load_oxford_list()


def test_annotation_list_row_count(oxford_rows):
    """7390 images ship, but only these are annotated. list.txt is the authority."""
    assert len(oxford_rows) == EXPECTED_ROWS


def test_species_split(oxford_rows):
    counts = {
        DOG_SPECIES: sum(1 for _, s in oxford_rows if s == DOG_SPECIES),
        CAT_SPECIES: sum(1 for _, s in oxford_rows if s == CAT_SPECIES),
    }
    assert counts == {DOG_SPECIES: EXPECTED_DOGS, CAT_SPECIES: EXPECTED_CATS}
    assert sum(counts.values()) == len(oxford_rows), "an unknown species appeared"


def test_breed_names_parse_cleanly(oxford_rows):
    """`rsplit("_", 1)` must strip the trailing number, not split the name."""
    breeds = dog_breeds(oxford_rows)
    assert len(breeds) == EXPECTED_OXFORD_BREEDS
    truncated = [b for b in breeds if b[-1].isdigit()]
    assert not truncated, f"breed names still carrying their index: {truncated}"


def test_every_oxford_breed_is_accounted_for(oxford_rows, stanford_index):
    """No breed may fall through the table by accident.

    Each of the 25 is either excluded on purpose, renamed by an alias, or
    named identically in Stanford. A typo lands here instead of silently
    shrinking the evaluation set.
    """
    unaccounted = []
    for breed in dog_breeds(oxford_rows):
        target = stanford_breed(breed)
        if target is None:
            continue
        if target not in stanford_index:
            unaccounted.append(breed)

    assert not unaccounted, (
        f"Oxford breeds with no Stanford counterpart and no explicit exclusion: "
        f"{unaccounted}"
    )


def test_mapped_sample_count():
    """The exact evaluation set behind the published cross-eval number."""
    samples = mapped_dog_samples()
    assert len(samples) == EXPECTED_MAPPED_SAMPLES
    assert len({label for _, label in samples}) == EXPECTED_MAPPED_BREEDS


def test_unmapped_breeds_never_reach_the_evaluation_set():
    """The four excluded breeds must contribute no image at all."""
    leaked = [
        name
        for name, _ in mapped_dog_samples()
        if name.removesuffix(".jpg").rsplit("_", 1)[0] in UNMAPPED_BREEDS
    ]
    assert not leaked, f"{len(leaked)} images from excluded breeds, e.g. {leaked[:3]}"


def test_every_mapped_sample_exists_on_disk():
    """Catches a wrong root or a missing .jpg suffix in the path composition."""
    missing = [
        name
        for name, _ in mapped_dog_samples()
        if not (OXFORD_PHOTOS_DIR / name).is_file()
    ]
    assert not missing, f"{len(missing)} missing images, e.g. {missing[:3]}"
