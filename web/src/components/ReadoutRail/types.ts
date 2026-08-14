import type { ReactNode } from 'react'

/**
 * `caption` is `ReactNode`, not `string` (fix round 1, CRITICAL). Captions
 * are prose that routinely embed a figure ("32.41 sits below the 49.27
 * threshold..."), and every displayed number must render in `--font-data`
 * with tabular figures, never the body face. A plain string can't carry
 * that per-substring distinction. Callers wrap the numeric parts in `Num`
 * (`web/src/components/Num/`) and pass the rest as ordinary text; the
 * caption still renders as plain prose wherever ReadoutRail places it.
 */
export type Marker = { value: number; label: string; color: string; caption?: ReactNode }

export type ReadoutRailProps = {
  title: string
  min: number
  max: number
  markers: Marker[]
  threshold?: { value: number; label: string }
  zones?: { left: string; right: string }
  unit?: string
}
