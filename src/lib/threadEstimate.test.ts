import { describe, expect, it } from 'vitest'
import { estimateThreadUsage } from './threadEstimate'
import type { PaletteEntry } from './types'

function makeEntry(code: string, count: number): PaletteEntry {
  return {
    color: { r: 0, g: 0, b: 0 },
    dmc: { code, name: code, r: 0, g: 0, b: 0 },
    deltaE: 0,
    symbol: 'A',
    textColor: 'black',
    count,
  }
}

describe('estimateThreadUsage', () => {
  it('skips colors with zero stitches', () => {
    const result = estimateThreadUsage([makeEntry('310', 0), makeEntry('666', 100)], 14, 2)
    expect(result.map((r) => r.code)).toEqual(['666'])
  })

  it('never estimates fewer than 1 skein for a color that appears at all', () => {
    const result = estimateThreadUsage([makeEntry('310', 1)], 14, 2)
    expect(result[0].skeins).toBeGreaterThanOrEqual(1)
  })

  it('needs more skeins for more stitches of the same color', () => {
    const [small] = estimateThreadUsage([makeEntry('310', 100)], 14, 2)
    const [large] = estimateThreadUsage([makeEntry('310', 100000)], 14, 2)
    expect(large.skeins).toBeGreaterThan(small.skeins)
  })

  it('needs more skeins for more strands (more floss per stitch)', () => {
    const [oneStrand] = estimateThreadUsage([makeEntry('310', 50000)], 14, 1)
    const [threeStrands] = estimateThreadUsage([makeEntry('310', 50000)], 14, 3)
    expect(threeStrands.skeins).toBeGreaterThanOrEqual(oneStrand.skeins)
  })

  it('needs more skeins on a coarser (lower-count) fabric for the same stitch count', () => {
    // lower count = bigger stitches = more floss per stitch
    const [coarse] = estimateThreadUsage([makeEntry('310', 50000)], 11, 2)
    const [fine] = estimateThreadUsage([makeEntry('310', 50000)], 22, 2)
    expect(coarse.skeins).toBeGreaterThanOrEqual(fine.skeins)
  })
})
