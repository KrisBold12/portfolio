from contextlib import asynccontextmanager
from typing import Annotated

from PIL import Image, UnidentifiedImageError
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile

from dogbreed_serving.model import Artifacts, load_artifacts
from dogbreed_serving.predict import predict
from dogbreed_serving.schemas import HealthResponse, PredictResponse

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the model once, before the first request."""
    app.state.artifacts = load_artifacts()
    yield

    
app = FastAPI(lifespan=lifespan)


def get_artifacts(request: Request) -> Artifacts:
    return request.app.state.artifacts


@app.post("/predict")
def predict_breed(artifacts: Annotated[Artifacts, Depends(get_artifacts)], 
                  file: Annotated[UploadFile, File()]) -> PredictResponse:
    image_bytes = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, detail=f"limit is: {MAX_UPLOAD_BYTES / (1024 * 1024)}")
    try:
        return predict(image_bytes, artifacts)
    except (UnidentifiedImageError, Image.DecompressionBombError) as exc:
        raise HTTPException(400, detail="could not read the file as an image") from exc


@app.get("/health")
def health_check(artifacts: Annotated[Artifacts, Depends(get_artifacts)]) -> HealthResponse:
    return HealthResponse(status="ok", experiment=artifacts.meta["experiment"], model_name=artifacts.meta["model_name"])

