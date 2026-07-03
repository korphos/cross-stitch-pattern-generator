import type { PixelBuffer, RGB, DetectedGrid } from './types'

function getPixelRGB(img: PixelBuffer, x: number, y: number): RGB {
  const i = (y * img.width + x) * 4
  return { r: img.data[i], g: img.data[i + 1], b: img.data[i + 2] }
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
  const insetX = Math.max(1, Math.round(cellW * insetRatio))
  const insetY = Math.max(1, Math.round(cellH * insetRatio))
  // Clamp on both ends: a grid nudged (or resized) past the image edge must
  // never produce a negative or out-of-range index, which would read
  // `undefined` out of the pixel buffer and poison the DMC match downstream.
  const x0 = Math.max(0, Math.min(img.width - 1, cellX + insetX))
  const x1 = Math.max(x0, Math.min(img.width - 1, cellX + cellW - insetX - 1))
  const y0 = Math.max(0, Math.min(img.height - 1, cellY + insetY))
  const y1 = Math.max(y0, Math.min(img.height - 1, cellY + cellH - insetY - 1))

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

/** Samples one representative color per logical cell, row-major. */
export function sampleGridColors(img: PixelBuffer, grid: DetectedGrid): RGB[] {
  const colors: RGB[] = []
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cellX = grid.bbox.x + col * grid.cellWidth
      const cellY = grid.bbox.y + row * grid.cellHeight
      colors.push(sampleCell(img, cellX, cellY, grid.cellWidth, grid.cellHeight))
    }
  }
  return colors
}
