/**
 * Typed client for the dog-breed classifier's FastAPI backend.
 *
 * `predict` posts a multipart form (single field, "file") to `/predict` and
 * rejects with a `PredictError` carrying a discriminated `kind` plus a
 * user-facing message for statuses the UI must handle distinctly.
 */

export type Prediction = { id: string; name: string; probability: number }
export type OodInfo = { distance: number; threshold: number }
export type PredictResponse = {
  is_dog: boolean
  predictions: Prediction[]
  ood: OodInfo
}

export type PredictErrorKind = 'too-large' | 'not-an-image' | 'no-file' | 'unavailable'

const ERROR_MESSAGES: Record<PredictErrorKind, string> = {
  'too-large': 'That image is too large. Choose a smaller file and try again.',
  'not-an-image': 'That file could not be read as an image.',
  'no-file': 'No image was received. Choose a file and try again.',
  unavailable: 'The classifier is unavailable right now. Try again shortly.',
}

export class PredictError extends Error {
  readonly kind: PredictErrorKind

  constructor(kind: PredictErrorKind) {
    super(ERROR_MESSAGES[kind])
    this.name = 'PredictError'
    this.kind = kind
  }
}

const BASE: string = import.meta.env.VITE_API_BASE ?? '/api'

function statusToKind(status: number): PredictErrorKind {
  switch (status) {
    case 413:
      return 'too-large'
    case 400:
      return 'not-an-image'
    case 422:
      return 'no-file'
    default:
      return 'unavailable'
  }
}

export async function predict(file: File): Promise<PredictResponse> {
  const formData = new FormData()
  formData.append('file', file)

  let response: Response
  try {
    response = await fetch(`${BASE}/predict`, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new PredictError('unavailable')
  }

  if (!response.ok) {
    throw new PredictError(statusToKind(response.status))
  }

  try {
    return (await response.json()) as PredictResponse
  } catch {
    // A 2xx status with a body that is not valid JSON means the service is
    // misbehaving, not that the request itself was malformed, so this maps
    // to the same 'unavailable' kind a network failure or a 5xx would.
    throw new PredictError('unavailable')
  }
}
