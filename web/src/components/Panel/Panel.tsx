import type { ReactNode } from 'react'
import Label from '../Label/Label'
import styles from './Panel.module.css'

type PanelProps = {
  label?: string
  children: ReactNode
  className?: string
}

/**
 * The panel surface used everywhere a group of content needs a raised,
 * bordered ground: --panel fill, 1px --rule border, 3px radius. No shadows,
 * no gradients — the instrument look comes from hairlines, not depth.
 */
function Panel({ label, children, className }: PanelProps) {
  const classes = className ? `${styles.panel} ${className}` : styles.panel
  return (
    <div className={classes}>
      {label && <Label className={styles.label}>{label}</Label>}
      {children}
    </div>
  )
}

export default Panel
