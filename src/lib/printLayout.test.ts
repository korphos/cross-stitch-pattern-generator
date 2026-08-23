import { describe, expect, it } from 'vitest'
import { computePrintLayout, PAGE_USABLE_WIDTH_PX, PAGE_USABLE_HEIGHT_PX, MULTI_PAGE_CELL_PX } from './printLayout'
import { EMPTY_CELL } from './types'

/** A cellAssignment where cells inside the circle inscribed in the cols x rows square are
 * "stitched" (a dummy DMC code) and everything outside it is EMPTY_CELL - mimics a round crop. */
function circleCellAssignment(cols: number, rows: number): string[] {
  const cx = (cols - 1) / 2
  const cy = (rows - 1) / 2
  const r = Math.min(cols, rows) / 2
  const cells: string[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const dx = col - cx
      const dy = row - cy
      cells.push(dx * dx + dy * dy <= r * r ? '310' : EMPTY_CELL)
    }
  }
  return cells
}

describe('computePrintLayout', () => {
  it('keeps a small pattern on a single page in auto mode', () => {
    const layout = computePrintLayout(40, 40, 'auto')
    expect(layout.mode).toBe('single')
    expect(layout.tiles).toEqual([{ index: 0, pageRow: 0, pageCol: 0, colStart: 0, colEnd: 40, rowStart: 0, rowEnd: 40 }])
  })

  it('switches a large pattern to multiple pages in auto mode', () => {
    const layout = computePrintLayout(400, 400, 'auto')
    expect(layout.mode).toBe('multi')
    expect(layout.pagesX).toBeGreaterThan(1)
    expect(layout.pagesY).toBeGreaterThan(1)
    expect(layout.cellPx).toBe(MULTI_PAGE_CELL_PX)
  })

  it("'single' forces one page even for a huge pattern", () => {
    const layout = computePrintLayout(1000, 1000, 'single')
    expect(layout.mode).toBe('single')
    expect(layout.tiles).toHaveLength(1)
  })

  it("'multi' forces tiling even for a small pattern", () => {
    const layout = computePrintLayout(10, 10, 'multi')
    expect(layout.mode).toBe('multi')
    expect(layout.tiles).toHaveLength(1)
    expect(layout.tiles[0]).toEqual({ index: 0, pageRow: 0, pageCol: 0, colStart: 0, colEnd: 10, rowStart: 0, rowEnd: 10 })
  })

  it('tiles cover the whole grid with no gaps or overlap', () => {
    const cols = 137
    const rows = 251
    const layout = computePrintLayout(cols, rows, 'multi')
    const covered = new Uint8Array(cols * rows)
    for (const tile of layout.tiles) {
      for (let row = tile.rowStart; row < tile.rowEnd; row++) {
        for (let col = tile.colStart; col < tile.colEnd; col++) {
          const i = row * cols + col
          expect(covered[i]).toBe(0) // no cell claimed by two tiles
          covered[i] = 1
        }
      }
    }
    expect(covered.every((v) => v === 1)).toBe(true) // every cell claimed by exactly one tile
    expect(layout.tiles).toHaveLength(layout.pagesX * layout.pagesY)
  })

  it('every tile fits within the usable page area at the multi-page cell size', () => {
    const layout = computePrintLayout(523, 89, 'multi')
    for (const tile of layout.tiles) {
      const widthPx = (tile.colEnd - tile.colStart) * layout.cellPx
      const heightPx = (tile.rowEnd - tile.rowStart) * layout.cellPx
      expect(widthPx).toBeLessThanOrEqual(PAGE_USABLE_WIDTH_PX)
      expect(heightPx).toBeLessThanOrEqual(PAGE_USABLE_HEIGHT_PX)
    }
  })

  it('page indices/coordinates are assigned in row-major reading order', () => {
    const layout = computePrintLayout(400, 400, 'multi')
    for (let i = 0; i < layout.tiles.length; i++) {
      expect(layout.tiles[i].index).toBe(i)
      expect(layout.tiles[i].pageRow).toBe(Math.floor(i / layout.pagesX))
      expect(layout.tiles[i].pageCol).toBe(i % layout.pagesX)
    }
  })

  it('a narrow-but-tall pattern that fits on one page width-wise still splits vertically if needed', () => {
    const layout = computePrintLayout(30, 900, 'auto')
    expect(layout.mode).toBe('multi')
    expect(layout.pagesY).toBeGreaterThan(1)
  })

  it('evenly redistributes stitches per page instead of leaving a thin ragged last row/column', () => {
    // 400 cols at the baseline cell size fits ~35/page -> naive fixed-block tiling would leave a
    // last column just 400 - 11*35 = 15 stitches wide, under half the others.
    const layout = computePrintLayout(400, 400, 'multi')
    const colWidths = new Set(layout.tiles.filter((t) => t.pageRow === 0).map((t) => t.colEnd - t.colStart))
    const rowHeights = new Set(layout.tiles.filter((t) => t.pageCol === 0).map((t) => t.rowEnd - t.rowStart))
    // Evenly divided pages differ in size by at most one stitch (ceil-division remainder).
    expect(Math.max(...colWidths) - Math.min(...colWidths)).toBeLessThanOrEqual(1)
    expect(Math.max(...rowHeights) - Math.min(...rowHeights)).toBeLessThanOrEqual(1)
  })

  it('grows the cell size above the baseline when even redistribution leaves room to spare', () => {
    // 50 cols needs 2 pages at the baseline size (~35/page); redistributed evenly that's only
    // 25/page, freeing up real room to grow well past the 20px baseline.
    const layout = computePrintLayout(50, 50, 'multi')
    expect(layout.cellPx).toBeGreaterThan(MULTI_PAGE_CELL_PX)
  })

  it('never grows the cell size past the multi-page cap', () => {
    const layout = computePrintLayout(12, 12, 'multi')
    expect(layout.cellPx).toBeLessThanOrEqual(30)
  })

  it('drops a tile with next to nothing actually stitched in it (a round crop corner) and renumbers the rest with no gaps', () => {
    // Large enough that even at the smaller multi-page baseline, each tile is still small
    // relative to the circle's corner gaps - a coarser tile grid could end up with corner tiles
    // that clip enough of the circle to clear the "worth printing" threshold on their own.
    const cols = 800
    const rows = 800
    const assignment = circleCellAssignment(cols, rows)
    const withoutFilter = computePrintLayout(cols, rows, 'multi')
    const withFilter = computePrintLayout(cols, rows, 'multi', assignment)

    expect(withFilter.tiles.length).toBeLessThan(withoutFilter.tiles.length)
    // Corner tiles (min pageRow/pageCol and max pageRow/pageCol) are entirely outside the
    // inscribed circle and should be gone.
    const maxPageRow = withoutFilter.pagesY - 1
    const maxPageCol = withoutFilter.pagesX - 1
    const isCorner = (pr: number, pc: number) =>
      (pr === 0 || pr === maxPageRow) && (pc === 0 || pc === maxPageCol)
    expect(withFilter.tiles.some((t) => isCorner(t.pageRow, t.pageCol))).toBe(false)
    // Renumbered densely: 0, 1, 2, ... with no gaps.
    withFilter.tiles.forEach((t, i) => expect(t.index).toBe(i))
  })

  it('keeps every tile when the whole grid is actually stitched (no false positives)', () => {
    const cols = 200
    const rows = 200
    const assignment = new Array(cols * rows).fill('310')
    const layout = computePrintLayout(cols, rows, 'multi', assignment)
    const unfiltered = computePrintLayout(cols, rows, 'multi')
    expect(layout.tiles.length).toBe(unfiltered.tiles.length)
  })
})
