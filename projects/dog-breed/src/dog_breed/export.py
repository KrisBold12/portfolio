"""Export a trained experiment to ONNX.

The API serves one image at a time, but axis 0 is left dynamic so the same
graph can also be evaluated in batches — otherwise the exported model could
only ever be checked one image at a time.

The calibration temperature is folded into the graph rather than left for the
caller to apply. A parameter the server could forget is a parameter the server
will eventually forget.
"""

import torch
import json

from dog_breed.experiments import parse_experiment
from dog_breed.model import load_trained_model
from dog_breed.paths import MODEL_DIR, onnx_file, model_meta_file, temperature_file
from dog_breed.data.splits import class_names

OPSET_VERSION = 17


class ModelWithFeatures(torch.nn.Module):
    """
    Exports both outputs: the logits and the features the OOD gate needs.

    Two ONNX files would mean two sessions and two forward passes for what is
    one computation -- the logits are just a projection of the features.

    The logits come out already divided by the calibration temperature.
    Dividing by a positive constant cannot reorder them, so predictions and
    accuracy are unchanged; only the softmax the caller computes is corrected.
    """
    def __init__(self, model, temperature: float = 1.0):
        super().__init__()
        self.model = model
        self.temperature = temperature

    def forward(self, x):
        f = self.model.forward_features(x)
        features = self.model.forward_head(f, pre_logits=True)
        logits = self.model.get_classifier()(features) / self.temperature
        return logits, features


def pretty(raw_breed: str):
    return raw_breed.replace('_', ' ').title()


def load_temperature(name: str) -> float:
    """The fitted temperature, or 1.0 when the model has not been calibrated.

    Defaulting keeps export usable on a model that has never been through
    calibrate.py, rather than failing on a missing file.
    """
    path = temperature_file(name)
    if not path.exists():
        return 1.0

    with open(path, encoding="utf-8") as f:
        return float(json.load(f)["temperature"])


def main():
    name = parse_experiment()
    dest = onnx_file(name)

    model, ckpt = load_trained_model(name, "cpu")
    # Tracing records the graph in whatever mode the model is in: left in
    # train() the BatchNorm layers would be exported using batch statistics.
    model.eval()

    cfg = model.pretrained_cfg
    dummy = torch.rand(1, 3, cfg["input_size"][1], cfg["input_size"][2])

    temperature = load_temperature(name)
    print(f"temperature: {temperature:.4f}")

    # eval() on the wrapper too: it is a new module, born in training mode
    # regardless of the state of the model inside it.
    wrapped = ModelWithFeatures(model, temperature)
    wrapped.eval()
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        wrapped,
        dummy,
        dest,
        input_names=["input"],
        output_names=["logits", "features"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}, "features": {0: "batch"}},
        opset_version=OPSET_VERSION,
        # A single self-contained file: the default splits the weights into a
        # sibling .data file that must be deployed alongside it.
        external_data=False,
    )
    print(f"{name} exported to {dest} ({dest.stat().st_size / 1e6:.1f} MB)")

    # Metafile
    meta = {
        "experiment": name,
        "model_name": ckpt["model_name"],
        "input_size": list(cfg["input_size"]),
        "crop_pct": cfg["crop_pct"],
        "interpolation": cfg["interpolation"],
        "mean": list(cfg["mean"]),
        "std": list(cfg["std"]),
        "classes": [{"id": s, "name": pretty(s)} for s in class_names()],
        "tag": cfg["tag"],
        # Informational. "in_graph" is the load-bearing part: it tells a reader
        # the division already happened during export, so applying the
        # temperature again would silently deflate every confidence shown.
        "calibration": {"temperature": temperature, "applied": "in_graph"},
    }
    meta_path = model_meta_file(name)
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)
    print(f"Written metafile in: {meta_path}")


if __name__ == "__main__":
    main()
