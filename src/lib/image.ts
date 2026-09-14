// Downscale + re-encode a photo client-side before it hits Supabase Storage.
// Phone camera photos routinely run 3-8MB; nothing on Flow displays them
// larger than a few hundred px, so uploading them full-size just costs
// storage and page weight for every viewer of a public menu/business page.
export async function compressImage(
  file: File,
  opts: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
  const { maxDimension = 1600, quality = 0.82 } = opts

  // Nothing to gain on already-small files, and SVGs/non-raster types
  // shouldn't be re-encoded as JPEG.
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.size < 150_000) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch {
    // Any decode/canvas failure just falls back to the original file --
    // compression is an optimization, never a blocker on the upload itself.
    return file
  }
}
