import { describe, expect, it } from 'vitest'
import { SYMBOL_POOL, assignSymbols, contrastTextColor } from './symbolAssignment'

describe('SYMBOL_POOL', () => {
  it('excludes visually confusable characters, keeping one representative per group', () => {
    for (const ch of ['O', 'Q', '0', '1', 'I', 'L', 'l']) {
      expect(SYMBOL_POOL.includes(ch)).toBe(false)
    }
  })

  it('has no duplicate glyphs', () => {
    expect(new Set(SYMBOL_POOL).size).toBe(SYMBOL_POOL.length)
  })
})

describe('assignSymbols', () => {
  it('assigns the first (most legible) pool symbol to the most frequent color', () => {
    const entries = [{ count: 3 }, { count: 50 }, { count: 12 }]
    const result = assignSymbols(entries)
    expect(result[0].count).toBe(50)
    expect(result[0].symbol).toBe(SYMBOL_POOL[0])
    expect(result[1].count).toBe(12)
    expect(result[2].count).toBe(3)
  })
})

describe('contrastTextColor', () => {
  it('picks black text on a light background', () => {
    expect(contrastTextColor({ r: 250, g: 250, b: 240 })).toBe('black')
  })

  it('picks white text on a dark background', () => {
    expect(contrastTextColor({ r: 10, g: 10, b: 20 })).toBe('white')
  })
})
