"""Invariants of the Stanford label -> ImageNet-1k class index mapping.

The mapping is derived mechanically: the folder prefix in the split CSV is a
WordNet ID, and ImageNetInfo lists the 1000 WNIDs in class-index order. Nothing
is hand-written, which is exactly why it needs testing — a slip in the parsing
produces a permutation rather than an exception, and a permuted mapping does
not crash, it lowers the zero-shot accuracy. That number is published in the
README as the baseline the trained models are judged against, so a silent shift
would move a headline figure with nothing to notice it.

These need only the committed split CSV and timm's bundled label list, so they
run in CI without either dataset on disk.
"""

import re

import pytest
from timm.data import ImageNetInfo

from dog_breed.data.splits import LABEL_SIZE, class_names
from dog_breed.zero_shot import imagenet_indices

# ImageNet-1k assigns class indices in WNID order, which puts every dog in one
# contiguous block. 151-268 are the 118 breeds, 273-275 are dingo, dhole and
# African hunting dog — not breeds, but Stanford counts them as such.
DOG_CLASS_RANGE = range(151, 276)

# The five classes inside that block that Stanford does not have. 269-272 are
# timber wolf, white wolf, red wolf and coyote, correctly absent from a dog
# dataset. 251 is `dalmatian`, which Stanford simply never included: 118 - 1 + 3
# is where the 120 comes from.
NOT_IN_STANFORD = {251, 269, 270, 271, 272}


@pytest.fixture(scope="module")
def indices() -> list[int]:
    """Stanford label -> ImageNet-1k class index, derived from the committed split."""
    return imagenet_indices()


def normalise(name: str) -> str:
    """Fold a breed name to bare lowercase words.

    Stanford writes `german_short-haired_pointer`, WordNet writes
    `German short-haired pointer`. Only the punctuation differs.
    """
    return re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()


def test_every_label_is_mapped(indices):
    """One index per label, and no hole left by a label the CSV never mentions."""
    assert len(indices) == LABEL_SIZE
    assert None not in indices


def test_no_two_breeds_share_an_imagenet_class(indices):
    """A duplicate would make one breed unreachable and cost accuracy in silence.

    The restricted logits are gathered by these indices, so two breeds pointing
    at the same column means the second can never win the argmax.
    """
    assert len(set(indices)) == LABEL_SIZE


def test_indices_are_exactly_the_stanford_dog_classes(indices):
    """The mapping must land on the dog block, minus the five Stanford omits.

    Anchored to an external fact rather than to its own shape: a WNID parsed
    from the wrong side of the hyphen, or off by a character, scatters the
    indices across the full 1000 and fails here even though the count and the
    uniqueness still hold.
    """
    assert set(indices) == set(DOG_CLASS_RANGE) - NOT_IN_STANFORD


def test_breed_names_agree_with_imagenet(indices):
    """Every Stanford folder name appears verbatim among the target's WordNet lemmas.

    This is the test that catches a permutation. The three above check that the
    mapping has the right shape and the right set of values; only this one checks
    that each individual label points at the breed it names. Swapping any two
    entries passes the others and fails here.
    """
    info = ImageNetInfo("imagenet-1k")

    mismatched = []
    for label, (breed, index) in enumerate(zip(class_names(), indices)):
        lemmas = [normalise(part) for part in info.index_to_description(index).split(",")]
        if normalise(breed) not in lemmas:
            mismatched.append(f"{label}: {breed!r} -> {info.index_to_description(index)!r}")

    assert not mismatched, "labels pointing at a different breed:\n" + "\n".join(mismatched)
