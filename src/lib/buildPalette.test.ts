import { describe, expect, it } from 'vitest'
import { buildPalette, buildPaletteAdaptive, buildPaletteForTargetCount, DEFAULT_CLUSTER_THRESHOLD } from './buildPalette'
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

// Eight DMC colors spread across the full hue/lightness range, each appearing once - distinct
// enough to match eight different DMC codes with no merging (threshold 0), but close enough to
// each other in aggregate that raising the ΔE threshold eventually collapses them all the way
// down to a single cluster, giving buildPaletteForTargetCount real merging to search over.
const spreadColors: RGB[] = ['310', '666', '699', '824', '972', '550', '3846', 'B5200'].map((code) => {
  const entry = dmcColors.find((d) => d.code === code)!
  return { r: entry.r, g: entry.g, b: entry.b }
})

describe('buildPaletteForTargetCount', () => {
  it('returns the unmerged palette untouched when it is already at or under the target', () => {
    const { palette, thresholdUsed } = buildPaletteForTargetCount(spreadColors, spreadColors.length)
    expect(palette).toHaveLength(spreadColors.length)
    expect(thresholdUsed).toBe(0)
  })

  it('does not force extra merging just because the target is larger than the natural count', () => {
    const { palette, thresholdUsed } = buildPaletteForTargetCount(spreadColors, 100)
    expect(palette).toHaveLength(spreadColors.length)
    expect(thresholdUsed).toBe(0)
  })

  it('raises the merge threshold to land exactly on a smaller target', () => {
    expect(buildPaletteForTargetCount(spreadColors, 5).palette).toHaveLength(5)
    expect(buildPaletteForTargetCount(spreadColors, 3).palette).toHaveLength(3)
  })

  it('merges everything down to a single color for a target of 1', () => {
    const { palette } = buildPaletteForTargetCount(spreadColors, 1)
    expect(palette).toHaveLength(1)
  })
})

describe('buildPaletteAdaptive', () => {
  it('uses the default merge threshold when the target is null ("auto")', () => {
    expect(buildPaletteAdaptive(spreadColors, null)).toEqual({
      ...buildPalette(spreadColors, DEFAULT_CLUSTER_THRESHOLD),
      thresholdUsed: DEFAULT_CLUSTER_THRESHOLD,
    })
  })

  it('delegates to buildPaletteForTargetCount when given a number', () => {
    expect(buildPaletteAdaptive(spreadColors, 3)).toEqual(buildPaletteForTargetCount(spreadColors, 3))
  })
})
