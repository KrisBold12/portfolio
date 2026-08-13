"""Export a trained experiment to ONNX.

The API serves one image at a time, but axis 0 is left dynamic so the same
graph can also be evaluated in batches — otherwise the exported model could
only ever be checked one image at a time.
"""

import torch

from dog_breed.experiments import parse_experiment
from dog_breed.model import load_trained_model
from dog_breed.paths import MODEL_DIR, onnx_file

OPSET_VERSION = 17


def main():
    name = parse_experiment()
    dest = onnx_file(name)

    model, _ = load_trained_model(name, "cpu")
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


if __name__ == "__main__":
    main()
