import type { ElementType, ReactNode } from 'react'
import styles from './Label.module.css'

type LabelProps = {
  children: ReactNode
  className?: string
  /**
   * The element rendered. Defaults to `span` — a pure caption with no
   * document-outline meaning. Pass a heading tag (e.g. `"h2"`) where the
   * eyebrow is the only visible heading for a section, so the section gets
   * a real heading landmark instead of a `<span>` masquerading as one.
   */
  as?: ElementType
}

/**
 * The mono uppercase eyebrow used across the site: section titles, table
 * headers, the ReadoutRail title, and Panel's optional label. Used on its
 * own wherever a small caps caption is needed.
 */
function Label({ children, className, as: Component = 'span' }: LabelProps) {
  const classes = className ? `${styles.label} ${className}` : styles.label
  return <Component className={classes}>{children}</Component>
}

export default Label
