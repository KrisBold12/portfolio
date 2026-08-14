import type { Prediction } from '../../api/client'

/**
 * A curated fix for a labelling defect in Stanford Dogs, not a general
 * lookalike-merging rule.
 *
 * Stanford Dogs inherits its 120 classes from ImageNet, which built each
 * class by searching a WordNet synset's words and having non-expert
 * annotators check the results. `n02109961` is the synset "Eskimo dog,
 * husky" — "husky" is a lemma *inside* that synset, not a name for a
 * different dog — so ImageNet filled both `eskimo_dog` and
 * `siberian_husky` from overlapping searches.
 *
 * Looking through the Eskimo dog folder finds Siberian Huskies: one image
 * has two blue eyes, another has heterochromia, and neither trait occurs in
 * the Canadian Eskimo Dog. So the folder is at least contaminated. Whether
 * it also holds genuine Canadian Eskimo Dogs is not something these photos
 * can settle, and labelling the merged class "Siberian Husky" would assert
 * that it does not. The display name is `Husky`, the lemma both synsets
 * share (`n02110185` is "Siberian husky"): true of both breeds, and it
 * claims nothing about which one a given photo shows.
 *
 * On the 8580-image test split this pair carries a signature no other
 * confusion in the model comes close to: a Siberian Husky photo is called
 * Eskimo Dog 65% of the time, while an Eskimo Dog photo is called Siberian
 * Husky 2% of the time, and the two class centres sit 5.1 apart against a
 * median of 31.5 across all 7140 pairs, the closest of any of them.
 *
 * Five other pairs share some of that signature (Toy/Miniature Poodle, the
 * two Staffordshires, Walker Hound/English Foxhound, Collie/Border Collie,
 * Malamute/Siberian Husky) and none of them belongs here. They are real
 * breed distinctions that a single photo just cannot always settle, not a
 * dataset error: a Toy and a Miniature Poodle differ mainly by size, and a
 * Collie is not a Border Collie. This table stays a table of one until the
 * same three checks line up for another pair: an asymmetry this extreme,
 * a synset that lists the two names as synonyms, and folder contents that
 * confirm one breed rather than two. Do not add an entry on visual
 * similarity alone.
 */
export type BreedMerge = {
  /** The two class ids this entry joins, exactly as the API sends them. */
  ids: readonly [string, string]
  /** id/name used for the combined entry, standing in for either original. */
  id: string
  name: string
  /** Shown once, near the result, whenever this entry's merge fired. */
  note: string
}

export const CLASS_MERGES: readonly BreedMerge[] = [
  {
    ids: ['eskimo_dog', 'siberian_husky'],
    id: 'husky',
    name: 'Husky',
    note:
      'Stanford Dogs splits this dog across two class names, Eskimo Dog and Siberian Husky, so this demo counts both as the same answer and adds their probabilities together.',
  },
]

export type BreedMergeResult = {
  /** `predictions`, with any matching pair joined and the list re-sorted. */
  predictions: Prediction[]
  /** The entry that fired, or `null` if none of its ids were present. */
  applied: BreedMerge | null
}

/**
 * Joins a merged pair's entries if either (or both) appear in `predictions`,
 * sums their probability, and re-sorts so a merge that now outranks
 * something it did not outrank before ends up in the right place. A photo
 * where both an unrelated pair's classes and unrelated other classes appear
 * is untouched beyond the one entry the table covers.
 *
 * `Math.min(1, ...)` guards the `[0, 1]` bound the `Prediction` schema
 * requires: two probabilities from the same softmax cannot sum past 1
 * mathematically, but floating-point addition of two numbers that add up to
 * exactly 1 can land a hair over it.
 */
export function applyBreedMerges(predictions: Prediction[]): BreedMergeResult {
  let merged = predictions
  let applied: BreedMerge | null = null

  for (const entry of CLASS_MERGES) {
    const [idA, idB] = entry.ids
    const a = merged.find((p) => p.id === idA)
    const b = merged.find((p) => p.id === idB)
    if (!a && !b) continue

    const probability = Math.min(1, (a?.probability ?? 0) + (b?.probability ?? 0))
    const combined: Prediction = { id: entry.id, name: entry.name, probability }
    merged = [combined, ...merged.filter((p) => p.id !== idA && p.id !== idB)]
    applied = entry
    break
  }

  const sorted = [...merged].sort((x, y) => y.probability - x.probability)
  return { predictions: sorted, applied }
}

/**
 * Whether the merge that fired (if any) is also the top-ranked entry after
 * re-sorting. Its probability is then a sum of two softmax outputs, not the
 * per-class confidence the calibration table's bins were measured over, so
 * the caller uses this to withhold the calibration caption rather than
 * quoting a band against a quantity it never measured.
 */
export function mergeIsTopAnswer(result: BreedMergeResult): boolean {
  return result.applied !== null && result.predictions[0]?.id === result.applied.id
}
