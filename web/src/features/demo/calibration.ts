/**
 * Per-band calibration lookup for the confidence caption under the "how
 * sure" rail.
 *
 * UX round, P4: the caption used to hardcode the 0.93-1.00 band's numbers
 * regardless of the prediction's actual confidence, so it quoted a fact
 * about the wrong group whenever a photo landed anywhere else on the axis.
 * This derives the caption from the band the prediction actually falls in.
 *
 * Source: projects/dog-breed/reports/convnext_t_probe_calibration.csv,
 * rows with experiment=convnext_t_probe, split=test,
 * temperature=1.2100411144302388 (the fitted temperature — the one the
 * deployed graph carries folded in). The API's `probability` is already at
 * this scale, not at temperature=1.0, so it must be looked up against
 * these rows and not the temperature=1.0 ones in the same file. Transcribed
 * verbatim below; calibration.test.ts checks the transcription against a
 * few of the source rows and the totals.
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
  { low: 0.06666666666666667, high: 0.13333333333333333, n: 1, accuracy: 1.0 },
  { low: 0.13333333333333333, high: 0.2, n: 2, accuracy: 0.5 },
  { low: 0.2, high: 0.26666666666666666, n: 9, accuracy: 0.2222222222222222 },
  { low: 0.26666666666666666, high: 0.3333333333333333, n: 31, accuracy: 0.5161290322580645 },
  { low: 0.3333333333333333, high: 0.4, n: 55, accuracy: 0.34545454545454546 },
  { low: 0.4, high: 0.4666666666666667, n: 95, accuracy: 0.4421052631578947 },
  { low: 0.4666666666666667, high: 0.5333333333333333, n: 204, accuracy: 0.47058823529411764 },
  { low: 0.5333333333333333, high: 0.6, n: 236, accuracy: 0.5508474576271186 },
  { low: 0.6, high: 0.6666666666666666, n: 226, accuracy: 0.668141592920354 },
  { low: 0.6666666666666666, high: 0.7333333333333333, n: 270, accuracy: 0.6666666666666666 },
  { low: 0.7333333333333333, high: 0.8, n: 337, accuracy: 0.7507418397626113 },
  { low: 0.8, high: 0.8666666666666667, n: 476, accuracy: 0.7983193277310925 },
  { low: 0.8666666666666667, high: 0.9333333333333333, n: 824, accuracy: 0.8762135922330098 },
  { low: 0.9333333333333333, high: 1.0, n: 5814, accuracy: 0.9852081183350533 },
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
 * can swing the reported accuracy by ten points or more. Three of the
 * fitted-temperature test bins (n = 1, 2, 9) fall under it.
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
