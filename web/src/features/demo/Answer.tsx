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
 */
function Answer({ response }: AnswerProps) {
  const top = response.predictions[0]
  const tone = response.is_dog ? 'var(--signal)' : 'var(--reject)'

  return (
    <p className={styles.answer} aria-live="polite">
      {top && (
        <span className={styles.answerName}>
          {top.name}, <Num className={styles.answerPct}>{(top.probability * 100).toFixed(2)}%</Num>
        </span>
      )}
      <span className={styles.answerVerdict} style={{ color: tone }}>
        {response.is_dog ? 'accepted' : 'rejected'}
      </span>
    </p>
  )
}

export default Answer
