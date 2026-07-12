import { describe, expect, it } from 'vitest'
import { sampleCell, sampleGridColors } from './cellSampling'
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
