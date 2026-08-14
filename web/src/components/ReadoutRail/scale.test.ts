import { describe, expect, it } from 'vitest'
import { labelAnchor, toPercent } from './scale'

describe('toPercent', () => {
  it('maps min to 0', () => {
    expect(toPercent(0, 0, 90)).toBe(0)
  })

  it('maps max to 100', () => {
    expect(toPercent(90, 0, 90)).toBe(100)
  })

  it('maps the midpoint to 50', () => {
    expect(toPercent(45, 0, 90)).toBe(50)
  })

  it('maps the midpoint to 50 on a non-zero-based range', () => {
    expect(toPercent(85, 70, 100)).toBeCloseTo(50)
  })

  it('clamps a value below min to 0 rather than going negative', () => {
    expect(toPercent(-10, 0, 90)).toBe(0)
  })

  it('clamps a value above max to 100 rather than overflowing', () => {
    expect(toPercent(150, 0, 90)).toBe(100)
  })

  it('clamps a value far below min', () => {
    expect(toPercent(-1000, 0, 90)).toBe(0)
  })

  it('clamps a value far above max', () => {
    expect(toPercent(1000, 0, 90)).toBe(100)
  })

  it('does not divide by zero on a zero-width range', () => {
    const result = toPercent(5, 5, 5)
    expect(Number.isFinite(result)).toBe(true)
    expect(result).toBe(0)
  })

  it('does not divide by zero on a zero-width range even when the value differs', () => {
    const result = toPercent(999, 5, 5)
    expect(Number.isFinite(result)).toBe(true)
    expect(result).toBe(0)
  })

  it('handles a real threshold value from the OOD gate', () => {
    expect(toPercent(49.27, 0, 90)).toBeCloseTo(54.74, 1)
  })
})

describe('labelAnchor', () => {
  it('anchors to the start near the left edge', () => {
    expect(labelAnchor(0)).toBe('start')
    expect(labelAnchor(12)).toBe('start')
  })

  it('anchors to the end near the right edge', () => {
    expect(labelAnchor(100)).toBe('end')
    expect(labelAnchor(88)).toBe('end')
  })

  it('centres everywhere in between', () => {
    expect(labelAnchor(13)).toBe('center')
    expect(labelAnchor(50)).toBe('center')
    expect(labelAnchor(87)).toBe('center')
  })
})
