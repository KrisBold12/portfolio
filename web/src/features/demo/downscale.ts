/**
 * Client-side resize before upload. Task 5 (docs/plans/web-frontend.md):
 * "a pure-as-possible module that, given an image, returns a File no
 * larger than 1024px on its longest side, re-encoded as JPEG at quality
 * 0.9, and returns the original untouched when it is already smaller."
 *
 * The size-decision maths (`computeTargetSize`) is a plain function of two
 * numbers, kept separate from the canvas work so it can be unit tested
 * without a DOM. `downscale` itself talks to `createImageBitmap` and
 * `<canvas>`, which only exist in a real browser.
 */

export const MAX_DIMENSION = 1024
export const JPEG_QUALITY = 0.9

export type Size = { width: number; height: number }

/**
 * An image at or under the cap on its longest side comes back unchanged.
 * One over the cap scales so the longest side lands on exactly
 * `MAX_DIMENSION`, and the other side follows the same ratio, rounded to
 * the nearest pixel.
 */
export function computeTargetSize(width: number, height: number, cap: number = MAX_DIMENSION): Size {
  const longest = Math.max(width, height)
  if (longest <= cap) {
    return { width, height }
  }

  const scale = cap / longest
  return width >= height
    ? { width: cap, height: Math.round(height * scale) }
    : { width: Math.round(width * scale), height: cap }
}

function jpegFileName(originalName: string): string {
  const withoutExtension = originalName.replace(/\.[^./\\]+$/, '')
  return `${withoutExtension || 'photo'}.jpg`
}

/**
 * Resizes `file` down to `computeTargetSize`'s answer and re-encodes it as
 * JPEG. Returns the original `File` untouched when no resize is needed, so
 * a photo already inside the cap is never re-compressed.
 */
export async function downscale(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const target = computeTargetSize(bitmap.width, bitmap.height)

  if (target.width === bitmap.width && target.height === bitmap.height) {
    bitmap.close()
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }

  ctx.drawImage(bitmap, 0, 0, target.width, target.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) {
    return file
  }

  return new File([blob], jpegFileName(file.name), { type: 'image/jpeg', lastModified: Date.now() })
}
