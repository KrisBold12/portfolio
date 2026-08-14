import { useEffect, useRef, useState } from 'react'
import { predict, PredictError, type PredictResponse } from '../../api/client'
import Panel from '../../components/Panel/Panel'
import DropZone from './DropZone'
import Result from './Result'
import { downscale } from './downscale'
import styles from './ClassifierDemo.module.css'

type State =
  | { phase: 'idle' }
  | { phase: 'busy'; previewUrl: string; fileName: string }
  | { phase: 'result'; previewUrl: string; fileName: string; response: PredictResponse }
  | { phase: 'error'; previewUrl: string; fileName: string; message: string }

function statusText(state: Exclude<State, { phase: 'idle' }>): string {
  if (state.phase === 'busy') return 'Reading the photo and asking the model.'
  if (state.phase === 'error') return state.message
  const top = state.response.predictions[0]
  if (!state.response.is_dog) return 'Not accepted as a dog. See the closest matches below.'
  return top ? `Accepted as a dog. Best guess: ${top.name}.` : 'Accepted as a dog.'
}

/**
 * The live demo (Task 5, docs/plans/web-frontend.md). Mounted into Task 4's
 * slot (web/src/pages/DogBreedProject.tsx, #classifier-demo-slot).
 *
 * A client-side decode failure (e.g. dropping a text file) is reported
 * through the same `PredictError('not-an-image')` the API client uses for
 * a server-side 400 — same cause, same message, so it reuses the kind
 * rather than inventing a second message for it.
 */
function ClassifierDemo() {
  const [state, setState] = useState<State>({ phase: 'idle' })
  const [previewBroken, setPreviewBroken] = useState(false)
  const previewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  async function handleFile(file: File) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const previewUrl = URL.createObjectURL(file)
    previewUrlRef.current = previewUrl
    setPreviewBroken(false)
    setState({ phase: 'busy', previewUrl, fileName: file.name })

    try {
      let prepared: File
      try {
        prepared = await downscale(file)
      } catch {
        throw new PredictError('not-an-image')
      }
      const response = await predict(prepared)
      setState({ phase: 'result', previewUrl, fileName: file.name, response })
    } catch (error) {
      const message =
        error instanceof PredictError ? error.message : 'Something went wrong. Choose a file and try again.'
      setState({ phase: 'error', previewUrl, fileName: file.name, message })
    }
  }

  const busy = state.phase === 'busy'

  return (
    <section className={styles.demo} aria-labelledby="classifier-demo-heading">
      <h2 id="classifier-demo-heading" className={styles.heading}>
        Try it yourself
      </h2>
      <p className={styles.intro}>
        Upload a photo. The model checks whether it looks like a dog, then names a breed and says how sure it
        is.
      </p>

      <Panel>
        <div className={styles.uploadRow}>
          <DropZone onFile={handleFile} disabled={busy} />

          {state.phase !== 'idle' && (
            <div className={styles.previewSlot}>
              {previewBroken ? (
                <div className={styles.thumbFallback} aria-hidden="true" />
              ) : (
                <img
                  src={state.previewUrl}
                  alt={`Preview of ${state.fileName}`}
                  className={styles.thumb}
                  onError={() => setPreviewBroken(true)}
                />
              )}
              <p
                className={state.phase === 'error' ? `${styles.statusLine} ${styles.statusError}` : styles.statusLine}
                aria-live="polite"
              >
                {statusText(state)}
              </p>
            </div>
          )}
        </div>
      </Panel>

      {state.phase === 'result' && <Result response={state.response} />}
    </section>
  )
}

export default ClassifierDemo
