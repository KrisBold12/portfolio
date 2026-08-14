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
// axis) is tall enough by default to clear the axis and grow taller per
// stacked row, pushing the value further from the axis so it clears the
// row below it.
const LEADER_BASE_PX = 14
const LEADER_ROW_STEP_PX = 28
// Gap between a leader's top and the label that sits above it, and between
// the threshold line and its label below the axis.
const LABEL_GAP_PX = 4
// Floor for the space below the axis when there is no threshold — just
// enough for the end/axis ticks to have room to breathe.
const MIN_BELOW_AXIS_PX = 8
// Fallback used only for the very first (unmeasured) layout pass, before
// the layout effect below has real getBoundingClientRect() numbers to
// work with. Never visible: useLayoutEffect corrects it before the browser
// paints.
const FALLBACK_LABEL_HEIGHT_PX = 20

type TrackLayout = {
  rows: number[]
  maxLabelHeight: number
  thresholdLabelHeight: number
  endLabelHeight: number
}

function leaderHeightForRow(row: number): number {
  return LEADER_BASE_PX + row * LEADER_ROW_STEP_PX
}

function layoutsEqual(a: TrackLayout, b: TrackLayout): boolean {
  return (
    a.maxLabelHeight === b.maxLabelHeight &&
    a.thresholdLabelHeight === b.thresholdLabelHeight &&
    a.endLabelHeight === b.endLabelHeight &&
    a.rows.length === b.rows.length &&
    a.rows.every((row, i) => row === b.rows[i])
  )
}

/**
 * The site's signature element: a horizontal measurement axis. One rail is
 * used for every quantity on the site (see docs/plans/web-frontend.md,
 * "The signature element: ReadoutRail").
 *
 * - **Terminals**: the axis has a short tick at each end.
 * - **Attachment**: every marker has a leader — a 1px tick in the
 *   marker's own colour running from its value down to the exact point on
 *   the axis, ending in the triangle.
 * - **Density / one-sided stacking**: all markers render above the axis;
 *   only the threshold's label sits below it. A marker whose label would
 *   overlap another (by measured position, not array order) moves to a
 *   second row further out via a taller leader. Row assignment
 *   (`assignRows` in rows.ts) is driven by each label's *actual measured*
 *   width via `getBoundingClientRect` in a layout effect, recomputed on
 *   resize — not a percentage-distance guess.
 * - **No rule shares a pixel with a glyph**: a leader or the threshold
 *   line can still pass geometrically behind a label at some viewport
 *   width — the threshold line spans the whole marker band, and a stacked
 *   marker's leader must cross the row below it to reach the axis. Two
 *   mechanisms make that invisible rather than forbidding it structurally
 *   (which would mean giving up the full-height threshold rule or the
 *   row-stacking, and neither should go): every label (`.markerLabel`,
 *   `.thresholdLabel`) gets an opaque `--panel` background with a little
 *   horizontal padding — an "instrument silkscreen" that masks whatever
 *   passes behind it — *and* every rule element (axis, ticks, threshold
 *   line, leader) renders in one DOM group before every label element
 *   renders in a second group, both direct children of `.trackVisual`.
 *   That ordering is what makes the masking work regardless of which
 *   marker ends up in which row: pure DOM/array order between individual
 *   markers can't be relied on (row assignment is measured, not
 *   authored), so "all labels paint after all rules" has to be a property
 *   of the tree shape, not of any one marker's position in it.
 * - **The track is sized to its content, not a constant**: `.trackVisual`'s
 *   height is computed per rail from what it actually holds — the tallest
 *   stacked marker row plus a measured label height above the axis, and
 *   either a measured threshold-label reservation or a small fixed
 *   minimum below it. A rail with one marker row and no threshold is
 *   visibly shorter than one with a threshold and stacked markers; the
 *   difference now carries information instead of being absorbed by empty
 *   track. One consequence: the axis is no longer guaranteed to sit at the
 *   vertical centre of `.trackVisual` (a rail with no threshold reserves
 *   much less space below the axis than above it), so the min/max end
 *   labels can no longer be centred against the *box* — they are aligned
 *   against the *axis's* own computed position instead
 *   (`endLabelMarginTop` below), or they would drift into the marker band
 *   on exactly the short, no-threshold rails this targets.
 *
 * Still true:
 *
 * - Min/max end labels are flex siblings either side of the scale area, so
 *   a marker or threshold approaching 0%/100% can never render underneath
 *   them, at any viewport width.
 * - Any label whose position falls in the outer 12% of the axis anchors to
 *   its near edge instead of centring on the exact point (`labelAnchor` in
 *   scale.ts).
 * - A marker's caption is normal-flow prose below the rail, not
 *   float-positioned on the axis, and renders as a plain row.
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
  const markerLabelRefs = useRef<(HTMLDivElement | null)[]>([])
  const thresholdLabelRef = useRef<HTMLSpanElement>(null)
  const endLabelRef = useRef<HTMLSpanElement>(null)
  const [layout, setLayout] = useState<TrackLayout>(() => ({
    rows: markers.map(() => 0),
    maxLabelHeight: FALLBACK_LABEL_HEIGHT_PX,
    thresholdLabelHeight: FALLBACK_LABEL_HEIGHT_PX,
    endLabelHeight: FALLBACK_LABEL_HEIGHT_PX,
  }))

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return

    function recompute() {
      const trackEl = trackRef.current
      if (!trackEl) return
      const containerLeft = trackEl.getBoundingClientRect().left

      const measured = markerLabelRefs.current.map((el, index) => {
        if (!el) return { index, left: 0, right: 0, height: FALLBACK_LABEL_HEIGHT_PX }
        const rect = el.getBoundingClientRect()
        return { index, left: rect.left - containerLeft, right: rect.right - containerLeft, height: rect.height }
      })
      const sortedByLeft = [...measured].sort((a, b) => a.left - b.left)

      const rowsSortedByLeft = assignRows(sortedByLeft.map(({ left, right }) => ({ left, right })))
      const nextRows: number[] = new Array(markers.length).fill(0)
      sortedByLeft.forEach(({ index }, sortedPosition) => {
        nextRows[index] = rowsSortedByLeft[sortedPosition]
      })

      const maxLabelHeight = measured.reduce((max, m) => Math.max(max, m.height), 0) || FALLBACK_LABEL_HEIGHT_PX
      const thresholdLabelHeight = thresholdLabelRef.current?.getBoundingClientRect().height || FALLBACK_LABEL_HEIGHT_PX
      const endLabelHeight = endLabelRef.current?.getBoundingClientRect().height || FALLBACK_LABEL_HEIGHT_PX

      const next: TrackLayout = { rows: nextRows, maxLabelHeight, thresholdLabelHeight, endLabelHeight }
      setLayout((previous) => (layoutsEqual(previous, next) ? previous : next))
    }

    recompute()
    const observer = new ResizeObserver(recompute)
    observer.observe(track)
    return () => observer.disconnect()
    // Deps cover everything that can change a label's measured size or
    // position: the marker set itself, the axis range, the unit suffix
    // appended to every formatted value, and whether a threshold exists.
  }, [markers, min, max, unit, threshold])

  const maxRow = layout.rows.length > 0 ? Math.max(0, ...layout.rows) : 0
  const aboveAxisPx = LEADER_BASE_PX + maxRow * LEADER_ROW_STEP_PX + LABEL_GAP_PX + layout.maxLabelHeight
  const belowAxisPx = threshold ? LABEL_GAP_PX + layout.thresholdLabelHeight : MIN_BELOW_AXIS_PX
  const trackHeightPx = aboveAxisPx + belowAxisPx
  // .body centres its flex children by default, which used to land an end
  // label near the axis because .trackVisual was a fixed, roughly
  // symmetric box. Now that the box is asymmetric (see the doc comment
  // above), the end labels are aligned to the axis's own y-position
  // instead of the box's midpoint: .body uses align-items: flex-start, and
  // each end label gets a marginTop that centres its own (measured) line
  // height on aboveAxisPx.
  const endLabelMarginTop = Math.max(0, aboveAxisPx - layout.endLabelHeight / 2)

  return (
    <div className={styles.rail}>
      <div className={styles.header}>
        <Label>{title}</Label>
      </div>

      <div className={styles.body}>
        <span
          ref={endLabelRef}
          className={`${styles.endLabel} ${styles.endLabelMin}`}
          style={{ marginTop: `${endLabelMarginTop}px` }}
        >
          {formatValue(min, unit)}
        </span>

        <div className={styles.scaleArea}>
          <div className={styles.trackVisual} ref={trackRef} style={{ height: `${trackHeightPx}px` }}>
            {/* Rules layer: painted first, so it always sits behind the
                labels layer below, regardless of which marker ends up in
                which row. */}
            <div className={styles.axisLine} style={{ top: `${aboveAxisPx}px` }} aria-hidden="true" />
            <span
              className={`${styles.axisTick} ${styles.axisTickStart}`}
              style={{ top: `${aboveAxisPx}px` }}
              aria-hidden="true"
            />
            <span
              className={`${styles.axisTick} ${styles.axisTickEnd}`}
              style={{ top: `${aboveAxisPx}px` }}
              aria-hidden="true"
            />

            {threshold && thresholdPct !== undefined && (
              <div
                className={styles.thresholdLine}
                style={{ left: `${thresholdPct}%` }}
                aria-hidden="true"
              />
            )}

            {markers.map((marker, index) => {
              const pct = toPercent(marker.value, min, max)
              const row = layout.rows[index] ?? 0
              const leaderHeight = leaderHeightForRow(row)
              return (
                <span
                  key={`${marker.label}-${index}-stem`}
                  className={styles.markerStem}
                  style={
                    {
                      left: `${pct}%`,
                      bottom: `${belowAxisPx}px`,
                      height: `${leaderHeight}px`,
                      '--marker-color': marker.color,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                >
                  <span className={styles.markerTriangle} aria-hidden="true" />
                </span>
              )
            })}

            {/* Labels layer: painted after every rule above, and each
                label carries its own opaque --panel background — the two
                together are what guarantee a rule never shows through a
                glyph, independent of DOM order between individual
                markers. */}
            {markers.map((marker, index) => {
              const pct = toPercent(marker.value, min, max)
              const anchorClass = ANCHOR_CLASS[labelAnchor(pct)]
              const row = layout.rows[index] ?? 0
              const leaderHeight = leaderHeightForRow(row)
              const style = {
                left: `${pct}%`,
                bottom: `${belowAxisPx + leaderHeight + LABEL_GAP_PX}px`,
                '--marker-color': marker.color,
              } as CSSProperties

              return (
                <div
                  key={`${marker.label}-${index}-label`}
                  ref={(el) => {
                    markerLabelRefs.current[index] = el
                  }}
                  className={`${styles.markerLabel} ${anchorClass}`}
                  style={style}
                >
                  <span className={styles.markerValue}>
                    {formatValue(marker.value, unit)}
                    <span className={styles.markerLabelText}> {marker.label}</span>
                  </span>
                </div>
              )
            })}

            {threshold && thresholdPct !== undefined && (
              <span
                ref={thresholdLabelRef}
                className={`${styles.thresholdLabel} ${ANCHOR_CLASS[labelAnchor(thresholdPct)]}`}
                style={{ left: `${thresholdPct}%`, top: `${aboveAxisPx + LABEL_GAP_PX}px` }}
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

        <span
          className={`${styles.endLabel} ${styles.endLabelMax}`}
          style={{ marginTop: `${endLabelMarginTop}px` }}
        >
          {formatValue(max, unit)}
        </span>
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
