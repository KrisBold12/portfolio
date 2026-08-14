import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Label from '../Label/Label'
import { assignRows } from './rows'
import { labelAnchor, toPercent } from './scale'
import type { ReadoutRailProps } from './types'
import styles from './ReadoutRail.module.css'

const ANCHOR_CLASS = {
  start: styles.anchorStart,
  center: styles.anchorCenter,
  end: styles.anchorEnd,
}

// A marker's leader (the vertical tick running from its value down to the
// axis, D3) is tall enough by default to clear the axis and grow taller
// per stacked row (D4), pushing the value further from the axis so it
// clears the row below it.
const LEADER_BASE_PX = 14
const LEADER_ROW_STEP_PX = 28

/**
 * The site's signature element: a horizontal measurement axis. One rail is
 * used for every quantity on the site (see docs/plans/web-frontend.md,
 * "The signature element: ReadoutRail").
 *
 * Fix round 1 reworked this component around three ideas from the design
 * review (see task-2-report.md for the full rationale, and
 * task-2-design-findings.md D1–D6 for the originals):
 *
 * - **Terminals** (D1): the axis has a short tick at each end, the same
 *   weight as the axis line, so it reads as a measured span rather than a
 *   rule that just stops.
 * - **Attachment** (D3): every marker has a leader — a 1px tick in the
 *   marker's own colour running from its value down to the exact point on
 *   the axis, ending in the triangle. The number is now visibly joined to
 *   its position instead of floating near it.
 * - **Density / one-sided stacking** (D4): markers no longer alternate
 *   above/below the axis by index parity — that encoded nothing about the
 *   data and could collide with the threshold's own label. All markers
 *   render above the axis; only the threshold's label sits below it. When
 *   two marker labels would overlap horizontally, the later one (by
 *   position, not by array order) moves to a second row further out via a
 *   taller leader. Row assignment is computed from each label's *actual
 *   measured* width (`assignRows` in rows.ts, driven by
 *   `getBoundingClientRect` in a layout effect, recomputed on resize) —
 *   not a percentage-distance guess — because the previous round's guess
 *   ("markers are more than N% apart so they're fine") was exactly the
 *   kind of assumption that produced the 360px collision this round fixes.
 *
 * Still true from the first pass, unchanged by this round:
 *
 * - Min/max end labels are flex siblings either side of the scale area, so
 *   a marker or threshold approaching 0%/100% can never render underneath
 *   them, at any viewport width.
 * - Any label whose position falls in the outer 12% of the axis anchors to
 *   its near edge instead of centring on the exact point (`labelAnchor` in
 *   scale.ts), so it grows inward rather than overflowing the track.
 * - A marker's caption is not float-positioned on the axis; it renders as
 *   a normal-flow line below the rail so it can wrap like ordinary prose
 *   without ever causing horizontal scroll (now a plain, uncoloured row —
 *   D5 — since the coloured swatch + label duplicated what the marker
 *   itself already shows on the rail).
 *
 * Colour is always supplied by the caller via `marker.color`; nothing here
 * infers meaning from a value.
 */
function ReadoutRail({ title, min, max, markers, threshold, zones, unit }: ReadoutRailProps) {
  const thresholdPct = threshold ? toPercent(threshold.value, min, max) : undefined
  const splitPct = thresholdPct ?? 50
  const leftZonePct = splitPct / 2
  const rightZonePct = splitPct + (100 - splitPct) / 2
  const captionedMarkers = markers.filter((marker) => marker.caption)

  const trackRef = useRef<HTMLDivElement>(null)
  const markerRefs = useRef<(HTMLDivElement | null)[]>([])
  const [rows, setRows] = useState<number[]>(() => markers.map(() => 0))

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return

    function recompute() {
      const trackEl = trackRef.current
      if (!trackEl) return
      const containerLeft = trackEl.getBoundingClientRect().left

      const measured = markerRefs.current.map((el, index) => {
        if (!el) return { index, left: 0, right: 0 }
        const rect = el.getBoundingClientRect()
        return { index, left: rect.left - containerLeft, right: rect.right - containerLeft }
      })
      measured.sort((a, b) => a.left - b.left)

      const rowsSortedByLeft = assignRows(measured.map(({ left, right }) => ({ left, right })))
      const nextRows: number[] = new Array(markers.length).fill(0)
      measured.forEach(({ index }, sortedPosition) => {
        nextRows[index] = rowsSortedByLeft[sortedPosition]
      })

      setRows((previous) => (previous.length === nextRows.length && previous.every((r, i) => r === nextRows[i]) ? previous : nextRows))
    }

    recompute()
    const observer = new ResizeObserver(recompute)
    observer.observe(track)
    return () => observer.disconnect()
    // Deps cover everything that can change a label's measured width or
    // position: the marker set itself, the axis range, and the unit
    // suffix appended to every formatted value.
  }, [markers, min, max, unit])

  return (
    <div className={styles.rail}>
      <div className={styles.header}>
        <Label>{title}</Label>
      </div>

      <div className={styles.body}>
        <span className={`${styles.endLabel} ${styles.endLabelMin}`}>{formatValue(min, unit)}</span>

        <div className={styles.scaleArea}>
          <div className={styles.trackVisual} ref={trackRef}>
            <div className={styles.axisLine} aria-hidden="true" />
            <span className={`${styles.axisTick} ${styles.axisTickStart}`} aria-hidden="true" />
            <span className={`${styles.axisTick} ${styles.axisTickEnd}`} aria-hidden="true" />

            {threshold && thresholdPct !== undefined && (
              <div
                className={styles.thresholdLine}
                style={{ left: `${thresholdPct}%` }}
                aria-hidden="true"
              />
            )}

            {markers.map((marker, index) => {
              const pct = toPercent(marker.value, min, max)
              const anchorClass = ANCHOR_CLASS[labelAnchor(pct)]
              const row = rows[index] ?? 0
              const leaderHeight = LEADER_BASE_PX + row * LEADER_ROW_STEP_PX
              const style = {
                left: `${pct}%`,
                '--marker-color': marker.color,
              } as CSSProperties

              return (
                <div
                  key={`${marker.label}-${index}`}
                  ref={(el) => {
                    markerRefs.current[index] = el
                  }}
                  className={`${styles.marker} ${anchorClass}`}
                  style={style}
                >
                  <span className={styles.markerTriangle} aria-hidden="true" />
                  <span className={styles.markerLeader} style={{ height: `${leaderHeight}px` }} aria-hidden="true" />
                  <span className={styles.markerValue}>
                    {formatValue(marker.value, unit)}
                    <span className={styles.markerLabelText}> {marker.label}</span>
                  </span>
                </div>
              )
            })}

            {threshold && thresholdPct !== undefined && (
              <span
                className={`${styles.thresholdLabel} ${ANCHOR_CLASS[labelAnchor(thresholdPct)]}`}
                style={{ left: `${thresholdPct}%` }}
              >
                {formatValue(threshold.value, unit)} {threshold.label}
              </span>
            )}
          </div>

          {zones && (
            <div className={styles.zonesRow}>
              <span
                className={`${styles.zoneLabel} ${ANCHOR_CLASS[labelAnchor(leftZonePct)]}`}
                style={{ left: `${leftZonePct}%` }}
              >
                {zones.left}
              </span>
              <span
                className={`${styles.zoneLabel} ${ANCHOR_CLASS[labelAnchor(rightZonePct)]}`}
                style={{ left: `${rightZonePct}%` }}
              >
                {zones.right}
              </span>
            </div>
          )}
        </div>

        <span className={`${styles.endLabel} ${styles.endLabelMax}`}>{formatValue(max, unit)}</span>
      </div>

      {captionedMarkers.length > 0 && (
        <ul className={styles.captionList}>
          {captionedMarkers.map((marker, index) => (
            <li key={`${marker.label}-${index}`} className={styles.captionItem}>
              {marker.caption}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatValue(value: number, unit?: string): string {
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2)
  return unit ? `${formatted}${unit}` : formatted
}

export default ReadoutRail
