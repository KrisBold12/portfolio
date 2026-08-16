# Portfolio

Machine learning projects taken from raw data to a served model, with the
measurements that justify each decision.

## Calibrated dog breed classifier

Names one of 120 dog breeds from a photo, refuses the images it cannot answer
for, and reports a confidence that matches how often it is right. Live at
**https://kb-portfolio.dev**, 123 ms p95 on a 4-vCPU VPS against a 300 ms budget
fixed before any model was trained.

The refusal is a Mahalanobis distance on the features the classifier already
computes, so it costs no second model: it accepts 98.0% of real dog photos and
4.47% of cats, the cats being Oxford's rather than blank walls. The confidence
is corrected by one scalar, which brings expected calibration error on the test
split from 5.71% to 0.84%, and which came out below 1 rather than above it, so
this model understates its confidence where the textbook result says it should
overstate it.

Both numbers are measured on photographs from a dataset the model was never
fitted on, because Stanford Dogs is cut from ImageNet and every pretrained
backbone has already seen its test images. Holding the breed set fixed and
changing only the photo source costs 6.2 points, which is what a single Stanford
Dogs accuracy hides.

Five configurations across three architectures were trained and scored on both
datasets. The one deployed is none of them: all 120 breeds are ImageNet classes,
so each backbone already carries a classifier for the task among its 1000
outputs, and keeping those 120 rows beats everything that was trained. 93.11% on
the 8580-image Stanford test split, 88.54% on Oxford.

[The model](projects/dog-breed/README.md) —
[the service](serving/README.md) —
[the deployment](deploy/README.md)

## Layout

```
projects/dog-breed   training, evaluation, ONNX export and benchmarking
serving              FastAPI service and container image
web                  React frontend, prerendered at build time
deploy               nginx configuration and the deployment runbook
docs                 design documents
```
