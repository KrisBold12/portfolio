import argparse

EXPERIMENTS = {
      "baseline": dict(model_name="resnet50", freeze_backbone=True, lr=1e-3, epochs=15),
      "effnet_b0": dict(model_name="efficientnet_b0", freeze_backbone=False, lr=1e-4, epochs=15),
      "convnext_t": dict(model_name="convnext_tiny", freeze_backbone=False, lr=1e-4, epochs=15),
      "effnet_b0_probe": dict(model_name="efficientnet_b0", freeze_backbone=True, lr=1e-3, epochs=15),
      "convnext_t_probe": dict(model_name="convnext_tiny",   freeze_backbone=True, lr=1e-3, epochs=15),
}


def parse_experiment() -> str:
    """Read the experiment name from the command line.

    Every script that touches a trained model needs it, and `choices` turns a
    misspelled name into a helpful error instead of a KeyError.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("experiment", choices=EXPERIMENTS)
    return parser.parse_args().experiment