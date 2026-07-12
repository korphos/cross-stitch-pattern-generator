import type { PixelBuffer, RGB, DetectedGrid } from './types'

function getPixelRGB(img: PixelBuffer, x: number, y: number): RGB {
  const i = (y * img.width + x) * 4
  return { r: img.data[i], g: img.data[i + 1], b: img.data[i + 2] }
}

function getPixelAlpha(img: PixelBuffer, x: number, y: number): number {
  return img.data[(y * img.width + x) * 4 + 3]
}

/**
 * Clamped, integer pixel bounds of one cell's center inset - shared by color and alpha
 * sampling so both read the exact same window.
 *
 * Clamp on both ends: a grid nudged (or resized) past the image edge must never produce a
 * negative or out-of-range index, which would read `undefined` out of the pixel buffer and
 * poison the DMC match downstream. Also round to integers: cellX/cellY/cellW/cellH are
 * frequently non-integer (e.g. cellSize = 428/31), and a fractional pixel index reads
 * `undefined` out of the buffer just the same as an out-of-range one.
 */
function cellWindow(img: PixelBuffer, cellX: number, cellY: number, cellW: number, cellH: number, insetRatio: number) {
  const insetX = Math.max(1, Math.round(cellW * insetRatio))
  const insetY = Math.max(1, Math.round(cellH * insetRatio))
  const x0 = Math.round(Math.max(0, Math.min(img.width - 1, cellX + insetX)))
  const x1 = Math.max(x0, Math.round(Math.min(img.width - 1, cellX + cellW - insetX - 1)))
  const y0 = Math.round(Math.max(0, Math.min(img.height - 1, cellY + insetY)))
  const y1 = Math.max(y0, Math.round(Math.min(img.height - 1, cellY + cellH - insetY - 1)))
  return { x0, x1, y0, y1 }
}

/**
 * Representative color of one cell: the modal (most frequent exact) RGB
 * value within the cell's center inset, avoiding anti-aliased edge pixels.
 * Falls back to the channel-wise mean if the region is too fragmented
 * (e.g. heavy compression noise) for a mode to be meaningful.
 */
export function sampleCell(
  img: PixelBuffer,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  insetRatio = 0.3,
): RGB {
  const { x0, x1, y0, y1 } = cellWindow(img, cellX, cellY, cellW, cellH, insetRatio)

  const counts = new Map<string, { color: RGB; count: number }>()
  let sumR = 0
  let sumG = 0
  let sumB = 0
  let n = 0
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = getPixelRGB(img, x, y)
      const key = `${p.r},${p.g},${p.b}`
      const entry = counts.get(key)
      if (entry) entry.count++
      else counts.set(key, { color: p, count: 1 })
      sumR += p.r
      sumG += p.g
      sumB += p.b
      n++
    }
  }

  let best: { color: RGB; count: number } | null = null
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry
  }
  if (!best || n === 0) return { r: 0, g: 0, b: 0 }

  const modeIsWeak = best.count / n < 0.34 && counts.size > 4
  if (modeIsWeak) {
    return { r: Math.round(sumR / n), g: Math.round(sumG / n), b: Math.round(sumB / n) }
  }
  return best.color
}

/** Mean alpha (0-255) within the same center inset `sampleCell` reads its color from. */
export function averageCellAlpha(
  img: PixelBuffer,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  insetRatio = 0.3,
): number {
  const { x0, x1, y0, y1 } = cellWindow(img, cellX, cellY, cellW, cellH, insetRatio)
  let sum = 0
  let n = 0
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      sum += getPixelAlpha(img, x, y)
      n++
    }
  }
  return n === 0 ? 255 : sum / n
}

/** Samples one representative color per logical cell, row-major. */
export function sampleGridColors(img: PixelBuffer, grid: DetectedGrid): RGB[] {
  const colors: RGB[] = []
  // Shifts every cell's sampling window off-center by the same amount - e.g. to read a bead
  // pattern's ring color instead of its center highlight. See DetectedGrid.sampleOffsetX/Y.
  const offsetX = grid.sampleOffsetX ?? 0
  const offsetY = grid.sampleOffsetY ?? 0
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cellX = grid.bbox.x + col * grid.cellSize + offsetX
      const cellY = grid.bbox.y + row * grid.cellSize + offsetY
      colors.push(sampleCell(img, cellX, cellY, grid.cellSize, grid.cellSize))
    }
  }
  return colors
}

/**
 * Mean alpha per logical cell, row-major, at the same sampling window as `sampleGridColors` -
 * lets background detection tell an actually-transparent cell (a PNG cutout's empty margin)
 * apart from an opaque one that merely happens to share the border's RGB. See backgroundMask.ts.
 */
export function sampleGridAlpha(img: PixelBuffer, grid: DetectedGrid): number[] {
  const alphas: number[] = []
  const offsetX = grid.sampleOffsetX ?? 0
  const offsetY = grid.sampleOffsetY ?? 0
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cellX = grid.bbox.x + col * grid.cellSize + offsetX
      const cellY = grid.bbox.y + row * grid.cellSize + offsetY
      alphas.push(averageCellAlpha(img, cellX, cellY, grid.cellSize, grid.cellSize))
    }
  }
  return alphas
}
