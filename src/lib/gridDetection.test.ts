import { describe, expect, it } from 'vitest'
import { detectGrid } from './gridDetection'
import type { PixelBuffer, RGB } from './types'

interface SyntheticOptions {
  padding?: number
  /** max +/- per-channel jitter applied to every pixel, simulating compression noise */
  noise?: number
  background?: RGB
}

/** Builds a PixelBuffer that looks like a nearest-neighbor-scaled pixel-art grid. */
function makeGridImage(cols: number, rows: number, cellPx: number, colors: RGB[], options: SyntheticOptions = {}): PixelBuffer {
  const padding = options.padding ?? 0
  const noise = options.noise ?? 0
  const bg = options.background ?? { r: 255, g: 255, b: 255 }

  const width = cols * cellPx + padding * 2
  const height = rows * cellPx + padding * 2
  const data = new Uint8ClampedArray(width * height * 4)

  // simple seeded PRNG so noisy tests are deterministic
  let seed = 42
  function rand() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inGrid = x >= padding && x < width - padding && y >= padding && y < height - padding
      let color = bg
      if (inGrid) {
        const col = Math.floor((x - padding) / cellPx)
        const row = Math.floor((y - padding) / cellPx)
        // (row + col) guarantees every horizontal AND vertical neighbor
        // differs in color, regardless of how cols/rows divide into the
        // palette length (a row-major index can alias to a constant
        // column when cols is a multiple of colors.length).
        color = colors[(row + col) % colors.length]
      }
      const i = (y * width + x) * 4
      const jitter = () => (noise > 0 ? Math.round((rand() * 2 - 1) * noise) : 0)
      data[i] = color.r + jitter()
      data[i + 1] = color.g + jitter()
      data[i + 2] = color.b + jitter()
      data[i + 3] = 255
    }
  }

  return { data, width, height }
}

const RED = { r: 220, g: 40, b: 40 }
const BLUE = { r: 40, g: 60, b: 200 }
const GREEN = { r: 40, g: 180, b: 80 }
const PALETTE = [RED, BLUE, GREEN]

describe('detectGrid', () => {
  it('recovers exact cell size and dimensions for a clean grid, no padding', () => {
    const img = makeGridImage(6, 5, 20, PALETTE)
    const grid = detectGrid(img)
    expect(grid.cellSize).toBeCloseTo(20)
    expect(grid.cols).toBe(6)
    expect(grid.rows).toBe(5)
  })

  it('recovers a different cell size (odd, larger)', () => {
    const img = makeGridImage(8, 7, 23, PALETTE)
    const grid = detectGrid(img)
    expect(grid.cellSize).toBeCloseTo(23)
    expect(grid.cols).toBe(8)
    expect(grid.rows).toBe(7)
  })

  it('detects the bounding box offset when the grid is padded with background', () => {
    const img = makeGridImage(6, 5, 20, PALETTE, { padding: 15 })
    const grid = detectGrid(img)
    expect(grid.bbox.x).toBe(15)
    expect(grid.bbox.y).toBe(15)
    expect(grid.cols).toBe(6)
    expect(grid.rows).toBe(5)
  })

  it('is robust to mild per-pixel noise', () => {
    const img = makeGridImage(10, 8, 18, PALETTE, { padding: 6, noise: 6 })
    const grid = detectGrid(img)
    expect(grid.cellSize).toBeGreaterThanOrEqual(17)
    expect(grid.cellSize).toBeLessThanOrEqual(19)
    expect(grid.cols).toBe(10)
    expect(grid.rows).toBe(8)
  })

  it('falls back to one source pixel per stitch for an already-pixelated image with no real cell interior', () => {
    // cellPx: 1 - every adjacent pixel differs, so the gridline peak search has nothing to
    // lock onto and would otherwise collapse to a bogus 1-or-2-cell "grid" (see gridDetection.ts).
    const img = makeGridImage(20, 20, 1, PALETTE)
    const grid = detectGrid(img)
    expect(grid.cellSize).toBe(1)
    expect(grid.cols).toBe(20)
    expect(grid.rows).toBe(20)
  })
})
