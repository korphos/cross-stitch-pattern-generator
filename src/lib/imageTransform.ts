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
