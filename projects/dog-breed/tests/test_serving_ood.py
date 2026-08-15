"""The deployed OOD gate must be the gate reports/ood.csv describes.

serving/ reimplements dog_breed.ood.mahalanobis_score, for the same reason it
reimplements the eval transform: the container carries neither torch nor
sklearn. The formula is four lines and has four ways to be silently wrong --
max instead of min, a missing sqrt, the wrong axis, indices paired with the
wrong breed -- and not one of them raises. Each would move every distance,
and the accept rates published in ood.csv would describe something that is no
longer deployed.

Three groups, with different preconditions so they skip independently:

  parity   the formula alone, against the training implementation. Needs only
           the two .npz files -- no images, no ONNX, no GPU. Fast.
  payload  what crosses the HTTP boundary. Needs serving/models/ and one image.
  gate     dogs in, cats out, end to end. Needs Oxford. Slow.
"""

import importlib
import json
import sys

import numpy as np
import pytest

from dog_breed.ood import mahalanobis_score
from dog_breed.paths import (
    BREEDS_DIR,
    OXFORD_PHOTOS_DIR,
    PROJECT_ROOT,
    features_file,
    ood_file,
)

EXPERIMENT = "imagenet_head"

SERVING_ROOT = PROJECT_ROOT.parents[1] / "serving"
SERVING_SRC = SERVING_ROOT / "src"
SERVED_MODELS = SERVING_ROOT / "models"

FEATURES_FILE = features_file(EXPERIMENT)
GATE_FILE = ood_file(EXPERIMENT)

# Rows of the cached training features to check the formula on. Evenly spaced
# rather than the first N: the file is ordered by class, so the head of it is
# 85 images of one breed.
PARITY_SAMPLE = 64

# Locally the two implementations agree bit for bit. The tolerance is here
# because BLAS blocks a (64, 768) matmul differently from a (120, 768) one and
# may do so differently again on another machine. Every mutation this file
# guards against is orders of magnitude away from 1e-6.
PARITY_RTOL = 1e-6

GATE_SAMPLE = 40
# ood.csv, full sets at TARGET_TPR = 97.5: 97.5% of 4178 Oxford dogs accepted,
# 2.36% of 2371 cats. The margins stay wide -- this test asks whether the gate
# still works, not what its rate is, and on 40 images binomial noise alone is
# several points. Re-measuring is ood.py's job.
#
# The cat ceiling is 10% rather than something closer to the measured rate,
# because 10% is the number this project committed to before it had any of
# these measurements: the point above which a dedicated binary dog detector
# would be worth building. It was 20% while the rate was 1.18%, which turned
# out to be too loose to be useful -- a threshold set at 99% TPR admits 17.8%
# of cats and would have slipped through. Tying the bound to the project's own
# stated limit gives it a reason to be where it is.
MIN_DOG_ACCEPT = 0.80
MAX_CAT_ACCEPT = 0.10

pytestmark = [
    pytest.mark.serving,
    pytest.mark.skipif(
        not (SERVING_SRC / "dogbreed_serving" / "predict.py").exists(),
        reason=f"{SERVING_SRC} not found",
    ),
]


@pytest.fixture(scope="module")
def serving():
    """Import the serving package properly, not one file by path.

    predict.py imports its siblings by package name, so the path-loading trick
    test_serving_parity.py uses to isolate preprocess.py cannot resolve them.
    The two projects still have separate virtualenvs; this only puts the source
    tree on sys.path, it does not install anything.
    """
    if str(SERVING_SRC) not in sys.path:
        sys.path.insert(0, str(SERVING_SRC))
    return importlib.import_module("dogbreed_serving.predict")


@pytest.fixture(scope="module")
def gate():
    """means, precision, threshold -- exactly what the server loads."""
    if not GATE_FILE.exists():
        pytest.skip(f"{GATE_FILE.name} missing; run dog_breed.ood {EXPERIMENT}")
    data = np.load(GATE_FILE)
    return data["means"], data["precision"], float(data["threshold"])


@pytest.fixture(scope="module")
def train_features() -> np.ndarray:
    if not FEATURES_FILE.exists():
        pytest.skip(f"{FEATURES_FILE.name} missing; run dog_breed.ood {EXPERIMENT}")
    return np.load(FEATURES_FILE)["features"]


@pytest.fixture(scope="module")
def artifacts(serving):
    """The server's startup state, loaded from serving/models/."""
    pytest.importorskip("onnxruntime")
    # All three, not just the graph: serving/models/ is gitignored and gets
    # populated by hand, so a partial copy is the likely state, and a missing
    # .npz would otherwise surface as a FileNotFoundError from inside numpy.
    missing = [
        f"{EXPERIMENT}{suffix}"
        for suffix in (".onnx", ".json", "_ood.npz")
        if not (SERVED_MODELS / f"{EXPERIMENT}{suffix}").exists()
    ]
    if missing:
        pytest.skip(f"{SERVED_MODELS} is missing {', '.join(missing)}")
    return importlib.import_module("dogbreed_serving.model").load_artifacts()


@pytest.fixture(scope="module")
def dog_bytes() -> bytes:
    if not BREEDS_DIR.exists():
        pytest.skip("Stanford images not extracted")
    paths = sorted(BREEDS_DIR.rglob("*.jpg"))
    assert paths, "no images found"
    return paths[len(paths) // 2].read_bytes()


# --------------------------------------------------------------------- parity


def test_mahalanobis_matches_training(serving, gate, train_features):
    """The test this file exists for.

    One image at a time here against a whole batch there: the serving version
    broadcasts over the 120 class means, the training one loops over them, and
    the two have to land on the same number.
    """
    means, precision, _ = gate
    rows = train_features[:: max(1, len(train_features) // PARITY_SAMPLE)][:PARITY_SAMPLE]

    theirs = mahalanobis_score(rows, means, precision)
    ours = np.array([serving.mahalanobis(row, means, precision) for row in rows])

    np.testing.assert_allclose(
        ours, theirs, rtol=PARITY_RTOL,
        err_msg="the deployed distance is not the one the threshold was fitted on",
    )


def test_returns_a_plain_float(serving, gate, train_features):
    """np.float32 is not JSON-serialisable and np.float64 is, by an accident of
    numpy's class hierarchy. Neither is a contract worth relying on."""
    means, precision, _ = gate
    distance = serving.mahalanobis(train_features[0], means, precision)

    assert type(distance) is float


def test_a_class_centre_scores_zero(serving, gate):
    """The nearest-centre case, pinned.

    A vector sitting exactly on a class mean must score 0: it is the one input
    where taking the max over classes instead of the min is unmistakable, since
    the farthest breed centre is hundreds of units away.

    This does not exercise the clamp. On this data the quadratic form comes out
    exactly 0.0 rather than -1e-13, so removing np.maximum leaves the test
    green -- the guard is insurance against an input that has never occurred
    (the smallest d^2 over the 10200 training features is 166).
    """
    means, precision, _ = gate

    for c in (0, len(means) // 2, len(means) - 1):
        distance = serving.mahalanobis(means[c], means, precision)

        assert not np.isnan(distance), f"class {c} centre scored nan"
        assert distance == pytest.approx(0.0, abs=1e-3), f"class {c} centre scored {distance}"


# -------------------------------------------------------------------- payload


def test_serialises_to_the_expected_json(serving, artifacts, dog_bytes):
    """The field names on the wire, which are the frontend's actual contract.

    model_dump_json is the path FastAPI takes, so this is what the browser
    receives. Renaming a field, or giving one an alias, is invisible from
    inside the model and breaks every consumer -- the assertions below all read
    attributes and would stay green.
    """
    wire = json.loads(serving.predict(dog_bytes, artifacts).model_dump_json())

    assert set(wire) == {"is_dog", "predictions", "ood"}
    assert set(wire["ood"]) == {"distance", "threshold"}
    assert set(wire["predictions"][0]) == {"id", "name", "probability"}


def test_payload_structure(serving, artifacts, dog_bytes):
    """What Pydantic cannot check: that the values are the right ones.

    The model already guarantees the types and the [0, 1] bound. It has no
    opinion on how many predictions there are, whether the ids exist, or
    whether they arrive in the order the UI renders them in.
    """
    payload = serving.predict(dog_bytes, artifacts)

    assert payload.ood.threshold == artifacts.threshold
    assert len(payload.predictions) == serving.TOP_K

    known_ids = {c["id"] for c in artifacts.meta["classes"]}
    for entry in payload.predictions:
        assert entry.id in known_ids

    probabilities = [e.probability for e in payload.predictions]
    assert probabilities == sorted(probabilities, reverse=True), "top-k is not descending"


def test_top_prediction_matches_the_graph(serving, artifacts, dog_bytes):
    """Names must be attached to the right probabilities.

    argsort returns indices into the 120 classes. Slicing before reversing, or
    using those indices against anything but meta["classes"], pairs a genuine
    probability with the wrong breed -- and every other assertion in this file
    still passes, because the payload is still well formed.
    """
    preprocess = importlib.import_module("dogbreed_serving.preprocess").preprocess
    tensor = preprocess(dog_bytes, artifacts.meta)
    logits = artifacts.session.run(["logits"], {"input": tensor})[0][0]
    expected = artifacts.meta["classes"][int(logits.argmax())]

    top = serving.predict(dog_bytes, artifacts).predictions[0]

    assert (top.id, top.name) == (expected["id"], expected["name"])


def test_the_gate_is_wired_to_the_threshold(serving, artifacts, dog_bytes):
    """is_dog has to follow the distance, not be hardcoded true."""
    payload = serving.predict(dog_bytes, artifacts)

    assert payload.is_dog == (payload.ood.distance < payload.ood.threshold)


# ----------------------------------------------------------------------- gate


@pytest.mark.dataset
@pytest.mark.slow
@pytest.mark.skipif(not OXFORD_PHOTOS_DIR.exists(), reason="Oxford images not extracted")
def test_accepts_dogs_and_rejects_cats(serving, artifacts):
    """The gate doing its job, through the deployed path.

    Oxford rather than Stanford on both sides: the cats have to be Oxford's,
    and comparing them against Stanford dogs would let the gate pass by
    separating the two sources instead of the two animals.

    This runs preprocess with scaled decoding on, as production does, so the
    tensors are not the ones ood.py measured. Wide margins absorb that.
    """
    from dog_breed.data.oxford import cat_samples, mapped_dog_samples

    def accept_rate(samples) -> float:
        step = max(1, len(samples) // GATE_SAMPLE)
        chosen = samples[::step][:GATE_SAMPLE]
        accepted = sum(
            serving.predict((OXFORD_PHOTOS_DIR / path).read_bytes(), artifacts).is_dog
            for path, _ in chosen
        )
        return accepted / len(chosen)

    dogs = accept_rate(mapped_dog_samples())
    cats = accept_rate(cat_samples())
    print(f"\ndogs accepted: {dogs * 100:.1f}%   cats accepted: {cats * 100:.1f}%")

    assert dogs >= MIN_DOG_ACCEPT, f"the gate rejects {(1 - dogs) * 100:.0f}% of real dogs"
    assert cats <= MAX_CAT_ACCEPT, f"the gate accepts {cats * 100:.0f}% of cats"
