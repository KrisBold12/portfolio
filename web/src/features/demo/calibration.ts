/**
 * Per-band calibration lookup for the confidence caption under the "how
 * sure" rail.
 *
 * The caption used to hardcode the 0.93-1.00 band's numbers regardless of
 * the prediction's actual confidence, so it quoted a fact about the wrong
 * group whenever a photo landed anywhere else on the axis. This derives the
 * caption from the band the prediction actually falls in.
 *
 * Source: projects/dog-breed/reports/imagenet_head_calibration.csv,
 * rows with experiment=imagenet_head, split=test,
 * temperature=0.7572732742105879 (the fitted temperature — the one the
 * deployed graph carries folded in). The API's `probability` is already at
 * this scale, not at temperature=1.0, so it must be looked up against
 * these rows and not the temperature=1.0 ones in the same file. Transcribed
 * verbatim below; calibration.test.ts checks the transcription against a
 * few of the source rows and the totals.
 *
 * These replaced the trained probe's bins when the deployed model became the
 * sliced ImageNet head. Its temperature is below 1, so the correction
 * sharpens rather than flattens, and the distribution shifted upward: the top
 * band now holds 6412 of the 8580 test images against the probe's 5814, and
 * no test image lands under 0.2 at all.
 */
export type CalibrationBin = {
  /** Bin lower edge, as a fraction (0-1), inclusive. */
  low: number
  /** Bin upper edge, as a fraction (0-1). Inclusive only for the last bin. */
  high: number
  /** Test images whose confidence landed in this bin. */
  n: number
  /** Fraction of those images the model got right. */
  accuracy: number
}

export const TEST_CALIBRATION_BINS: CalibrationBin[] = [
  { low: 0.2, high: 0.26666666666666666, n: 3, accuracy: 0.3333333333333333 },
  { low: 0.26666666666666666, high: 0.3333333333333333, n: 11, accuracy: 0.18181818181818182 },
  { low: 0.3333333333333333, high: 0.4, n: 41, accuracy: 0.5121951219512195 },
  { low: 0.4, high: 0.4666666666666667, n: 79, accuracy: 0.4177215189873418 },
  { low: 0.4666666666666667, high: 0.5333333333333333, n: 137, accuracy: 0.45985401459854014 },
  { low: 0.5333333333333333, high: 0.6, n: 186, accuracy: 0.5698924731182796 },
  { low: 0.6, high: 0.6666666666666666, n: 217, accuracy: 0.7096774193548387 },
  { low: 0.6666666666666666, high: 0.7333333333333333, n: 206, accuracy: 0.7572815533980582 },
  { low: 0.7333333333333333, high: 0.8, n: 285, accuracy: 0.7789473684210526 },
  { low: 0.8, high: 0.8666666666666667, n: 354, accuracy: 0.8587570621468926 },
  { low: 0.8666666666666667, high: 0.9333333333333333, n: 649, accuracy: 0.8983050847457628 },
  { low: 0.9333333333333333, high: 1.0, n: 6412, accuracy: 0.9893948845913911 },
]

/**
 * The CSV's total test-split size (sum of every bin's `n`, including the
 * ones below this file's support floor). Checked against in the test file
 * so a future edit to the bin table can't silently drop or double-count
 * images.
 */
export const TEST_SPLIT_SIZE = 8580

/**
 * A band needs a reasonably sized sample before its accuracy means
 * anything. 30 is the conventional rule-of-thumb floor for treating a
 * sample proportion as approximately normal; below it, one or two images
 * can swing the reported accuracy by ten points or more. Two of the
 * fitted-temperature test bins (n = 3, 11) fall under it.
 */
export const MIN_BAND_SUPPORT = 30

export type BandLookup =
  | { kind: 'measured'; low: number; high: number; n: number; accuracy: number }
  | { kind: 'insufficient'; low: number; high: number; n: number }

/**
 * Finds the test-split, fitted-temperature bin a calibrated confidence
 * (a fraction, 0-1) falls into, and reports whether that bin has enough
 * test images to say anything about it.
 *
 * A confidence below the lowest bin the test split ever produced (no test
 * image scored under ~0.067 at this temperature) is reported the same way
 * as a too-small bin: nothing was measured there, so there is nothing to
 * quote.
 */
export function lookupCalibrationBand(confidence: number): BandLookup {
  const clamped = Math.min(1, Math.max(0, confidence))

  for (let i = 0; i < TEST_CALIBRATION_BINS.length; i++) {
    const bin = TEST_CALIBRATION_BINS[i]
    const isLastBin = i === TEST_CALIBRATION_BINS.length - 1
    const inBin = isLastBin ? clamped >= bin.low && clamped <= bin.high : clamped >= bin.low && clamped < bin.high
    if (!inBin) continue

    return bin.n < MIN_BAND_SUPPORT
      ? { kind: 'insufficient', low: bin.low, high: bin.high, n: bin.n }
      : { kind: 'measured', low: bin.low, high: bin.high, n: bin.n, accuracy: bin.accuracy }
  }

  const lowestBin = TEST_CALIBRATION_BINS[0]
  return { kind: 'insufficient', low: 0, high: lowestBin.low, n: 0 }
}
