import { describe, expect, it } from 'vitest'
import {
  MIN_BAND_SUPPORT,
  TEST_CALIBRATION_BINS,
  TEST_SPLIT_SIZE,
  lookupCalibrationBand,
} from './calibration'

describe('TEST_CALIBRATION_BINS', () => {
  it('sums to the full test split', () => {
    const total = TEST_CALIBRATION_BINS.reduce((sum, bin) => sum + bin.n, 0)
    expect(total).toBe(TEST_SPLIT_SIZE)
  })

  it('matches the source CSV row-by-row for a spot check', () => {
    // imagenet_head,test,0.7572732742105879,...,0.9333333333333333,1.0,6412,0.9871709,0.9893948845913911
    const topBin = TEST_CALIBRATION_BINS[TEST_CALIBRATION_BINS.length - 1]
    expect(topBin.low).toBeCloseTo(0.9333333333333333, 10)
    expect(topBin.high).toBe(1.0)
    expect(topBin.n).toBe(6412)
    expect(topBin.accuracy).toBeCloseTo(0.9893948845913911, 10)

    // imagenet_head,test,0.7572732742105879,...,0.2,0.26666666666666666,3,0.24154104,0.3333333333333333
    const smallBin = TEST_CALIBRATION_BINS[0]
    expect(smallBin.low).toBeCloseTo(0.2, 10)
    expect(smallBin.high).toBeCloseTo(0.26666666666666666, 10)
    expect(smallBin.n).toBe(3)
    expect(smallBin.accuracy).toBeCloseTo(0.3333333333333333, 10)
  })

  it('bins are contiguous with no gaps or overlaps', () => {
    for (let i = 1; i < TEST_CALIBRATION_BINS.length; i++) {
      expect(TEST_CALIBRATION_BINS[i].low).toBeCloseTo(TEST_CALIBRATION_BINS[i - 1].high, 10)
    }
  })
})

describe('lookupCalibrationBand', () => {
  it('reports the top band as measured', () => {
    const band = lookupCalibrationBand(0.9872)
    expect(band.kind).toBe('measured')
    if (band.kind === 'measured') {
      expect(band.low).toBeCloseTo(0.9333333333333333, 10)
      expect(band.high).toBe(1.0)
      expect(band.n).toBe(6412)
      expect(band.accuracy).toBeCloseTo(0.9893948845913911, 10)
    }
  })

  it('reports a well-supported low band as measured', () => {
    // bin_low=0.3333333333333333, n=41, the lowest band clearing MIN_BAND_SUPPORT
    const band = lookupCalibrationBand(0.35)
    expect(band.kind).toBe('measured')
    if (band.kind === 'measured') {
      expect(band.n).toBe(41)
      expect(band.n).toBeGreaterThanOrEqual(MIN_BAND_SUPPORT)
    }
  })

  it('reports a thin band (n below the support floor) as insufficient', () => {
    // bin_low=0.2, bin_high=0.26666.., n=3
    const band = lookupCalibrationBand(0.22)
    expect(band.kind).toBe('insufficient')
    if (band.kind === 'insufficient') {
      expect(band.n).toBe(3)
    }
  })

  it('reports the second thin band (n=11) as insufficient', () => {
    const band = lookupCalibrationBand(0.30)
    expect(band.kind).toBe('insufficient')
    if (band.kind === 'insufficient') {
      expect(band.n).toBe(11)
    }
  })

  it('reports a confidence below every observed bin as insufficient with n=0', () => {
    // The reported cat example returns 10.33%, and at this temperature no test
    // image scored under 0.2 at all, so there is nothing measured down there.
    const band = lookupCalibrationBand(0.1033)
    expect(band.kind).toBe('insufficient')
    if (band.kind === 'insufficient') {
      expect(band.n).toBe(0)
      expect(band.high).toBeCloseTo(0.2, 10)
    }
  })

  it('clamps out-of-range confidences instead of throwing', () => {
    expect(() => lookupCalibrationBand(-1)).not.toThrow()
    expect(() => lookupCalibrationBand(2)).not.toThrow()
    expect(lookupCalibrationBand(1).kind).toBe('measured')
  })
})
