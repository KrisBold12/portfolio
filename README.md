# Portfolio

Machine learning projects taken from raw data to a served model, with the
measurements that justify each decision.

## Dog breed classifier

Classifies a photo into one of 120 dog breeds, under a deployment budget fixed
before any model was trained: p95 under 300 ms on CPU, container under 500 MB.

Stanford Dogs is built from ImageNet images and all 120 breeds are ImageNet
classes, so every pretrained backbone has already seen the test set. The project
quantifies that: on the 21 breeds shared with Oxford-IIIT Pet, the same model
scores 94.11% on Stanford photos and 87.87% on Oxford photos.

Five configurations across three architectures, evaluated on both datasets and
benchmarked on CPU before choosing one. Selected model reaches 89.99% on the full
Stanford test split at 160 ms p95 end to end.

[Read more](projects/dog-breed/README.md)

## Layout

```
projects/dog-breed   training, evaluation, ONNX export and benchmarking
serving              FastAPI service, containerised (health check only so far)
web                  frontend, not started
docs                 design documents
```
