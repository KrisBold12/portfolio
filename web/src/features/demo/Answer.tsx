import type { PredictResponse } from '../../api/client'
import Num from '../../components/Num/Num'
import styles from './Answer.module.css'

type AnswerProps = {
  response: PredictResponse
}

/**
 * The headline result: the breed and its confidence, stated once, large, and
 * ahead of the rails that explain it.
 *
 * Fix round 1 (R1/R2, task-5-design-findings.md): before this, the breed
 * name appeared three times — a small grey caption, a rail marker label, the
 * first row of the breed list — and led in none of them, while the empty
 * drop zone stayed the biggest thing on screen. This states it once. The
 * verdict word is the only thing here carrying the gate's colour; the name
 * and the percentage are the measurement itself, not a Stanford/Oxford
 * attribution or the verdict, so per the plan's amended colour rule they
 * stay plain.
 *
 * UX round, P2: that layout put the breed name first and the verdict last
 * and small, so a rejected photo still read as an identification — upload
 * a cat and "Otterhound, 10.33%" led, with "rejected" a quiet word beside
 * it. When the gate says no, the rejection is the headline instead: a
 * plain "Not a dog", with the model's closest guess demoted to a smaller
 * line underneath and named as a guess rather than a result. The accepted
 * case is unchanged.
 */
function Answer({ response }: AnswerProps) {
  const top = response.predictions[0]

  if (!response.is_dog) {
    return (
      <div className={styles.answerRejected} aria-live="polite">
        <p className={styles.answerNotDog} style={{ color: 'var(--reject)' }}>
          Not a dog
        </p>
        {top && (
          <p className={styles.answerGuess}>
            Closest guess: {top.name}, <Num>{(top.probability * 100).toFixed(2)}%</Num>
          </p>
        )}
      </div>
    )
  }

  return (
    <p className={styles.answer} aria-live="polite">
      {top && (
        <span className={styles.answerName}>
          {top.name}, <Num className={styles.answerPct}>{(top.probability * 100).toFixed(2)}%</Num>
        </span>
      )}
      <span className={styles.answerVerdict} style={{ color: 'var(--signal)' }}>
        accepted
      </span>
    </p>
  )
}

export default Answer
