import type { ReactNode } from 'react'
import styles from './Num.module.css'

type NumProps = {
  children: ReactNode
  className?: string
}

/**
 * Every number displayed anywhere on the site must render in `--font-data`
 * with tabular figures — "a number set in the body face is a defect"
 * (Global Constraints). That rule is easy to satisfy inside a component
 * that only ever renders numbers (ReadoutRail's own axis/marker text
 * already uses the mono styles directly) and easy to miss inside prose,
 * where a figure is embedded in a sentence written in the body face —
 * exactly ReadoutRail's `marker.caption` and Task 5's confidence caption
 * ("...right 98.5% of the time").
 *
 * `Num` is the fix: a caller wraps just the numeric substring, e.g.
 * `<>Accepted: <Num>32.41</Num> sits below...</>`, so the digits render in
 * mono while the surrounding sentence stays in the body face like ordinary
 * prose. This is a general primitive, not ReadoutRail-specific — anywhere
 * a number sits inside body-face text needs it.
 */
function Num({ children, className }: NumProps) {
  const classes = className ? `${styles.num} ${className}` : styles.num
  return <span className={classes}>{children}</span>
}

export default Num
