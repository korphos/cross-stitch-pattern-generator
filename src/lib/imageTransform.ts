import type { PixelBuffer } from './types'

/** Mirrors an image left-right (pure pixel-buffer operation, no DOM/canvas needed). */
export function flipImageHorizontal(img: PixelBuffer): PixelBuffer {
  const { width, height, data } = img
  const out = new Uint8ClampedArray(data.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcI = (y * width + x) * 4
      const dstI = (y * width + (width - 1 - x)) * 4
      out[dstI] = data[srcI]
      out[dstI + 1] = data[srcI + 1]
      out[dstI + 2] = data[srcI + 2]
      out[dstI + 3] = data[srcI + 3]
    }
  }
  return { data: out, width, height }
}

/**
 * Extracts a rectangular region (square is just the width===height case) as a brand-new image,
 * used by the Crop tab. Out-of-bounds source pixels (a selection dragged past the image edge)
 * come out fully transparent rather than clamped or wrapped, since there's no real pixel data
 * there to show.
 */
export function cropImageToRect(img: PixelBuffer, x: number, y: number, width: number, height: number): PixelBuffer {
  const sx = Math.round(x)
  const sy = Math.round(y)
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const out = new Uint8ClampedArray(w * h * 4)
  for (let row = 0; row < h; row++) {
    const srcY = sy + row
    if (srcY < 0 || srcY >= img.height) continue
    for (let col = 0; col < w; col++) {
      const srcX = sx + col
      if (srcX < 0 || srcX >= img.width) continue
      const srcI = (srcY * img.width + srcX) * 4
      const dstI = (row * w + col) * 4
      out[dstI] = img.data[srcI]
      out[dstI + 1] = img.data[srcI + 1]
      out[dstI + 2] = img.data[srcI + 2]
      out[dstI + 3] = img.data[srcI + 3]
    }
  }
  return { data: out, width: w, height: h }
}

/**
 * Zeroes out every channel (not just alpha) of pixels outside the ellipse inscribed in `img`
 * (a circle is just the width===height case) - fully zeroing, not just alpha, keeps the
 * border-ring "background" color detection in gridDetection.ts clean and unambiguous (a real
 * transparent-cutout PNG usually zeroes RGB too, for smaller file size - see the comment in
 * backgroundMask.ts). The ellipse-masked cross-stitch cells themselves get blanked independently
 * and unconditionally in the reducer's crop-shape handling, so this is really just about giving
 * the cropped preview a clean transparent look.
 */
export function maskOutsideEllipse(img: PixelBuffer): PixelBuffer {
  const { width, height, data } = img
  const out = new Uint8ClampedArray(data)
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2
  const rx = width / 2
  const ry = height / 2
  for (let y = 0; y < height; y++) {
    const ny = (y - cy) / ry
    for (let x = 0; x < width; x++) {
      const nx = (x - cx) / rx
      if (nx * nx + ny * ny > 1) {
        const i = (y * width + x) * 4
        out[i] = 0
        out[i + 1] = 0
        out[i + 2] = 0
        out[i + 3] = 0
      }
    }
  }
  return { data: out, width, height }
}

/** Reverses the column order within each row of a row-major `cols*rows` array (e.g. cellColors, cellAssignment). */
export function mirrorRowMajorHorizontal<T>(arr: T[], cols: number, rows: number): T[] {
  const out = new Array<T>(arr.length)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      out[row * cols + col] = arr[row * cols + (cols - 1 - col)]
    }
  }
  return out
}
