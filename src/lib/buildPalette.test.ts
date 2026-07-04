import { describe, expect, it } from 'vitest'
import { buildPalette } from './buildPalette'
import { dmcColors } from '../data/dmcColors'
import { EMPTY_CELL } from './types'
import type { RGB } from './types'

function rgbOf(code: string): RGB {
  const entry = dmcColors.find((d) => d.code === code)!
  return { r: entry.r, g: entry.g, b: entry.b }
}

describe('buildPalette', () => {
  it('best mode ignores ownership for matching, but still flags the owned status', () => {
    const black = rgbOf('310')
    const { palette } = buildPalette([black], 2.3, { mode: 'best', ownedCodes: new Set(['310']) })
    expect(palette).toHaveLength(1)
    expect(palette[0].dmc.code).toBe('310')
    expect(palette[0].owned).toBe(true)
  })

  it('best mode flags owned:false when the matched color is not in the inventory', () => {
    const black = rgbOf('310')
    const { palette } = buildPalette([black], 2.3, { mode: 'best', ownedCodes: new Set(['666']) })
    expect(palette[0].dmc.code).toBe('310')
    expect(palette[0].owned).toBe(false)
  })

  it('ownedOnly mode uses an owned thread when it is close enough', () => {
    const black = rgbOf('310')
    const { palette } = buildPalette([black], 2.3, { mode: 'ownedOnly', ownedCodes: new Set(['310']) })
    expect(palette[0].dmc.code).toBe('310')
    expect(palette[0].owned).toBe(true)
  })

  it('ownedOnly mode falls back to the best overall match when nothing owned is close enough', () => {
    const black = rgbOf('310') // near-black
    const { palette } = buildPalette([black], 2.3, { mode: 'ownedOnly', ownedCodes: new Set(['666']) }) // bright red, far from black
    expect(palette[0].dmc.code).toBe('310') // best overall match for black is itself
    expect(palette[0].owned).toBe(false) // flagged as "you don't own this"
  })

  it('ownedOnly mode with an empty inventory behaves like best mode', () => {
    const black = rgbOf('310')
    const { palette } = buildPalette([black], 2.3, { mode: 'ownedOnly', ownedCodes: new Set() })
    expect(palette[0].dmc.code).toBe('310')
  })

  it('defaults to best mode with no owned threads when no options are passed', () => {
    const black = rgbOf('310')
    const { palette } = buildPalette([black], 2.3)
    expect(palette[0].dmc.code).toBe('310')
    expect(palette[0].owned).toBe(false)
  })

  it('leaves cells listed in backgroundCellIndices blank instead of matching a thread', () => {
    const white: RGB = { r: 255, g: 255, b: 255 }
    const black = rgbOf('310')
    const { palette, cellAssignment } = buildPalette([white, white, black], 2.3, {
      mode: 'best',
      ownedCodes: new Set(),
      backgroundCellIndices: new Set([0, 1]),
    })
    expect(cellAssignment).toEqual([EMPTY_CELL, EMPTY_CELL, '310'])
    expect(palette.map((p) => p.dmc.code)).toEqual(['310'])
  })

  it('matches every color normally when no backgroundCellIndices is given', () => {
    const white: RGB = { r: 255, g: 255, b: 255 }
    const { cellAssignment } = buildPalette([white], 2.3, { mode: 'best', ownedCodes: new Set() })
    expect(cellAssignment).toEqual(['B5200'])
  })

  it('does not sweep a foreground color away via cluster merging just because it is not marked as background', () => {
    // Regression test: excluding background used to run on *cluster*
    // centroids after clustering (comparing raw colors), so a color like
    // this light gray - close enough to white to get greedily merged into
    // white's cluster by clusterColors at a loose threshold - would vanish
    // along with the whole merged cluster, even when the caller correctly
    // determined (e.g. via findBackgroundCells's flood fill) that this
    // particular cell is NOT background. It must survive here.
    const white: RGB = { r: 255, g: 255, b: 255 }
    const lightGray: RGB = { r: 210, g: 210, b: 210 }
    const { palette, cellAssignment } = buildPalette([white, white, white, lightGray], 15, {
      mode: 'best',
      ownedCodes: new Set(),
      backgroundCellIndices: new Set([0, 1, 2]),
    })
    expect(cellAssignment[3]).not.toBe(EMPTY_CELL)
    expect(palette.some((p) => p.count > 0)).toBe(true)
  })
})
