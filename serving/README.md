# Serving

The deployed half of the dog breed classifier: a FastAPI service around the
exported ONNX graph, containerised, with no PyTorch and no timm.

Dropping the training stack takes roughly 400 MB out of the image and costs one
guarantee: the preprocessing and the out-of-distribution distance have to be
reimplemented here on PIL and numpy alone, and a reimplementation can drift from
the one the accuracy was measured with. Both are covered by parity tests that run
from the training project, where the original implementation is available to
compare against.

## The API

```
POST /predict     multipart file upload, returns the breeds and the gate decision
GET  /health      whether the service is up, and which model it loaded
```

A prediction:

```json
{
  "is_dog": true,
  "predictions": [
    {"id": "chihuahua", "name": "Chihuahua", "probability": 0.9960},
    {"id": "pembroke",  "name": "Pembroke",  "probability": 0.0008}
  ],
  "ood": {"distance": 32.41, "threshold": 56.36}
}
```

`ood` is returned in the clear rather than kept server-side. The gate rejects 2%
of real dog photos by construction, so when someone reports that their dog was
turned away, the number is already in the response they can paste.

The breed list is populated even when `is_dog` is false. The service reports what
it measured; the interface decides what to show. Blanking the list here would
leave that 5% with no way back, and changing a frontend is cheaper than
redeploying an API.

`/health` returns the experiment and the architecture read from the loaded
metadata, not from a constant. The failure it exists to catch is a deploy that
picked up a different model than intended, and `{"status": "ok"}` would not catch
it.

The response shape is defined once, in `schemas.py`, and `predict()` builds it
directly. FastAPI derives the OpenAPI schema from the return annotation, so
`/docs` documents the real contract rather than a description of it that can
drift.

## Two things that are duplicated on purpose

**The evaluation transform.** Resize, centre crop, normalise — reimplemented on
PIL because torchvision would pull in torch. `test_serving_parity.py` compares
the tensors against the training pipeline for exact equality, not a tolerance:
torchvision's `Resize` calls PIL underneath, so any difference means a different
argument was passed. Two were found this way, truncation against rounding in the
resize target and in the crop offset, each shifting the image by one pixel and
neither raising anything.

**The Mahalanobis distance.** Four lines with four ways to be silently wrong —
max instead of min, a missing square root, the wrong summation axis, indices
paired with the wrong breed. `test_serving_ood.py` checks it against the training
implementation on the cached features and turns red on each of them.

## Decisions worth explaining

**The path operations are `def`, not `async def`.** Inference blocks for about
130 ms. In a coroutine that blocks the event loop and every queued request waits
behind it; declared synchronous, FastAPI runs them in a threadpool and the loop
stays free. This is the common FastAPI mistake and it is invisible until there is
concurrent traffic.

**The artifacts load once, in `lifespan`, and reach the endpoints through a
dependency.** Loading at startup means a missing or corrupt artifact stops the
container instead of surfacing as a 500 on the first user request. Going through
`Depends` means the tests can substitute them: `test_app.py` covers the whole HTTP
layer in under a second without reading the 112 MB graph.

**The upload limit is enforced by the read itself.** `read(MAX + 1)` and a length
check, rather than trusting the size the client declared. A limit checked after
the work is not a limit, so the test asserts that `predict` was never called.

**Errors are classified.** A file PIL cannot decode is a 400, a decompression
bomb is a 400, a missing file is FastAPI's own 422. The `except` clause names its
two exceptions instead of catching everything, so a bug inside `predict` stays a
500 rather than being reported to the caller as a problem with their image.

**Model paths come from the environment.** `DOGBREED_MODEL_DIR`, defaulting to
the repo layout. Deriving it from `__file__` worked from a source checkout and
broke the moment the package was installed into the container's virtualenv, where
walking up from the module lands inside `site-packages`. No test could have caught
that — they all run from the repo. Running the container did.

## The container

Multi-stage: the builder carries `uv` and the caches, the runtime image gets the
finished virtualenv and the model. 664 MB, of which 112 MB is the graph itself.

The model is baked in rather than mounted or fetched at boot, which makes the
image a specific model version: `/health` reporting `convnext_t_probe` is then a
guarantee about what was deployed, not a description of what should have been.

`libgomp1` is installed explicitly — onnxruntime's wheel links against OpenMP,
which the slim images do not carry, and the failure is an ImportError at startup
with nothing visible at build time. `OMP_NUM_THREADS` is pinned to 2, the value
the latency was benchmarked at; left unset, onnxruntime claims every core it can
see and several workers on a small VPS then contend for the same ones. The process
runs as a non-root user and the artifacts stay owned by root, so the service
cannot modify the model it serves.

Verified against a running container:

| | |
|---|---|
| `/health` | reports `convnext_t_probe` / `convnext_tiny`, Docker health check passes |
| Chihuahua photo | accepted, distance 32.4 against a threshold of 56.36, 99.60% on the breed |
| Abyssinian cat | rejected, distance 61.5, and the top guess only reaches 10.3% |
| text file | 400 |
| request with no file | 422 |
| latency, 10 requests | 74 ms min, **100 ms median**, 114 ms max |

The cat is the useful row. Both defences — the distance gate and the calibrated
confidence — say the same thing independently, and neither was tuned on it.

## Deployed

Running at **https://kb-portfolio.dev/api** on a 4-vCPU Infomaniak VPS: Ubuntu
24.04, Docker, nginx terminating TLS and serving the static frontend from the
same origin.

| | p50 | p95 |
|---|---:|---:|
| On the VPS, over loopback | 97 ms | 127 ms |
| From a laptop in Italy, HTTPS and network included | 134 ms | **137 ms** |

Against a 300 ms budget, with the client-side downscaling and int8 quantisation
levers still unspent. The pre-deployment estimate of 240-400 ms was pessimistic
by a factor of two because it was taken through Docker Desktop on a WSL2 virtual
machine rather than on native cores.

The container binds to `127.0.0.1:8000`, so nginx is the only route in and TLS,
the upload limit and the access log cannot be bypassed by finding the host and
guessing the port. `deploy/` and `serving/compose.yaml` hold the configuration,
so what is running is answerable from git rather than from what someone typed
over SSH; the image is pinned to a commit tag, which makes a deploy a one-line
change with a diff.

## Running it

```
uv sync
uv run uvicorn dogbreed_serving.app:app --reload
uv run pytest
```

Then `http://127.0.0.1:8000/docs`, which will upload an image for you.

The three artifacts have to be in `models/`, copied from the training project
after an export. They are not versioned: the metafile is, because it is 9 KB of
text that documents what is deployed, but the 112 MB graph and the 2.7 MB gate
are not.

```
docker build -t dogbreed-serving .
docker run -p 8000:8000 dogbreed-serving
```
