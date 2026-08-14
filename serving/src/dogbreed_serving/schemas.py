from pydantic import BaseModel, Field


class Prediction(BaseModel):
    """One breed and how likely the model thinks it is."""
    id: str = Field(min_length=1)
    name: str
    probability: float = Field(ge=0.0, le=1.0)


class OodInfo(BaseModel):
    """Why the gate decided what it decided."""
    distance: float = Field(ge=0.0)
    threshold: float = Field(ge=0.0)


class PredictResponse(BaseModel):
    """The answer to one image."""
    is_dog: bool
    predictions: list[Prediction]
    ood: OodInfo


class HealthResponse(BaseModel):
    """Whether the server is up, and what it is serving"""
    status: str
    experiment: str
    model_name: str
