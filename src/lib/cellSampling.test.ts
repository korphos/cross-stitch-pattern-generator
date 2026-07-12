import { describe, expect, it } from 'vitest'
import { sampleCell, sampleGridColors, sampleGridAlpha } from './cellSampling'
import type { PixelBuffer, DetectedGrid } from './types'

function solidImage(width: number, height: number, r: number, g: number, b: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = 255
  }
  return { data, width, height }
}

describe('sampleCell', () => {
  it('samples a solid-color cell correctly with an integer cell size', () => {
    const img = solidImage(28, 28, 200, 100, 50)
    expect(sampleCell(img, 0, 0, 14, 14)).toEqual({ r: 200, g: 100, b: 50 })
  })

  it('does not read undefined/NaN pixels when the cell size is non-integer', () => {
    // Regression test: 428 / 31 is not a whole number, and sampling cell (row, col)
    // used row*cellSize/col*cellSize as a raw (non-rounded) pixel-loop bound - any
    // fractional index reads `undefined` out of the pixel buffer, poisoning the color
    // to NaN, which then always mismatches in nearestDmc and silently defaults to
    // whatever DMC color happens to be first in the table.
    const cellSize = 428 / 31
    const img = solidImage(378, 434, 10, 20, 30)
    const grid: DetectedGrid = {
      bbox: { x: 0, y: 0, width: 27 * cellSize, height: 428 },
      cellSize,
      cols: 27,
      rows: 31,
      confidence: 1,
    }
    const colors = sampleGridColors(img, grid)
    for (const c of colors) {
      expect(Number.isNaN(c.r)).toBe(false)
      expect(Number.isNaN(c.g)).toBe(false)
      expect(Number.isNaN(c.b)).toBe(false)
      expect(c).toEqual({ r: 10, g: 20, b: 30 })
    }
  })

  it('clamps to the image bounds without going negative or out of range', () => {
    const img = solidImage(10, 10, 5, 5, 5)
    expect(() => sampleCell(img, -5, -5, 14, 14)).not.toThrow()
    const result = sampleCell(img, -5, -5, 14, 14)
    expect(Number.isNaN(result.r)).toBe(false)
  })
})

describe('sampleGridColors sample offset', () => {
  it('shifts every cell sampling window by sampleOffsetX/Y instead of always reading dead-center', () => {
    const cellSize = 20
    // Solid ring color (10,10,10) everywhere, except an 8x8 "highlight" square that exactly
    // matches the default (offset 0) inset sampling window - see sampleCell's insetRatio=0.3
    // (insetX/Y = round(20*0.3) = 6, so the default window is x/y in [6,13]).
    const data = new Uint8ClampedArray(cellSize * cellSize * 4)
    for (let y = 0; y < cellSize; y++) {
      for (let x = 0; x < cellSize; x++) {
        const isHighlight = x >= 6 && x <= 13 && y >= 6 && y <= 13
        const i = (y * cellSize + x) * 4
        const [r, g, b] = isHighlight ? [255, 255, 255] : [10, 10, 10]
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        data[i + 3] = 255
      }
    }
    const img: PixelBuffer = { data, width: cellSize, height: cellSize }
    const baseGrid: DetectedGrid = {
      bbox: { x: 0, y: 0, width: cellSize, height: cellSize },
      cellSize,
      cols: 1,
      rows: 1,
      confidence: 1,
    }

    expect(sampleGridColors(img, baseGrid)[0]).toEqual({ r: 255, g: 255, b: 255 })

    const shifted = sampleGridColors(img, { ...baseGrid, sampleOffsetX: 10, sampleOffsetY: 10 })
    expect(shifted[0]).toEqual({ r: 10, g: 10, b: 10 })
  })
})

describe('sampleGridAlpha', () => {
  function imageWithAlpha(width: number, height: number, alphaFn: (x: number, y: number) => number): PixelBuffer {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
        data[i + 3] = alphaFn(x, y)
      }
    }
    return { data, width, height }
  }

  it('reports full opacity for a fully opaque cell and near-zero for a fully transparent one', () => {
    const cellSize = 10
    const img = imageWithAlpha(cellSize * 2, cellSize, (x) => (x < cellSize ? 255 : 0))
    const grid: DetectedGrid = {
      bbox: { x: 0, y: 0, width: cellSize * 2, height: cellSize },
      cellSize,
      cols: 2,
      rows: 1,
      confidence: 1,
    }
    const alphas = sampleGridAlpha(img, grid)
    expect(alphas[0]).toBe(255)
    expect(alphas[1]).toBe(0)
  })
})
