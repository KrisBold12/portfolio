"""Measure CPU latency of an exported experiment, at batch 1.

The deployment budget is p95 < 300 ms per request, so every choice here
mirrors production: batch 1 (users upload one photo), CPU only, and a thread
count close to a small VPS rather than this machine's full core count.

Three scenarios, because they answer different questions:
  - model only     : the cost of inference, independent of the input photo
  - end to end, no draft  : what a large upload really costs
  - end to end, draft     : the same with JPEG scaled decoding enabled

Every row records the conditions that produced it — a latency number without
them is unreadable a month later.
"""

import argparse
import csv
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

from dog_breed.data.transforms import val_test_transforms
from dog_breed.experiments import EXPERIMENTS
from dog_breed.model import load_trained_model
from dog_breed.paths import BENCHMARK_FILE, BREEDS_DIR, REPORTS_DIR, onnx_file

WARMUP = 20
RUNS = 200
NUM_THREADS = 2

CSV_HEADER = ["experiment", "scenario", "model", "threads", "image_res", "draft",
              "runs", "mean_ms", "p50_ms", "p95_ms", "p99_ms"]


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("experiment", choices=EXPERIMENTS)
    parser.add_argument(
        "--image",
        type=Path,
        help="photo used for the end-to-end scenarios; defaults to a Stanford "
             "image, which is small — pass a phone-sized photo to see the real cost",
    )
    return parser.parse_args()


def make_session(name):
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = NUM_THREADS
    return ort.InferenceSession(str(onnx_file(name)), opts, providers=["CPUExecutionProvider"])


def measure(fn) -> list[float]:
    """Times fn over RUNS calls, in milliseconds, discarding the warmup.

    The first calls pay for allocations, thread-pool spin-up and kernel
    selection; including them would move the mean and make p99 meaningless.
    """
    for _ in range(WARMUP):
        fn()

    times = []
    for _ in range(RUNS):
        start = time.perf_counter()
        fn()
        times.append((time.perf_counter() - start) * 1000)
    return times


def make_end_to_end(session, tf, img_path, target, use_draft):
    """Returns the callable to time: open, preprocess, infer."""
    def run():
        with Image.open(img_path) as img:
            if use_draft:
                # libjpeg decodes at 1/2, 1/4 or 1/8 scale directly, never
                # below the requested size. Must precede any pixel access.
                img.draft("RGB", (target, target))
            x = tf(img.convert("RGB")).unsqueeze(0).numpy()
        session.run(["logits"], {"input": x})
    return run


def row(experiment, scenario, model_name, image_res, draft, times):
    return [experiment, scenario, model_name, NUM_THREADS, image_res, draft, RUNS,
            round(np.mean(times), 2),
            round(np.percentile(times, 50), 2),
            round(np.percentile(times, 95), 2),
            round(np.percentile(times, 99), 2)]


def report(scenario, draft, times):
    print(f"  {scenario} (draft={draft}): "
          f"mean {np.mean(times):.2f}ms | p50 {np.percentile(times, 50):.2f}ms | "
          f"p95 {np.percentile(times, 95):.2f}ms | p99 {np.percentile(times, 99):.2f}ms")


def main():
    args = parse_args()
    name = args.experiment
    img_path = args.image or next(BREEDS_DIR.rglob("*.jpg"))
    session = make_session(name)

    model, ckpt = load_trained_model(name, "cpu")
    cfg = model.pretrained_cfg
    tf = val_test_transforms(cfg)
    target = int(cfg["input_size"][1] / cfg["crop_pct"])

    _, channels, height, width = session.get_inputs()[0].shape
    x = np.random.rand(1, channels, height, width).astype(np.float32)

    with Image.open(img_path) as img:
        w, h = img.size
    image_desc = f"{w}x{h} jpeg"

    specs = (
        ("model only", f"{width}x{height} synthetic", "n/a",
         lambda: session.run(["logits"], {"input": x})),
        ("end to end", image_desc, "no",
         make_end_to_end(session, tf, img_path, target, use_draft=False)),
        ("end to end", image_desc, "yes",
         make_end_to_end(session, tf, img_path, target, use_draft=True)),
    )

    print(f"Benchmarking '{name}' ({ckpt['model_name']}) on {NUM_THREADS} CPU threads")

    rows = []
    for scenario, image_res, draft, fn in specs:
        times = measure(fn)
        report(scenario, draft, times)
        rows.append(row(name, scenario, ckpt["model_name"], image_res, draft, times))

    # Checked before opening: 'a' creates the file, so exists() would always
    # be True afterwards and the header would never be written.
    write_header = not BENCHMARK_FILE.exists()
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(BENCHMARK_FILE, "a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(CSV_HEADER)
        writer.writerows(rows)

    print(f"Appended {len(rows)} rows to {BENCHMARK_FILE}")


if __name__ == "__main__":
    main()
