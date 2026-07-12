import { describe, expect, it } from 'vitest'
import { findBackgroundCells } from './backgroundMask'
import type { RGB, RGBA } from './types'

const WHITE: RGB = { r: 255, g: 255, b: 255 }
const BLACK: RGB = { r: 0, g: 0, b: 0 }

function grid(rows: string[]): RGB[] {
  // '.' = background (white), '#' = foreground (black)
  return rows.flatMap((row) => [...row].map((ch) => (ch === '.' ? WHITE : BLACK)))
}

describe('findBackgroundCells', () => {
  it('flood-fills the connected border region', () => {
    const cols = 5
    const rows = 5
    const cells = grid(['.....', '.###.', '.###.', '.###.', '.....'])
    const bg = findBackgroundCells(cells, cols, rows, WHITE)
    // every '.' cell here is connected to the border
    cells.forEach((c, i) => {
      expect(bg.has(i)).toBe(c === WHITE)
    })
  })

  it('does not treat an interior island of the background color as background', () => {
    const cols = 5
    const rows = 5
    // a lone white pixel dead-center, surrounded by black on all sides -
    // like a highlight painted inside a foreground shape
    const cells = grid(['#####', '#####', '##.##', '#####', '#####'])
    const bg = findBackgroundCells(cells, cols, rows, WHITE)
    expect(bg.size).toBe(0)
    expect(bg.has(2 * cols + 2)).toBe(false)
  })

  it('only includes cells within the color tolerance of the background', () => {
    const cols = 3
    const rows = 1
    const cells: RGB[] = [WHITE, { r: 0, g: 0, b: 0 }, WHITE]
    const bg = findBackgroundCells(cells, cols, rows, WHITE)
    expect(bg.has(0)).toBe(true)
    expect(bg.has(1)).toBe(false)
    expect(bg.has(2)).toBe(true)
  })

  it('returns an empty set when nothing matches the background color', () => {
    const cells: RGB[] = [BLACK, BLACK, BLACK, BLACK]
    const bg = findBackgroundCells(cells, 2, 2, WHITE)
    expect(bg.size).toBe(0)
  })
})

describe('findBackgroundCells with a transparent PNG', () => {
  // Regression test: a PNG cutout's transparent margin often decodes with meaningless "don't
  // care" RGB - many encoders zero it to black to compress better. If the border ring is
  // transparent, detectBackgroundColor's modal color comes back black with alpha=0. Matching
  // by RGB alone (the old behavior) then can't tell that background apart from a genuinely
  // opaque black foreground shape - like a hat - reachable from the same edge, and blanks it
  // right along with the actual empty margin.
  const TRANSPARENT_BLACK: RGBA = { r: 0, g: 0, b: 0, a: 0 }

  it('excludes only the actually-transparent cells, not an opaque black shape that merely shares the incidental RGB', () => {
    const cols = 5
    const rows = 5
    // 'T' = transparent margin (decodes black, alpha 0), '#' = opaque black hat, reachable
    // from the border only by crossing transparent cells first.
    const layout = ['TTTTT', 'T###T', 'T###T', 'T###T', 'TTTTT']
    const cells: RGB[] = layout.flatMap((row) => [...row].map(() => BLACK)) // every cell decodes black
    const cellAlpha = layout.flatMap((row) => [...row].map((ch) => (ch === 'T' ? 0 : 255)))

    const bg = findBackgroundCells(cells, cols, rows, TRANSPARENT_BLACK, cellAlpha)

    layout.forEach((row, r) => {
      ;[...row].forEach((ch, c) => {
        const index = r * cols + c
        expect(bg.has(index)).toBe(ch === 'T')
      })
    })
  })

  it('fails safe (finds nothing) rather than falling back to RGB matching when cellAlpha is missing', () => {
    // A transparent background never consults RGB, by design (that's the whole fix) - so
    // without cellAlpha data to go on, it correctly finds no background rather than risking
    // the old bug of sweeping in an opaque shape that happens to share the same RGB.
    const cols = 5
    const rows = 5
    const layout = ['TTTTT', 'T###T', 'T###T', 'T###T', 'TTTTT']
    const cells: RGB[] = layout.flatMap((row) => [...row].map(() => BLACK))

    const bg = findBackgroundCells(cells, cols, rows, TRANSPARENT_BLACK)

    expect(bg.size).toBe(0)
  })

  it('leaves RGB-based matching untouched for an opaque (non-transparent) background', () => {
    const cols = 3
    const rows = 1
    const cells: RGB[] = [WHITE, BLACK, WHITE]
    const opaqueWhite: RGBA = { ...WHITE, a: 255 }
    const bg = findBackgroundCells(cells, cols, rows, opaqueWhite)
    expect(bg.has(0)).toBe(true)
    expect(bg.has(1)).toBe(false)
    expect(bg.has(2)).toBe(true)
  })
})
