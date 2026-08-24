import { describe, expect, it } from 'vitest'
import { LETTER_SYMBOL_POOL, ICON_SYMBOL_POOL, assignSymbols, relabelSymbols, contrastTextColor } from './symbolAssignment'

describe('LETTER_SYMBOL_POOL', () => {
  it('pushes visually confusable Latin characters to the very end of the pool', () => {
    const confusable = ['O', 'Q', 'I', 'L', 'l', '0', '1']
    const lastConfusableIndex = LETTER_SYMBOL_POOL.length - 1
    const firstConfusableIndex = LETTER_SYMBOL_POOL.length - confusable.length
    for (const ch of confusable) {
      const index = LETTER_SYMBOL_POOL.indexOf(ch)
      expect(index).toBeGreaterThanOrEqual(firstConfusableIndex)
      expect(index).toBeLessThanOrEqual(lastConfusableIndex)
    }
  })

  it('has at least 150 distinct glyphs, drawn from Latin, Greek, and Cyrillic', () => {
    expect(LETTER_SYMBOL_POOL.length).toBeGreaterThanOrEqual(150)
  })

  it('has no duplicate glyphs', () => {
    expect(new Set(LETTER_SYMBOL_POOL).size).toBe(LETTER_SYMBOL_POOL.length)
  })
})

describe('ICON_SYMBOL_POOL', () => {
  it('has at least 150 distinct glyphs', () => {
    expect(ICON_SYMBOL_POOL.length).toBeGreaterThanOrEqual(150)
  })

  it('has no duplicate glyphs', () => {
    expect(new Set(ICON_SYMBOL_POOL).size).toBe(ICON_SYMBOL_POOL.length)
  })
})

describe('assignSymbols', () => {
  it('assigns the first (most legible) pool symbol to the most frequent color', () => {
    const entries = [{ count: 3 }, { count: 50 }, { count: 12 }]
    const result = assignSymbols(entries)
    expect(result[0].count).toBe(50)
    expect(result[0].symbol).toBe(ICON_SYMBOL_POOL[0])
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
