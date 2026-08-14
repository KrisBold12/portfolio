import { describe, expect, it } from 'vitest'
import { assignRows } from './rows'

describe('assignRows', () => {
  it('keeps every box on row 0 when none overlap', () => {
    const boxes = [
      { left: 0, right: 10 },
      { left: 20, right: 30 },
      { left: 40, right: 50 },
    ]
    expect(assignRows(boxes)).toEqual([0, 0, 0])
  })

  it('bumps an overlapping box to row 1', () => {
    const boxes = [
      { left: 0, right: 20 },
      { left: 10, right: 30 }, // overlaps the first box
    ]
    expect(assignRows(boxes)).toEqual([0, 1])
  })

  it('bumps a third overlapping box to row 2 when rows 0 and 1 are both taken', () => {
    const boxes = [
      { left: 0, right: 20 },
      { left: 5, right: 25 }, // overlaps box 0 -> row 1
      { left: 8, right: 28 }, // overlaps box 0 (row 0) and box 1 (row 1) -> row 2
    ]
    expect(assignRows(boxes)).toEqual([0, 1, 2])
  })

  it('reuses row 0 once a later box clears the first box entirely', () => {
    const boxes = [
      { left: 0, right: 20 },
      { left: 10, right: 30 }, // overlaps box 0 -> row 1
      { left: 25, right: 35 }, // clear of box 0's right edge (20) -> row 0
    ]
    expect(assignRows(boxes)).toEqual([0, 1, 0])
  })

  it('treats touching edges (no gap) as non-overlapping', () => {
    const boxes = [
      { left: 0, right: 10 },
      { left: 10, right: 20 },
    ]
    expect(assignRows(boxes)).toEqual([0, 0])
  })

  it('returns an empty array for no boxes', () => {
    expect(assignRows([])).toEqual([])
  })

  it('handles a single box', () => {
    expect(assignRows([{ left: 5, right: 15 }])).toEqual([0])
  })
})
