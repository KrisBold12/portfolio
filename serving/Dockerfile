# Dockerfile for dogbreed-serving

FROM python:3.12-slim-trixie

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock README.md /app/

RUN uv sync --locked --no-install-project

COPY src/dogbreed_serving /app/src/dogbreed_serving

RUN uv sync --locked

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "dogbreed_serving.app:app", "--host", "0.0.0.0", "--port", "8000"]