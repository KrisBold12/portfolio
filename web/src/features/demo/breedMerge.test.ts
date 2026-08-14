import { describe, expect, it } from 'vitest'
import type { Prediction } from '../../api/client'
import { CLASS_MERGES, applyBreedMerges, mergeIsTopAnswer } from './breedMerge'

function pred(id: string, name: string, probability: number): Prediction {
  return { id, name, probability }
}

describe('applyBreedMerges', () => {
  it('sums both entries of a merged pair into one, labelled and ranked correctly', () => {
    const predictions = [
      pred('eskimo_dog', 'Eskimo Dog', 0.55),
      pred('pug', 'Pug', 0.2),
      pred('siberian_husky', 'Siberian Husky', 0.15),
      pred('beagle', 'Beagle', 0.06),
      pred('chihuahua', 'Chihuahua', 0.04),
    ]

    const result = applyBreedMerges(predictions)

    expect(result.applied).toBe(CLASS_MERGES[0])
    expect(result.predictions[0].id).toBe('husky')
    expect(result.predictions[0].name).toBe('Husky')
    expect(result.predictions[0].probability).toBeCloseTo(0.7, 10)
    // The pair collapsed to one row, so only the ids outside it remain besides it.
    expect(result.predictions.map((p) => p.id)).toEqual(['husky', 'pug', 'beagle', 'chihuahua'])
  })

  it('re-sorts correctly when the merge outranks entries it did not outrank before', () => {
    // Before merging, siberian_husky (0.15) sits below pug (0.2) and beagle
    // (0.18) but above chihuahua (0.04). Summed with eskimo_dog (0.4), the
    // merged entry (0.55) now outranks pug and beagle too.
    const predictions = [
      pred('eskimo_dog', 'Eskimo Dog', 0.4),
      pred('pug', 'Pug', 0.2),
      pred('beagle', 'Beagle', 0.18),
      pred('siberian_husky', 'Siberian Husky', 0.15),
      pred('chihuahua', 'Chihuahua', 0.04),
    ]

    const result = applyBreedMerges(predictions)

    expect(result.predictions.map((p) => p.id)).toEqual(['husky', 'pug', 'beagle', 'chihuahua'])
    expect(result.predictions[0].probability).toBeCloseTo(0.55, 10)
    // Merging two of the five raw rows into one leaves four, not five: the
    // list shows however many rows the merge actually produces rather than
    // padding back up with a class the model ranked lower than all of these.
    expect(result.predictions).toHaveLength(4)
  })

  it('relabels a solo appearance of either id without summing anything extra', () => {
    const predictions = [pred('eskimo_dog', 'Eskimo Dog', 0.7), pred('pug', 'Pug', 0.1)]

    const result = applyBreedMerges(predictions)

    expect(result.applied).toBe(CLASS_MERGES[0])
    expect(result.predictions[0]).toEqual({
      id: 'husky',
      name: 'Husky',
      probability: 0.7,
    })
  })

  it('leaves a response with neither class unchanged', () => {
    const predictions = [pred('pug', 'Pug', 0.6), pred('beagle', 'Beagle', 0.4)]

    const result = applyBreedMerges(predictions)

    expect(result.applied).toBeNull()
    expect(result.predictions).toEqual(predictions)
  })

  it('does not merge a different pair with the same asymmetry signature (out of scope)', () => {
    const predictions = [pred('collie', 'Collie', 0.5), pred('border_collie', 'Border Collie', 0.3)]

    const result = applyBreedMerges(predictions)

    expect(result.applied).toBeNull()
    expect(result.predictions).toEqual(predictions)
  })

  it('clamps the summed probability to 1 against floating-point overshoot', () => {
    const predictions = [pred('eskimo_dog', 'Eskimo Dog', 0.6), pred('siberian_husky', 'Siberian Husky', 0.4)]

    const result = applyBreedMerges(predictions)

    expect(result.predictions[0].probability).toBeLessThanOrEqual(1)
    expect(result.predictions[0].probability).toBeCloseTo(1, 10)
  })
})

describe('mergeIsTopAnswer', () => {
  it('is true when the merged entry ranks first', () => {
    const result = applyBreedMerges([pred('eskimo_dog', 'Eskimo Dog', 0.9), pred('pug', 'Pug', 0.05)])
    expect(mergeIsTopAnswer(result)).toBe(true)
  })

  it('is false when a merge fired but did not reach the top', () => {
    const result = applyBreedMerges([
      pred('pug', 'Pug', 0.9),
      pred('eskimo_dog', 'Eskimo Dog', 0.05),
      pred('siberian_husky', 'Siberian Husky', 0.02),
    ])
    expect(mergeIsTopAnswer(result)).toBe(false)
  })

  it('is false when no merge fired', () => {
    const result = applyBreedMerges([pred('pug', 'Pug', 0.9)])
    expect(mergeIsTopAnswer(result)).toBe(false)
  })
})
