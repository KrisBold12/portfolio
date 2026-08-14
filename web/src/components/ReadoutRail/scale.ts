/**
 * Pure positioning maths for ReadoutRail.
 *
 * Turns a value plus a min/max range into a percentage along the axis,
 * clamped to [0, 100] so an out-of-range value cannot escape the track.
 *
 * A zero-width range (min === max) cannot be interpolated without dividing
 * by zero; it deliberately maps to 0 rather than producing NaN or Infinity.
 */
export function toPercent(value: number, min: number, max: number): number {
  const range = max - min
  if (range === 0) return 0

  const raw = ((value - min) / range) * 100
  return Math.min(100, Math.max(0, raw))
}

export type LabelAnchor = 'start' | 'center' | 'end'

/**
 * Chooses how a floating label centred on an axis percentage should be
 * anchored. A label in the outer band of the axis grows inward from its
 * near edge instead of centring on the exact point, so it cannot overflow
 * past the track (and collide with the min/max end labels, or the page
 * edge) at narrow widths. The default is to centre, matching the rail's
 * usual look everywhere except those outer bands.
 */
export function labelAnchor(pct: number): LabelAnchor {
  if (pct <= 12) return 'start'
  if (pct >= 88) return 'end'
  return 'center'
}
