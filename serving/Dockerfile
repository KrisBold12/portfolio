# dogbreed-serving
#
# Two stages. The builder has uv and the build caches; the runtime image gets
# the finished virtualenv and nothing else, which drops uv (~35 MB) and every
# intermediate artifact from what ships.
#
# The model is baked in rather than mounted or downloaded at boot. The image
# then *is* a specific model version: /health reporting convnext_t_probe is a
# guarantee about what was deployed, not a hopeful description of it.

# ----------------------------------------------------------------- builder

FROM python:3.12-slim-trixie AS builder

# Bytecode compiled at build time, not on the first request of every fresh
# container. Copy rather than hardlink because the uv cache and /app can land
# on different filesystems, where hardlinking silently falls back and warns.
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

RUN pip install --no-cache-dir uv

# Dependencies before source: this layer is keyed on the lockfile alone, so
# editing a .py file does not reinstall torch-sized wheels.
# README.md is here because pyproject declares it, and the build backend reads
# it while resolving the project's own metadata.
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --locked --no-install-project --no-dev

# --no-editable puts the package inside the virtualenv instead of pointing at
# /app/src. The runtime stage then needs the venv and nothing else, and there
# is no way for the installed package and a stale source tree to disagree.
COPY src/ ./src/
RUN uv sync --locked --no-dev --no-editable

# ----------------------------------------------------------------- runtime

FROM python:3.12-slim-trixie

# onnxruntime's wheel links against OpenMP, which the slim images do not carry.
# Without it the failure is an ImportError at startup, not at build time.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# onnxruntime grabs every core it can see by default. The 126 ms p95 in
# reports/benchmark.csv was measured at two threads, and on a small VPS several
# workers each claiming all the cores contend and make the tail worse, not
# better.
#
# PYTHONUNBUFFERED because otherwise stdout is block-buffered when it is not a
# terminal, and `docker logs` shows nothing until the buffer fills.
# DOGBREED_MODEL_DIR because the package is installed into the virtualenv here,
# not run from the source tree: the default in model.py walks up from __file__
# and would land inside site-packages.
ENV DOGBREED_MODEL_DIR=/app/models \
    OMP_NUM_THREADS=2 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Same absolute path as the builder: a virtualenv records where it was created,
# and moving it elsewhere breaks the console scripts inside it.
COPY --from=builder /app/.venv /app/.venv

# Last, and on its own: 112 MB that change only when a new model is exported,
# while everything above it changes with the code.
COPY models/ ./models/

# Nothing here needs to write to the filesystem, and the artifacts stay owned
# by root, so the process cannot modify the model it is serving.
RUN useradd --create-home --uid 1000 app
USER app

EXPOSE 8000

# Liveness alone would report a process that is up but has no model. This
# answers the question that matters, and urllib avoids installing curl for it.
# start-period covers the graph load, which takes a few seconds.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4)"

# One worker on purpose: inference is CPU-bound and already threaded, so a
# second worker on a two-core VPS competes with the first for the same cores.
CMD ["uvicorn", "dogbreed_serving.app:app", "--host", "0.0.0.0", "--port", "8000"]
