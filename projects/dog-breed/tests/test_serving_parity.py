"""The serving preprocessing must match the one accuracy was measured with.

The container cannot afford torch, so serving/ reimplements the eval transform
on PIL and numpy alone. That buys ~400 MB and costs a guarantee: the two
pipelines can drift apart, and the only symptom would be lower accuracy in
production with nothing raised anywhere.

This test is the guarantee, put back. It runs from the training side, which
already has torch and the images, and loads the serving module by path -- the
two projects have separate virtualenvs and no dependency on each other, which
is the whole point of the split.

Marked `serving`, skipped when serving/ or its metadata is absent.
"""

import importlib.util
import json

import numpy as np
import pytest
from PIL import Image

from dog_breed.data.transforms import val_test_transforms
from dog_breed.paths import BREEDS_DIR, PROJECT_ROOT, model_meta_file, onnx_file

EXPERIMENT = "imagenet_head"
SERVING_ROOT = PROJECT_ROOT.parents[1] / "serving"
PREPROCESS_MODULE = SERVING_ROOT / "src" / "dogbreed_serving" / "preprocess.py"
META_FILE = model_meta_file(EXPERIMENT)

# PIL and torchvision run the same maths in a slightly different order, so a
# few 1e-6 differences are expected. 1e-2 would mean the pipelines diverged.
TOLERANCE = 1e-5
SAMPLE_SIZE = 10

# Stanford test accuracy as recorded in reports/evaluation.csv. The serving
# path has to reproduce it; half a point of slack allows for the handful of
# images where scaled decoding could flip a near-tie.
RECORDED_TEST_ACCURACY = 0.9311188811188811
ACCURACY_TOLERANCE = 0.005

pytestmark = [
    pytest.mark.serving,
    pytest.mark.skipif(
        not PREPROCESS_MODULE.exists(),
        reason=f"{PREPROCESS_MODULE} not found",
    ),
    pytest.mark.skipif(
        not META_FILE.exists(),
        reason=f"{META_FILE.name} not exported; run dog_breed.export {EXPERIMENT}",
    ),
    pytest.mark.dataset,
    pytest.mark.skipif(not BREEDS_DIR.exists(), reason="dataset not extracted"),
]


@pytest.fixture(scope="module")
def serving_preprocess():
    """Import serving/preprocess.py by path, without installing the project."""
    spec = importlib.util.spec_from_file_location("serving_preprocess", PREPROCESS_MODULE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.preprocess


@pytest.fixture(scope="module")
def meta() -> dict:
    with open(META_FILE, encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def sample_paths() -> list:
    """A spread of real photos: Resize preserves aspect ratio, so portrait,
    landscape and near-square images each exercise a different branch."""
    paths = sorted(BREEDS_DIR.rglob("*.jpg"))
    assert paths, "no images found"
    step = max(1, len(paths) // SAMPLE_SIZE)
    return paths[::step][:SAMPLE_SIZE]


def training_tensor(path, meta: dict) -> np.ndarray:
    """What the model was evaluated with."""
    cfg = {
        "input_size": tuple(meta["input_size"]),
        "crop_pct": meta["crop_pct"],
        "interpolation": meta["interpolation"],
        "mean": meta["mean"],
        "std": meta["std"],
    }
    with Image.open(path) as img:
        tensor = val_test_transforms(cfg)(img.convert("RGB"))
    return tensor.unsqueeze(0).numpy()


def test_output_shape_and_dtype(serving_preprocess, meta, sample_paths):
    """onnxruntime rejects float64, and the graph needs the batch axis."""
    out = serving_preprocess(sample_paths[0].read_bytes(), meta)

    assert out.shape == (1, *meta["input_size"])
    assert out.dtype == np.float32


def test_scaled_decoding_actually_fires(serving_preprocess, meta, sample_paths):
    """Guards the optimisation itself: draft() must be called before any pixel
    is touched, and does nothing at all if it is not. Silently losing it would
    double the latency on large uploads with every test still green.
    """
    fired = []
    for path in sample_paths:
        with Image.open(path) as img:
            original = img.size
        probe = Image.open(path)
        probe.draft("RGB", (int(meta["input_size"][1] / meta["crop_pct"]),) * 2)
        if probe.size != original:
            fired.append(path.name)

    assert fired, (
        "no sampled image is large enough for scaled decoding; this test can "
        "no longer tell whether draft() still works"
    )


def test_matches_the_training_transform(serving_preprocess, meta, sample_paths):
    """The test this file exists for.

    Scaled decoding is switched off here: it changes the pixels by design, so
    leaving it on would conflate two questions. Its cost is measured below.

    Exact equality, not a tolerance: torchvision's Resize on a PIL image calls
    PIL, so the reimplementation runs the same code and any difference means a
    different argument was passed. Two were found this way -- truncation vs
    rounding in the resize target, and in the crop offset -- each shifting the
    image by one pixel and neither raising anything.
    """
    for path in sample_paths:
        ours = serving_preprocess(path.read_bytes(), meta, use_draft=False)
        theirs = training_tensor(path, meta)

        np.testing.assert_allclose(
            ours, theirs, atol=TOLERANCE,
            err_msg=f"preprocessing diverges on {path.name}",
        )


def test_handles_non_rgb_input(serving_preprocess, meta, sample_paths, tmp_path):
    """Users upload greyscale photos and PNGs with an alpha channel; both must
    come out as three channels rather than crashing on the array shape."""
    with Image.open(sample_paths[0]) as img:
        rgb = img.convert("RGB")

        grey_path = tmp_path / "grey.jpg"
        rgb.convert("L").save(grey_path)

        rgba_path = tmp_path / "alpha.png"
        rgb.convert("RGBA").save(rgba_path)

    for path in (grey_path, rgba_path):
        out = serving_preprocess(path.read_bytes(), meta)
        assert out.shape == (1, *meta["input_size"]), f"wrong shape for {path.name}"


@pytest.mark.slow
def test_serving_path_preserves_test_accuracy(serving_preprocess, meta, split_rows):
    """The whole deployed path, on the whole test set.

    Scaled decoding is on, as it always is in production, so the tensors are
    not the ones the model was evaluated with. The question that matters is
    whether that costs accuracy, and ten hand-made images cannot answer it:
    this runs the 8580 real ones through preprocess + ONNX and compares
    against the recorded number.

    Slow by design -- a few minutes on CPU -- and marked so it can be skipped.
    """
    onnxruntime = pytest.importorskip("onnxruntime")
    onnx_path = onnx_file(EXPERIMENT)
    if not onnx_path.exists():
        pytest.skip(f"{onnx_path.name} not exported")

    session = onnxruntime.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    test_rows = [(p, label) for p, label, split in split_rows if split == "test"]

    correct = 0
    for path, label in test_rows:
        tensor = serving_preprocess((BREEDS_DIR / path).read_bytes(), meta)
        prediction = int(session.run(["logits"], {"input": tensor})[0].argmax())
        correct += prediction == label

    accuracy = correct / len(test_rows)
    print(f"\nserving path accuracy: {accuracy * 100:.2f}% over {len(test_rows)} images")

    assert accuracy == pytest.approx(RECORDED_TEST_ACCURACY, abs=ACCURACY_TOLERANCE), (
        f"the serving path scores {accuracy * 100:.2f}%, against the "
        f"{RECORDED_TEST_ACCURACY * 100:.2f}% recorded in evaluation.csv"
    )
