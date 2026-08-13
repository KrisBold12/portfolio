"""Export a trained experiment to ONNX.

The API serves one image at a time, but axis 0 is left dynamic so the same
graph can also be evaluated in batches — otherwise the exported model could
only ever be checked one image at a time.
"""

import torch
import json

from dog_breed.experiments import parse_experiment
from dog_breed.model import load_trained_model
from dog_breed.paths import MODEL_DIR, onnx_file, model_meta_file 
from dog_breed.data.splits import class_names

OPSET_VERSION = 17


def pretty(raw_breed: str):
    return raw_breed.replace('_', ' ').title()


def main():
    name = parse_experiment()
    dest = onnx_file(name)

    model, ckpt = load_trained_model(name, "cpu")
    # Tracing records the graph in whatever mode the model is in: left in
    # train() the BatchNorm layers would be exported using batch statistics.
    model.eval()

    cfg = model.pretrained_cfg
    dummy = torch.rand(1, 3, cfg["input_size"][1], cfg["input_size"][2])

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model,
        dummy,
        dest,
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
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
    }
    meta_path = model_meta_file(name)
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)
    print(f"Written metafile in: {meta_path}")


if __name__ == "__main__":
    main()
