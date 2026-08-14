import type { PredictResponse } from '../../api/client'
import Num from '../../components/Num/Num'
import styles from './Answer.module.css'

type AnswerProps = {
  response: PredictResponse
  /**
   * The disclosure line for a merged breed pair (breedMerge.ts), passed down
   * already resolved so this component does not need to know the merge
   * table exists — it only decides where the sentence goes if it is given
   * one. `null` when the top prediction is not a merged entry.
   */
  note?: string | null
}

/**
 * The headline result: the breed and its confidence, stated once, large, and
 * ahead of the rails that explain it.
 *
 * Before this, the breed name appeared three times — a small grey caption, a
 * rail marker label, the first row of the breed list — and led in none of
 * them, while the empty drop zone stayed the biggest thing on screen. This
 * states it once. The verdict word is the only thing here carrying the
 * gate's colour; the name and the percentage are the measurement itself, not
 * a Stanford/Oxford attribution or the verdict, so per the plan's amended
 * colour rule they stay plain.
 *
 * That layout used to put the breed name first and the verdict last and
 * small, so a rejected photo still read as an identification — upload a cat
 * and "Otterhound, 10.33%" led, with "rejected" a quiet word beside it. When
 * the gate says no, the rejection is the headline instead: a plain "Not a
 * dog", with the model's closest guess demoted to a smaller line underneath
 * and named as a guess rather than a result. The accepted case is unchanged.
 *
 * `response.predictions` arrives already passed through `applyBreedMerges`
 * (breedMerge.ts), so `top` here can be a joined entry without this
 * component doing anything special for it. `note` is the one addition, a
 * line disclosing the join when the joined entry is the answer.
 */
function Answer({ response, note }: AnswerProps) {
  const top = response.predictions[0]

  if (!response.is_dog) {
    return (
      <div className={styles.answerRejected}>
        <p className={`${styles.answerNotDog} ${styles.reject}`}>Not a dog</p>
        {top && (
          <p className={styles.answerGuess}>
            Closest guess: {top.name}, <Num>{(top.probability * 100).toFixed(2)}%</Num>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={styles.answerAccepted}>
      <p className={styles.answer}>
        {top && (
          <span className={styles.answerName}>
            {top.name}, <Num className={styles.answerPct}>{(top.probability * 100).toFixed(2)}%</Num>
          </span>
        )}
        <span className={`${styles.answerVerdict} ${styles.signal}`}>accepted</span>
      </p>
      {note && <p className={styles.answerNote}>{note}</p>}
    </div>
  )
}

export default Answer
