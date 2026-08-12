"""Invariants of the Oxford -> Stanford breed mapping.

The mapping table is hand-written domain knowledge: no algorithm can derive
that `japanese_chin` and `japanese_spaniel` are the same breed. What can be
checked automatically is that every entry still refers to something real —
a typo in an alias would silently drop a breed from the cross-evaluation and
quietly move the published accuracy.

These need only the committed split CSV, so they run in CI without either
dataset. The checks that require Oxford on disk live in test_oxford_on_disk.py.
"""

from dog_breed.data.oxford import (
    BREED_ALIASES,
    UNMAPPED_BREEDS,
    stanford_breed,
)
from dog_breed.data.splits import LABEL_SIZE

# Alias targets that exercise the two parsing bugs this module guards against:
# splitting the folder name on the first hyphen, and forgetting to lowercase it.
HYPHENATED_BREEDS = (
    "german_short-haired_pointer",
    "soft-coated_wheaten_terrier",
)


def test_stanford_index_covers_every_label(stanford_index):
    """One name per label, and the labels are exactly 0..119."""
    assert len(stanford_index) == LABEL_SIZE
    assert sorted(stanford_index.values()) == list(range(LABEL_SIZE))


def test_stanford_index_names_are_lowercase(stanford_index):
    """Folders are `nXXXXXXX-Chihuahua`; Oxford breeds are lowercase.

    Without .lower() nothing matches and the cross-eval silently empties.
    """
    wrong = [name for name in stanford_index if name != name.lower()]
    assert not wrong, f"names still carrying capitals: {wrong[:5]}"


def test_stanford_index_keeps_hyphenated_names(stanford_index):
    """`split("-")[1]` would truncate these to `german` and `soft`.

    Both are alias targets, so the bug would drop two breeds from the
    cross-evaluation without raising anything.
    """
    missing = [name for name in HYPHENATED_BREEDS if name not in stanford_index]
    assert not missing, f"truncated breed names: {missing}"


def test_every_alias_target_exists_in_stanford(stanford_index):
    """A typo on the right-hand side of the table must fail here."""
    unknown = {
        oxford: stanford
        for oxford, stanford in BREED_ALIASES.items()
        if stanford not in stanford_index
    }
    assert not unknown, f"aliases pointing at non-existent breeds: {unknown}"


def test_no_alias_is_an_identity():
    """An alias to the same name is dead weight: identity is already the default."""
    redundant = [k for k, v in BREED_ALIASES.items() if k == v]
    assert not redundant, f"aliases that change nothing: {redundant}"


def test_aliased_and_unmapped_do_not_overlap():
    """A breed cannot be both translated and excluded."""
    overlap = set(BREED_ALIASES) & set(UNMAPPED_BREEDS)
    assert not overlap, f"breeds both aliased and unmapped: {overlap}"


def test_unmapped_breeds_are_not_stanford_names(stanford_index):
    """If one of these exists in Stanford, excluding it throws away real data."""
    present = [breed for breed in UNMAPPED_BREEDS if breed in stanford_index]
    assert not present, f"excluded breeds that Stanford actually has: {present}"


def test_stanford_breed_excludes_only_the_unmapped():
    """None means 'no Stanford equivalent' — nothing else may produce it."""
    for breed in UNMAPPED_BREEDS:
        assert stanford_breed(breed) is None

    for oxford, stanford in BREED_ALIASES.items():
        assert stanford_breed(oxford) == stanford


def test_stanford_breed_passes_identical_names_through():
    """The 13 breeds named the same in both datasets are handled implicitly."""
    assert stanford_breed("beagle") == "beagle"
    assert stanford_breed("saint_bernard") == "saint_bernard"
