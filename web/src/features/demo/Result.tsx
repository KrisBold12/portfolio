import type { ReactNode } from 'react'
import type { PredictResponse } from '../../api/client'
import Label from '../../components/Label/Label'
import Num from '../../components/Num/Num'
import Panel from '../../components/Panel/Panel'
import ReadoutRail from '../../components/ReadoutRail/ReadoutRail'
import { lookupCalibrationBand, type BandLookup } from './calibration'
import styles from './Result.module.css'

function formatFraction(value: number): string {
  return value.toFixed(2)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/**
 * UX round, P4: this used to be a hardcoded sentence about the 0.93-1.00
 * band regardless of what the prediction's confidence actually was — the
 * best line on the site when confidence was high and a false statement
 * otherwise. It now describes the band the prediction's own confidence
 * falls into, from the measured per-bin table in calibration.ts. Where a
 * band holds too few test images to support a claim (below
 * `MIN_BAND_SUPPORT`), it says that instead of quoting an accuracy from a
 * handful of images.
 */
function confidenceCaption(band: BandLookup): ReactNode {
  const lowStr = formatFraction(band.low)
  const highStr = formatFraction(band.high)

  if (band.kind === 'measured') {
    return (
      <>
        Predictions in the <Num>{lowStr}&ndash;{highStr}</Num> band were right{' '}
        <Num>{formatPercent(band.accuracy)}</Num> of the time, on the <Num>8580</Num>-image test split.
      </>
    )
  }

  if (band.n === 0) {
    return (
      <>
        No test image landed in the <Num>{lowStr}&ndash;{highStr}</Num> confidence band, so there is nothing
        measured to compare this prediction to.
      </>
    )
  }

  return (
    <>
      Only <Num>{band.n}</Num> test {band.n === 1 ? 'image' : 'images'} landed in the{' '}
      <Num>{lowStr}&ndash;{highStr}</Num> band, too few to say what a confidence like this one means.
    </>
  )
}

type ResultProps = {
  response: PredictResponse
}

/**
 * The reasoning underneath `Answer`'s headline: the two ReadoutRails and the
 * breed list.
 *
 * Fix round 1, R3 (minor, ruled): the distance and confidence rails now
 * share one panel instead of two. They are two readings of the same event,
 * and sharing a panel puts the accept/reject verdict directly beside the
 * confidence it qualifies rather than splitting one answer across two
 * bordered boxes. The breed list stays in its own panel — it is a list, not
 * a rail.
 *
 * Verdict and calibration sentences ride as marker captions, the affordance
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
      <Panel>
        <div className={styles.dualRail}>
          <div>
            <Label className={styles.sectionLabel}>Is it a dog</Label>
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
          </div>

          {top && (
            <div>
              <Label className={styles.sectionLabel}>How sure</Label>
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
                    caption: confidenceCaption(lookupCalibrationBand(top.probability)),
                  },
                ]}
              />
            </div>
          )}
        </div>
      </Panel>

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
                <Num>{(prediction.probability * 100).toFixed(2)}%</Num>
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
