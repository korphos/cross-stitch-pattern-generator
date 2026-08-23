import { describe, expect, it } from 'vitest'
import { LETTER_SYMBOL_POOL, ICON_SYMBOL_POOL, assignSymbols, relabelSymbols, contrastTextColor } from './symbolAssignment'

describe('LETTER_SYMBOL_POOL', () => {
  it('excludes visually confusable characters, keeping one representative per group', () => {
    for (const ch of ['O', 'Q', '0', '1', 'I', 'L', 'l']) {
      expect(LETTER_SYMBOL_POOL.includes(ch)).toBe(false)
    }
  })

  it('has no duplicate glyphs', () => {
    expect(new Set(LETTER_SYMBOL_POOL).size).toBe(LETTER_SYMBOL_POOL.length)
  })
})

describe('ICON_SYMBOL_POOL', () => {
  it('has no duplicate glyphs', () => {
    expect(new Set(ICON_SYMBOL_POOL).size).toBe(ICON_SYMBOL_POOL.length)
  })
})

describe('assignSymbols', () => {
  it('assigns the first (most legible) pool symbol to the most frequent color', () => {
    const entries = [{ count: 3 }, { count: 50 }, { count: 12 }]
    const result = assignSymbols(entries)
    expect(result[0].count).toBe(50)
    expect(result[0].symbol).toBe(LETTER_SYMBOL_POOL[0])
    expect(result[1].count).toBe(12)
    expect(result[2].count).toBe(3)
  })

  it('draws from the icon pool when style is icons', () => {
    const entries = [{ count: 1 }]
    const result = assignSymbols(entries, 'icons')
    expect(result[0].symbol).toBe(ICON_SYMBOL_POOL[0])
  })
})

describe('relabelSymbols', () => {
  it('re-glyphs entries in their existing order without re-sorting by count', () => {
    // Deliberately out of count order - a stale order left by a manual recolor.
    const entries = [{ count: 3 }, { count: 50 }]
    const result = relabelSymbols(entries, 'icons')
    expect(result[0].count).toBe(3)
    expect(result[0].symbol).toBe(ICON_SYMBOL_POOL[0])
    expect(result[1].count).toBe(50)
    expect(result[1].symbol).toBe(ICON_SYMBOL_POOL[1])
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
