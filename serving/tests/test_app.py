"""The HTTP layer, on its own.

What can go wrong here has nothing to do with the model: a request that is too
large, a file that is not an image, a bug inside predict() reported to the
caller as their fault. So none of these tests load the 112 MB graph. The
artifacts arrive through dependency_overrides and predict() is replaced with a
stub, which is the whole reason app.py takes both by injection rather than by
import.

The model itself is covered from the training side, in
projects/dog-breed/tests/test_serving_ood.py, where the training implementation
is available to compare against.
"""

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image, UnidentifiedImageError

from dogbreed_serving import app as app_module
from dogbreed_serving.app import MAX_UPLOAD_BYTES, app, get_artifacts
from dogbreed_serving.model import Artifacts
from dogbreed_serving.schemas import OodInfo, Prediction, PredictResponse

EXPERIMENT = "imagenet_head"
ARCHITECTURE = "convnext_tiny"

ANSWER = PredictResponse(
    is_dog=True,
    predictions=[
        Prediction(id="chihuahua", name="Chihuahua", probability=0.93),
        Prediction(id="pug", name="Pug", probability=0.04),
    ],
    ood=OodInfo(distance=41.2, threshold=49.27),
)


@pytest.fixture
def artifacts() -> Artifacts:
    """Enough of the real thing for the HTTP layer to be exercised.

    Only meta is read by app.py -- the arrays exist so the type is honest, not
    because anything here touches them.
    """
    return Artifacts(
        session=None,
        meta={"experiment": EXPERIMENT, "model_name": ARCHITECTURE},
        means=np.zeros((2, 4), dtype=np.float32),
        precision=np.eye(4, dtype=np.float32),
        threshold=49.27,
    )


@pytest.fixture
def client(artifacts) -> TestClient:
    """A client with the artifacts injected and the model never loaded.

    TestClient runs lifespan only when used as a context manager. Not entering
    it is deliberate: lifespan is what calls load_artifacts(), and the point of
    these tests is to run without it.
    """
    app.dependency_overrides[get_artifacts] = lambda: artifacts
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def stub_predict(monkeypatch):
    """Replace predict() and record what it was called with.

    Returns the call log, so a test can assert that predict was never reached
    -- which is the only way to tell a guard that rejects early from one that
    rejects after doing the work.
    """
    calls = []

    def install(outcome):
        def fake(image_bytes, artifacts):
            calls.append(image_bytes)
            if isinstance(outcome, Exception):
                raise outcome
            return outcome

        monkeypatch.setattr(app_module, "predict", fake)
        return calls

    return install


def jpeg_bytes(size: int = 64) -> bytes:
    """A real, small JPEG. Nothing decodes it here, but a test that posted a
    string would not be posting what a browser posts."""
    from io import BytesIO

    buffer = BytesIO()
    Image.new("RGB", (size, size), (128, 128, 128)).save(buffer, format="JPEG")
    return buffer.getvalue()


def test_health_reports_what_is_loaded(client):
    """/health has to describe the artifacts in memory, not the ones the image
    was built with. A deploy that picks up the wrong model is the failure this
    endpoint exists to catch, and "ok" alone would not catch it."""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "experiment": EXPERIMENT,
        "model_name": ARCHITECTURE,
    }


def test_predict_returns_the_payload_as_json(client, stub_predict):
    """The wire format of a successful call, which is the frontend's contract."""
    stub_predict(ANSWER)

    response = client.post("/predict", files={"file": ("dog.jpg", jpeg_bytes(), "image/jpeg")})

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"is_dog", "predictions", "ood"}
    assert body["is_dog"] is True
    assert body["predictions"][0] == {
        "id": "chihuahua",
        "name": "Chihuahua",
        "probability": 0.93,
    }
    assert body["ood"] == {"distance": 41.2, "threshold": 49.27}


def test_a_missing_file_is_rejected_before_anything_runs(client, stub_predict):
    calls = stub_predict(ANSWER)

    response = client.post("/predict")

    assert response.status_code == 422
    assert not calls


def test_an_oversized_upload_is_rejected_without_being_processed(client, stub_predict):
    """The size guard has to fire before predict(), not after.

    A limit checked after the work is not a limit. Asserting the status code
    alone would pass either way, which is why this asserts predict was never
    reached.
    """
    calls = stub_predict(ANSWER)
    oversized = b"\xff" * (MAX_UPLOAD_BYTES + 1024)

    response = client.post("/predict", files={"file": ("huge.jpg", oversized, "image/jpeg")})

    assert response.status_code == 413
    assert not calls, "the upload was processed before the size was checked"


def test_an_upload_at_the_limit_is_accepted(client, stub_predict):
    """The comparison, at the only value where it can be wrong.

    A file of exactly MAX bytes is within the limit. `>=` instead of `>` turns
    it away, and no other input distinguishes the two operators.

    The `+1` in the read is guarded by the test above rather than by this one:
    reading only MAX bytes would make an oversized file measure exactly MAX,
    slip past the check, and reach predict() truncated.
    """
    stub_predict(ANSWER)
    at_limit = b"\xff" * MAX_UPLOAD_BYTES

    response = client.post("/predict", files={"file": ("big.jpg", at_limit, "image/jpeg")})

    assert response.status_code == 200


def test_a_file_that_is_not_an_image_is_a_client_error(client, stub_predict):
    stub_predict(UnidentifiedImageError("cannot identify image file"))

    response = client.post("/predict", files={"file": ("notes.txt", b"hello", "text/plain")})

    assert response.status_code == 400
    assert response.json()["detail"], "a 400 with no detail tells the caller nothing"


def test_a_decompression_bomb_is_a_client_error(client, stub_predict):
    """A 200 MB PNG that expands to gigabytes is a valid image and still has to
    be refused. PIL raises for it, and the raise has to be caught -- an
    uncaught one is a 500, which reads as the server's fault."""
    stub_predict(Image.DecompressionBombError("image too large"))

    response = client.post("/predict", files={"file": ("bomb.png", jpeg_bytes(), "image/png")})

    assert response.status_code == 400


def test_a_bug_in_predict_is_not_reported_as_the_caller_s_fault(client, stub_predict):
    """The reason the except clause names its exceptions.

    A bare `except` turns every server bug into a 400: the caller is told their
    image is unreadable while the real fault is an IndexError upstream. Nothing
    in the response distinguishes the two, and the bug is never looked for.

    TestClient re-raises server exceptions by default, so an escaping error
    surfaces here rather than as a 500.
    """
    stub_predict(ValueError("a real bug"))

    with pytest.raises(ValueError, match="a real bug"):
        client.post("/predict", files={"file": ("dog.jpg", jpeg_bytes(), "image/jpeg")})
