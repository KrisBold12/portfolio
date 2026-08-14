import numpy as np

from dogbreed_serving.model import Artifacts
from dogbreed_serving.preprocess import preprocess

TOP_K = 5


def softmax(logits: np.ndarray) -> np.ndarray:
    """Probabilities from one (120,) logit vector.

    No temperature here: the division is already inside the ONNX graph
    (meta["calibration"]["applied"] == "in_graph"). Applying it twice would
    silently deflate every confidence shown.

    Subtract the max before exp -- standard, free, and the reason this is a
    function instead of two inline lines.
    """
    e = np.exp(logits - logits.max())
    return e / e.sum()


def mahalanobis(features: np.ndarray, means: np.ndarray, precision: np.ndarray) -> float:
    """Distance to the nearest of the 120 class centres.

    Duplicates dog_breed.ood.mahalanobis_score for a single image, and is
    covered by a parity test for the same reason preprocess is.

    features (768,), means (120, 768) -> the subtraction broadcasts to
    (120, 768) in one shot, no loop over classes needed. Then the quadratic
    form row by row, min, sqrt, clamped at zero.
    """
    diff = features - means
    d2 = (diff @ precision * diff).sum(axis=1)
    return float(np.sqrt(np.maximum(d2.min(), 0))) # Maximum is just a safety measure, not needed but I guess you never know lol


def predict(image_bytes: bytes, artifacts: Artifacts):
    """One image in, the full answer out.

    Both outputs come from a single session.run: the features are what the
    gate needs, and asking for them separately would mean a second forward
    pass over the same image.

    onnxruntime returns (1, 120) and (1, 768) -- drop the batch axis once,
    here, rather than indexing [0] in four places downstream.

    Every number crossing the return boundary goes through float(): numpy
    scalars are not JSON-serialisable and the failure surfaces in the web
    layer, far from here.
    """
    tensor = preprocess(image_bytes, artifacts.meta)
    logits, features = artifacts.session.run(["logits", "features"], {"input": tensor})
    logits, features = np.squeeze(logits, axis=0), np.squeeze(features, axis=0)
    probs = softmax(logits)
    distance = mahalanobis(features, artifacts.means, artifacts.precision)
    top_indices = np.argsort(probs)[::-1][:TOP_K]

    is_dog = distance < artifacts.threshold

    """
    Payload shape:
    {
        "is_dog": bool,
        "predictions": [{"id": ..., "name": ..., "probability": ...}, ...],
        "ood": {"distance": ..., "threshold": ...}
    }
    """
    payload = {}
    payload["is_dog"] = is_dog
    payload["predictions"] = []
    for idx in top_indices:
        payload["predictions"].append({
            "id": artifacts.meta["classes"][idx]["id"],
            "name": artifacts.meta["classes"][idx]["name"],
            "probability": float(probs[idx])
        })
    payload["ood"] = {
        "distance": distance,
        "threshold": artifacts.threshold
    }
    return payload
