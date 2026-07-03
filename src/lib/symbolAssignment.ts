import type { RGB } from './types'

/**
 * Visually confusable characters, collapsed to a single representative:
 * {0, O, Q} -> keep 'O'; {1, I, L, l} -> keep 'L'.
 */
const EXCLUDED = new Set(['O', 'Q', 'I', 'L', 'l', '0', '1'])

function buildSymbolPool(): string[] {
  const pool: string[] = []
  for (let c = 65; c <= 90; c++) {
    const ch = String.fromCharCode(c)
    if (!EXCLUDED.has(ch)) pool.push(ch)
  }
  for (let c = 97; c <= 122; c++) {
    const ch = String.fromCharCode(c)
    if (!EXCLUDED.has(ch)) pool.push(ch)
  }
  for (let d = 2; d <= 9; d++) pool.push(String(d))
  pool.push(...'+*#@%&?!~^'.split(''))
  return pool
}

export const SYMBOL_POOL = buildSymbolPool()

/**
 * Assigns one glyph per entry, most-frequent color first (so the most
 * visually important colors land on the most legible early-pool glyphs).
 * Returns entries re-ordered by descending `count`.
 */
export function assignSymbols<T extends { count: number }>(entries: T[]): (T & { symbol: string })[] {
  const sorted = [...entries].sort((a, b) => b.count - a.count)
  return sorted.map((entry, i) => ({
    ...entry,
    symbol: SYMBOL_POOL[i] ?? '?',
  }))
}

/** Black or white glyph color, whichever contrasts against `bg`. */
export function contrastTextColor(bg: RGB): 'black' | 'white' {
  const luma = (0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b) / 255
  return luma > 0.55 ? 'black' : 'white'
}
