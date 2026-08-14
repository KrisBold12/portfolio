import type { PredictResponse } from '../../api/client'
import Num from '../../components/Num/Num'
import Panel from '../../components/Panel/Panel'
import ReadoutRail from '../../components/ReadoutRail/ReadoutRail'
import styles from './Result.module.css'

type ResultProps = {
  response: PredictResponse
}

/**
 * The two ReadoutRails plus the breed list (Task 5 brief, point 6). Verdict
 * and calibration sentences ride as marker captions, the affordance
 * ReadoutRailDemo already established for exactly this: a figure inside a
 * plain sentence, wrapped word by word in Num where the digits are
 * (web/src/pages/ReadoutRailDemo.tsx).
 */
function Result({ response }: ResultProps) {
  const { is_dog, ood, predictions } = response
  const top = predictions[0]
  const tone = is_dog ? 'var(--signal)' : 'var(--reject)'
  const distance = ood.distance.toFixed(2)
  const threshold = ood.threshold.toFixed(2)

  return (
    <div className={styles.result}>
      <Panel label="Is it a dog">
        <ReadoutRail
          title="Distance to nearest breed"
          min={0}
          max={90}
          threshold={{ value: ood.threshold, label: 'threshold' }}
          zones={{ left: 'accepted', right: 'rejected' }}
          markers={[
            {
              value: ood.distance,
              label: 'your photo',
              color: tone,
              caption: is_dog ? (
                <>
                  Accepted: <Num>{distance}</Num> sits below the <Num>{threshold}</Num> threshold, so the gate
                  treats this photo as a dog.
                </>
              ) : (
                <>
                  Rejected: <Num>{distance}</Num> sits above the <Num>{threshold}</Num> threshold, so the gate
                  does not treat this photo as a dog.
                </>
              ),
            },
          ]}
        />
      </Panel>

      {top && (
        <Panel label="How sure">
          <ReadoutRail
            title="Top prediction confidence"
            min={0}
            max={100}
            unit="%"
            markers={[
              {
                value: top.probability * 100,
                label: top.name,
                color: tone,
                caption: (
                  <>
                    Predictions in the <Num>0.93&ndash;1.00</Num> band were right <Num>98.5%</Num> of the time, on
                    the 8580-image test split.
                  </>
                ),
              },
            ]}
          />
        </Panel>
      )}

      <Panel label={is_dog ? 'Top 5 breeds' : 'Closest matches'}>
        {!is_dog && (
          <p className={styles.gateNote}>
            The gate did not recognise a dog here. These are the closest matches anyway.
          </p>
        )}
        <ol className={styles.breedList}>
          {predictions.map((prediction) => (
            <li key={prediction.id} className={styles.breedRow}>
              <span className={styles.breedName}>{prediction.name}</span>
              <span className={styles.breedPct}>
                <Num>{(prediction.probability * 100).toFixed(1)}%</Num>
              </span>
              <span className={styles.breedBarTrack}>
                <span
                  className={styles.breedBarFill}
                  style={{ width: `${Math.min(100, prediction.probability * 100)}%` }}
                />
              </span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  )
}

export default Result
