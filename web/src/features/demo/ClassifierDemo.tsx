import { useEffect, useRef, useState } from 'react'
import { predict, PredictError, type PredictResponse } from '../../api/client'
import Panel from '../../components/Panel/Panel'
import Answer from './Answer'
import DropZone from './DropZone'
import Result from './Result'
import { downscale } from './downscale'
import styles from './ClassifierDemo.module.css'

type State =
  | { phase: 'idle' }
  | { phase: 'busy'; previewUrl: string; fileName: string }
  | { phase: 'result'; previewUrl: string; fileName: string; response: PredictResponse }
  | { phase: 'error'; previewUrl: string; fileName: string; message: string }

/**
 * Fix round 1, IMPORTANT (`--reject` as a generic error colour): a file
 * being too large or the backend being down is not a gate rejection, so
 * neither gets `--reject`. Weight and brightness lead the eye here instead
 * of a hue — the message's own words already carry the meaning.
 */
function busyOrErrorText(state: Extract<State, { phase: 'busy' | 'error' }>): string {
  return state.phase === 'busy' ? 'Reading the photo and asking the model.' : state.message
}

/**
 * The live demo (Task 5, docs/plans/web-frontend.md). Mounted into Task 4's
 * slot (web/src/pages/DogBreedProject.tsx, #classifier-demo-slot).
 *
 * A client-side decode failure (e.g. dropping a text file) is reported
 * through the same `PredictError('not-an-image')` the API client uses for
 * a server-side 400 — same cause, same message, so it reuses the kind
 * rather than inventing a second message for it.
 *
 * Fix round 1, R1/R2: once a photo has been tried (`phase !== 'idle'`), the
 * drop zone recedes to a modest control and `Answer` leads instead, stating
 * the breed and its confidence once, large, before `Result`'s rails.
 */
function ClassifierDemo() {
  const [state, setState] = useState<State>({ phase: 'idle' })
  const [previewBroken, setPreviewBroken] = useState(false)
  const previewUrlRef = useRef<string | null>(null)
  // Fix round 1, IMPORTANT (no unmount guard): busy->result/error setState
  // calls land after an await; if the component has unmounted in the
  // meantime (e.g. the visitor clicked the Back link mid-request), they
  // must be skipped rather than firing into a gone component.
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
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
      if (!mountedRef.current) return
      setState({ phase: 'result', previewUrl, fileName: file.name, response })
    } catch (error) {
      if (!mountedRef.current) return
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

      {state.phase === 'result' && <Answer response={state.response} />}

      <Panel>
        <div className={state.phase === 'idle' ? styles.uploadRow : styles.uploadRowCompact}>
          <DropZone onFile={handleFile} disabled={busy} compact={state.phase !== 'idle'} />

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
              <div className={styles.statusLineSlot}>
                {(state.phase === 'busy' || state.phase === 'error') && (
                  <p
                    className={state.phase === 'error' ? `${styles.statusLine} ${styles.statusIssue}` : styles.statusLine}
                    aria-live="polite"
                  >
                    {busyOrErrorText(state)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </Panel>

      {state.phase === 'result' && <Result response={state.response} />}
    </section>
  )
}

export default ClassifierDemo
