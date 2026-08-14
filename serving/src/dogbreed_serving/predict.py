import numpy as np

from dogbreed_serving.model import Artifacts
from dogbreed_serving.preprocess import preprocess
from dogbreed_serving.schemas import OodInfo, Prediction, PredictResponse

TOP_K = 5


def softmax(logits: np.ndarray) -> np.ndarray:
    """Probabilities from one (120,) logit vector."""
    e = np.exp(logits - logits.max())
    return e / e.sum()


def mahalanobis(features: np.ndarray, means: np.ndarray, precision: np.ndarray) -> float:
    """Distance to the nearest of the 120 class centres."""
    diff = features - means
    d2 = (diff @ precision * diff).sum(axis=1)
    return float(np.sqrt(np.maximum(d2.min(), 0))) # Maximum is just a safety measure


def predict(image_bytes: bytes, artifacts: Artifacts) -> PredictResponse:
    """One image in, the full answer out."""
    tensor = preprocess(image_bytes, artifacts.meta)
    logits, features = artifacts.session.run(["logits", "features"], {"input": tensor})
    logits, features = np.squeeze(logits, axis=0), np.squeeze(features, axis=0)
    probs = softmax(logits)
    distance = mahalanobis(features, artifacts.means, artifacts.precision)
    top_indices = np.argsort(probs)[::-1][:TOP_K]

    # Building the responce
    is_dog = distance < artifacts.threshold
    predictions = []
    for idx in top_indices:
        cls = artifacts.meta["classes"][idx]
        prediction = Prediction(id=cls["id"], name=cls["name"], probability=float(probs[idx]))
        predictions.append(prediction)
    ood = OodInfo(distance=distance, threshold=artifacts.threshold)
    payload = PredictResponse(is_dog=is_dog, predictions=predictions, ood=ood)
    return payload
