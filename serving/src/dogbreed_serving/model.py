from pathlib import Path
from dataclasses import dataclass

import onnxruntime as ort
import numpy as np
import json


MODEL_DIR = Path(__file__).resolve().parents[2] / "models"
EXPERIMENT = "convnext_t_probe"


@dataclass
class Artifacts:
    """Everything loaded at startup, passed around as one object."""
    session: ort.InferenceSession
    meta: dict
    means: np.ndarray
    precision: np.ndarray
    threshold: float
    

def load_artifacts() -> Artifacts:
    with open(MODEL_DIR / f"{EXPERIMENT}.json", 'r', encoding='utf-8') as f:
        meta = json.load(f)
    session = ort.InferenceSession(str(MODEL_DIR / f"{EXPERIMENT}.onnx"), providers=["CPUExecutionProvider"])
    ood = np.load(MODEL_DIR / f"{EXPERIMENT}_ood.npz")
    return Artifacts(session, meta, ood["means"], ood["precision"], float(ood["threshold"]))
