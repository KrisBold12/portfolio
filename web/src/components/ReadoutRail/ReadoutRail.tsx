import type { CSSProperties } from 'react'
import Label from '../Label/Label'
import { labelAnchor, toPercent } from './scale'
import type { ReadoutRailProps } from './types'
import styles from './ReadoutRail.module.css'

const ANCHOR_CLASS = {
  start: styles.anchorStart,
  center: styles.anchorCenter,
  end: styles.anchorEnd,
}

/**
 * The site's signature element: a horizontal measurement axis. One rail is
 * used for every quantity on the site (see docs/plans/web-frontend.md,
 * "The signature element: ReadoutRail").
 *
 * Layout decisions the spec leaves open (see task-2-report.md for the full
 * rationale):
 *
 * - Min/max end labels are flex siblings either side of the scale area, not
 *   positioned on top of it. Their width is reserved by construction, so a
 *   marker or threshold approaching 0%/100% can never render underneath
 *   them, at any viewport width.
 * - Marker value/label text alternates above and below the axis by index
 *   parity (marker 0 above, marker 1 below, ...). Every rail in this plan
 *   carries at most two markers, so the two are always on opposite tiers
 *   and cannot collide with each other. The triangle glyph itself always
 *   sits on the axis line, at its true interpolated position.
 * - Any label whose position falls in the outer 12% of the axis anchors to
 *   its near edge instead of centring on the exact point (see
 *   `labelAnchor` in scale.ts), so it grows inward rather than overflowing
 *   the track.
 * - A marker's optional caption is not float-positioned on the axis (a full
 *   sentence would overflow a narrow track). It renders as a normal-flow
 *   line below the rail, tagged with the marker's colour and label, so it
 *   can wrap like ordinary prose without ever causing horizontal scroll.
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

  return (
    <div className={styles.rail}>
      <div className={styles.header}>
        <Label>{title}</Label>
      </div>

      <div className={styles.body}>
        <span className={`${styles.endLabel} ${styles.endLabelMin}`}>{formatValue(min, unit)}</span>

        <div className={styles.scaleArea}>
          <div className={styles.trackVisual}>
            <div className={styles.axisLine} aria-hidden="true" />

            {threshold && thresholdPct !== undefined && (
              <div
                className={styles.thresholdLine}
                style={{ left: `${thresholdPct}%` }}
                aria-hidden="true"
              />
            )}

            {markers.map((marker, index) => {
              const pct = toPercent(marker.value, min, max)
              const tierClass = index % 2 === 0 ? styles.markerAbove : styles.markerBelow
              const anchorClass = ANCHOR_CLASS[labelAnchor(pct)]
              const style = {
                left: `${pct}%`,
                '--marker-color': marker.color,
              } as CSSProperties

              return (
                <div
                  key={`${marker.label}-${index}`}
                  className={`${styles.marker} ${tierClass} ${anchorClass}`}
                  style={style}
                >
                  <span className={styles.markerTriangle} aria-hidden="true" />
                  <span className={styles.markerValue}>
                    {formatValue(marker.value, unit)}
                    <span className={styles.markerLabelText}> {marker.label}</span>
                  </span>
                </div>
              )
            })}
          </div>

          {threshold && thresholdPct !== undefined && (
            <div className={styles.thresholdLabelRow}>
              <span
                className={`${styles.thresholdLabel} ${ANCHOR_CLASS[labelAnchor(thresholdPct)]}`}
                style={{ left: `${thresholdPct}%` }}
              >
                {formatValue(threshold.value, unit)} {threshold.label}
              </span>
            </div>
          )}

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
            <li
              key={`${marker.label}-${index}`}
              className={styles.captionItem}
              style={{ '--marker-color': marker.color } as CSSProperties}
            >
              <span className={styles.captionSwatch} aria-hidden="true" />
              <span className={styles.captionLabel}>{marker.label}</span>
              <span className={styles.captionText}>{marker.caption}</span>
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
