/**
 * Greedy row assignment for marker labels sharing one axis (fix round 1,
 * D4: markers no longer alternate above/below by index parity — all of
 * them stack above the axis, and a marker whose label would overlap an
 * already-placed one moves to the next row out instead).
 *
 * Pure and DOM-agnostic: callers measure each label's actual rendered
 * left/right edges (in any consistent unit, typically px from
 * `getBoundingClientRect`) and pass them in **already sorted by `left`**;
 * this function returns a row index per box, in the same order, 0 = the
 * row closest to the axis.
 *
 * The algorithm is a standard greedy interval-stacking pass: walk the
 * boxes left to right, and for each one take the first row whose
 * last-placed box does not overlap it; if every existing row conflicts,
 * start a new one.
 */
export type Box = { left: number; right: number }

export function assignRows(boxesSortedByLeft: Box[]): number[] {
  const rowRightEdge: number[] = []
  const rows: number[] = []

  for (const box of boxesSortedByLeft) {
    let row = 0
    while (row < rowRightEdge.length && box.left < rowRightEdge[row]) {
      row++
    }
    rowRightEdge[row] = box.right
    rows.push(row)
  }

  return rows
}
