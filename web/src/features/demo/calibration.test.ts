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
    // convnext_t_probe,test,1.2100411144302388,...,0.9333333333333333,1.0,5814,0.9851409,0.9852081183350533
    const topBin = TEST_CALIBRATION_BINS[TEST_CALIBRATION_BINS.length - 1]
    expect(topBin.low).toBeCloseTo(0.9333333333333333, 10)
    expect(topBin.high).toBe(1.0)
    expect(topBin.n).toBe(5814)
    expect(topBin.accuracy).toBeCloseTo(0.9852081183350533, 10)

    // convnext_t_probe,test,1.2100411144302388,...,0.2,0.26666666666666666,9,0.23803282,0.2222222222222222
    const smallBin = TEST_CALIBRATION_BINS[2]
    expect(smallBin.low).toBeCloseTo(0.2, 10)
    expect(smallBin.high).toBeCloseTo(0.26666666666666666, 10)
    expect(smallBin.n).toBe(9)
    expect(smallBin.accuracy).toBeCloseTo(0.2222222222222222, 10)
  })

  it('bins are contiguous with no gaps or overlaps', () => {
    for (let i = 1; i < TEST_CALIBRATION_BINS.length; i++) {
      expect(TEST_CALIBRATION_BINS[i].low).toBeCloseTo(TEST_CALIBRATION_BINS[i - 1].high, 10)
    }
  })
})

describe('lookupCalibrationBand', () => {
  it('reports the top band as measured, matching the original hardcoded caption', () => {
    const band = lookupCalibrationBand(0.9852)
    expect(band.kind).toBe('measured')
    if (band.kind === 'measured') {
      expect(band.low).toBeCloseTo(0.9333333333333333, 10)
      expect(band.high).toBe(1.0)
      expect(band.n).toBe(5814)
      expect(band.accuracy).toBeCloseTo(0.9852081183350533, 10)
    }
  })

  it('reports a well-supported low band as measured', () => {
    // bin_low=0.26666666666666666, n=31, at the MIN_BAND_SUPPORT floor
    const band = lookupCalibrationBand(0.30)
    expect(band.kind).toBe('measured')
    if (band.kind === 'measured') {
      expect(band.n).toBe(31)
      expect(band.n).toBeGreaterThanOrEqual(MIN_BAND_SUPPORT)
    }
  })

  it('reports a thin band (n below the support floor) as insufficient', () => {
    // confidence 10.33% from the reported cat example falls in bin_low=0.06666..,
    // bin_high=0.13333.., n=1.
    const band = lookupCalibrationBand(0.1033)
    expect(band.kind).toBe('insufficient')
    if (band.kind === 'insufficient') {
      expect(band.n).toBe(1)
    }
  })

  it('reports a mid-sized thin band (n=9) as insufficient', () => {
    const band = lookupCalibrationBand(0.22)
    expect(band.kind).toBe('insufficient')
    if (band.kind === 'insufficient') {
      expect(band.n).toBe(9)
    }
  })

  it('reports a confidence below every observed bin as insufficient with n=0', () => {
    const band = lookupCalibrationBand(0.02)
    expect(band.kind).toBe('insufficient')
    if (band.kind === 'insufficient') {
      expect(band.n).toBe(0)
      expect(band.high).toBeCloseTo(0.06666666666666667, 10)
    }
  })

  it('clamps out-of-range confidences instead of throwing', () => {
    expect(() => lookupCalibrationBand(-1)).not.toThrow()
    expect(() => lookupCalibrationBand(2)).not.toThrow()
    expect(lookupCalibrationBand(1).kind).toBe('measured')
  })
})
