import { describe, expect, it } from 'vitest'
import { computeTargetSize, MAX_DIMENSION } from './downscale'

describe('computeTargetSize', () => {
  it('leaves an image under the cap unchanged', () => {
    expect(computeTargetSize(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('leaves an image exactly at the cap unchanged', () => {
    expect(computeTargetSize(MAX_DIMENSION, 768)).toEqual({ width: MAX_DIMENSION, height: 768 })
  })

  it('scales a landscape image so the long side is exactly 1024, aspect ratio to the nearest pixel', () => {
    // scale = 1024/3000; height 2000 * scale = 682.666... -> 683
    expect(computeTargetSize(3000, 2000)).toEqual({ width: 1024, height: 683 })
  })

  it('scales a portrait image so the long side is exactly 1024, aspect ratio to the nearest pixel', () => {
    // scale = 1024/3000; width 2000 * scale = 682.666... -> 683
    expect(computeTargetSize(2000, 3000)).toEqual({ width: 683, height: 1024 })
  })

  it('scales a square image to a square capped at 1024', () => {
    expect(computeTargetSize(2000, 2000)).toEqual({ width: 1024, height: 1024 })
  })

  it('does not divide by zero on a degenerate zero-height image', () => {
    expect(computeTargetSize(2000, 0)).toEqual({ width: 1024, height: 0 })
  })
})
