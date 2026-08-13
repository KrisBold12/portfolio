"""The exported metadata must be enough to serve the model without timm.

The serving project is independent: no timm, no torch, no split CSV — the
container has to stay under 500 MB. Everything it needs to turn a photo into
a breed name therefore travels in the JSON written next to the ONNX file.

So these tests do not check that the file has the right shape; they rebuild
the preprocessing from the JSON alone and assert it produces tensors
identical to the ones the model was evaluated with. If the two ever diverge,
accuracy drops in production with nothing raised anywhere.

Marked `export` and skipped when the artifacts are absent, since they are
git-ignored and only exist after running dog_breed.export.
"""

import json

import pytest
import timm
import torch
from PIL import Image
from torchvision import transforms

from dog_breed.data.splits import LABEL_SIZE, class_names
from dog_breed.data.transforms import INTERPOLATION, val_test_transforms
from dog_breed.paths import BREEDS_DIR, model_meta_file, onnx_file

EXPERIMENT = "convnext_t_probe"
META_FILE = model_meta_file(EXPERIMENT)

pytestmark = [
    pytest.mark.export,
    pytest.mark.skipif(
        not META_FILE.exists(),
        reason=f"{META_FILE.name} not exported; run dog_breed.export {EXPERIMENT}",
    ),
]


@pytest.fixture(scope="module")
def meta() -> dict:
    with open(META_FILE, encoding="utf-8") as f:
        return json.load(f)


def transforms_from_meta(meta: dict):
    """Rebuild the eval preprocessing using only what the JSON carries.

    Deliberately written the way the serving code will have to write it:
    no pretrained_cfg, no timm, just the fields in the file.
    """
    size = meta["input_size"][1]
    resize = int(size / meta["crop_pct"])
    interpolation = INTERPOLATION[meta["interpolation"]]

    return transforms.Compose([
        transforms.Resize(resize, interpolation=interpolation),
        transforms.CenterCrop(size),
        transforms.ToTensor(),
        transforms.Normalize(meta["mean"], meta["std"]),
    ])


def training_cfg(meta: dict) -> dict:
    """The preprocessing config as timm defines it, straight from the source.

    Not derived from the metadata under test: comparing the file against
    itself would pass no matter what it contains.
    """
    cfg = timm.get_pretrained_cfg(f"{meta['model_name']}.{meta['tag']}")
    return cfg.to_dict() if hasattr(cfg, "to_dict") else vars(cfg)


def test_carries_every_field_the_server_needs(meta):
    required = {"experiment", "model_name", "tag", "input_size", "crop_pct",
                "interpolation", "mean", "std", "classes"}
    assert required <= set(meta), f"missing from the metadata: {required - set(meta)}"


def test_values_match_the_pretrained_config(meta):
    """Every preprocessing field must equal what training actually used."""
    cfg = training_cfg(meta)

    assert meta["input_size"] == list(cfg["input_size"])
    assert meta["crop_pct"] == cfg["crop_pct"]
    assert meta["interpolation"] == cfg["interpolation"]
    assert meta["mean"] == list(cfg["mean"])
    assert meta["std"] == list(cfg["std"])


@pytest.mark.dataset
@pytest.mark.skipif(not BREEDS_DIR.exists(), reason="dataset not extracted")
def test_preprocessing_produces_identical_tensors(meta):
    """Comparing the composed objects is not enough — compare the output.

    Aspect ratios differ across the dataset, and Resize(int) preserves them,
    so a handful of real photos exercises more of the pipeline than one
    synthetic square would.
    """
    from_meta = transforms_from_meta(meta)
    from_cfg = val_test_transforms(training_cfg(meta))

    paths = sorted(BREEDS_DIR.rglob("*.jpg"))[:20]
    assert paths, "no images found to compare on"

    for path in paths:
        with Image.open(path) as img:
            rgb = img.convert("RGB")
            assert torch.equal(from_meta(rgb), from_cfg(rgb)), f"tensors differ on {path.name}"


def test_class_list_matches_the_split(meta):
    """The ids are the training labels, in label order."""
    ids = [entry["id"] for entry in meta["classes"]]

    assert len(ids) == LABEL_SIZE
    assert ids == class_names()


def test_display_names_are_present_and_derived(meta):
    """`name` is what the frontend shows; `id` stays the stable key."""
    for entry in meta["classes"]:
        assert entry["name"], f"empty display name for {entry['id']}"
        assert "_" not in entry["name"], f"underscore left in {entry['name']}"
        assert entry["name"].lower().replace(" ", "_") == entry["id"], (
            f"{entry['name']!r} does not correspond to {entry['id']!r}"
        )


def test_input_size_matches_the_exported_graph(meta):
    """A metadata file describing a different resolution than the ONNX it
    ships with would preprocess to a shape the model cannot accept."""
    onnxruntime = pytest.importorskip("onnxruntime")
    path = onnx_file(EXPERIMENT)
    if not path.exists():
        pytest.skip(f"{path.name} not exported")

    session = onnxruntime.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    _, channels, height, width = session.get_inputs()[0].shape

    assert [channels, height, width] == meta["input_size"]


def test_logit_count_matches_the_class_list(meta):
    """Off-by-one here means every prediction is a plausible wrong breed."""
    onnxruntime = pytest.importorskip("onnxruntime")
    path = onnx_file(EXPERIMENT)
    if not path.exists():
        pytest.skip(f"{path.name} not exported")

    session = onnxruntime.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    assert session.get_outputs()[0].shape[1] == len(meta["classes"])
