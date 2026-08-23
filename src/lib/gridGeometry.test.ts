import { describe, expect, it } from 'vitest'
import { applyGridFieldPatch } from './gridGeometry'
import type { DetectedGrid } from './types'

const baseGrid: DetectedGrid = {
  bbox: { x: 10, y: 10, width: 100, height: 100 },
  cellSize: 10,
  cols: 10,
  rows: 10,
  confidence: 1,
  sampleOffsetX: 0,
  sampleOffsetY: 0,
}

describe('applyGridFieldPatch', () => {
  it('clamps an offset that would push the grid past the image edge', () => {
    const next = applyGridFieldPatch(baseGrid, 90, 90, { offsetX: 50, offsetY: 50 })
    expect(next).not.toBeNull()
    // width/height stay 100, image is 90x90 -> max offset is 0
    expect(next!.bbox.x).toBe(0)
    expect(next!.bbox.y).toBe(0)
  })

  it('rejects a non-finite or non-positive patch', () => {
    expect(applyGridFieldPatch(baseGrid, 200, 200, { cellSize: NaN })).toBeNull()
    expect(applyGridFieldPatch(baseGrid, 200, 200, { cellSize: 0 })).toBeNull()
    expect(applyGridFieldPatch(baseGrid, 200, 200, { cols: -1 })).toBeNull()
    expect(applyGridFieldPatch(baseGrid, 200, 200, { rows: Infinity })).toBeNull()
  })

  it('re-clamps the sample offset when cellSize shrinks below its current bound', () => {
    const gridWithOffset: DetectedGrid = { ...baseGrid, sampleOffsetX: 4, sampleOffsetY: -4 }
    const next = applyGridFieldPatch(gridWithOffset, 200, 200, { cellSize: 4 })
    expect(next).not.toBeNull()
    expect(next!.sampleOffsetX).toBe(2)
    expect(next!.sampleOffsetY).toBe(-2)
  })

  it('leaves an in-bounds patch untouched', () => {
    const next = applyGridFieldPatch(baseGrid, 200, 200, { cols: 12 })
    expect(next).toEqual({
      bbox: { x: 10, y: 10, width: 120, height: 100 },
      cellSize: 10,
      cols: 12,
      rows: 10,
      confidence: 1,
      sampleOffsetX: 0,
      sampleOffsetY: 0,
    })
  })
})
