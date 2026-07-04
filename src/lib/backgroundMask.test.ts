import { describe, expect, it } from 'vitest'
import { findBackgroundCells } from './backgroundMask'
import type { RGB } from './types'

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
