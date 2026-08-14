import type { ReactNode } from 'react'
import styles from './Label.module.css'

type LabelProps = {
  children: ReactNode
  className?: string
}

/**
 * The mono uppercase eyebrow used across the site: section titles, table
 * headers, the ReadoutRail title, and Panel's optional label. Used on its
 * own wherever a small caps caption is needed.
 */
function Label({ children, className }: LabelProps) {
  const classes = className ? `${styles.label} ${className}` : styles.label
  return <span className={classes}>{children}</span>
}

export default Label
