import type { RGB, SymbolStyle } from './types'

/**
 * Visually confusable characters, collapsed to a single representative:
 * {0, O, Q} -> keep 'O'; {1, I, L, l} -> keep 'L'.
 */
const EXCLUDED = new Set(['O', 'Q', 'I', 'L', 'l', '0', '1'])

function buildLetterSymbolPool(): string[] {
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

export const LETTER_SYMBOL_POOL = buildLetterSymbolPool()

/**
 * Unicode shape/dingbat glyphs, ordered simplest/most-legible first, for users who find
 * same-shaped letters (e.g. 'v' vs 'V') harder to tell apart on a printed grid than plainly
 * distinct shapes. Drawn from Geometric Shapes, Dingbats, and Miscellaneous Symbols - blocks
 * with broad system-font fallback coverage, so no web font is needed to render them.
 */
export const ICON_SYMBOL_POOL = [
  '●', '■', '▲', '▼', '◆', '★', '✚', '✖', '○', '□', '△', '▽', '◇', '☆', '♦', '♣',
  '♠', '♥', '✦', '✳', '➤', '↑', '↓', '←', '→', '✓', '+', '-', '/', '\\', '=', '⊙',
  '⊕', '⊗', '⬟', '⬢', '⎔', '✜', '◈', '⚑', '†', '‡', '◐', '◑', '◒', '◓', '❖', '✽',
  '∎', '✪', '⌘', '✧',
]

export function symbolPoolFor(style: SymbolStyle): string[] {
  return style === 'icons' ? ICON_SYMBOL_POOL : LETTER_SYMBOL_POOL
}

/**
 * Assigns one glyph per entry, most-frequent color first (so the most
 * visually important colors land on the most legible early-pool glyphs).
 * Returns entries re-ordered by descending `count`.
 */
export function assignSymbols<T extends { count: number }>(
  entries: T[],
  style: SymbolStyle = 'letters',
): (T & { symbol: string })[] {
  const pool = symbolPoolFor(style)
  const sorted = [...entries].sort((a, b) => b.count - a.count)
  return sorted.map((entry, i) => ({
    ...entry,
    symbol: pool[i] ?? '?',
  }))
}

/**
 * Re-glyphs an already-ordered palette in a different symbol style, without re-sorting by count
 * - used when the user only changes the symbol style in Settings, so a stale count order left by
 * manual recolors (see RECOLOR_CELLS, which doesn't resort) isn't silently reshuffled by an
 * unrelated cosmetic toggle.
 */
export function relabelSymbols<T>(entries: T[], style: SymbolStyle): (T & { symbol: string })[] {
  const pool = symbolPoolFor(style)
  return entries.map((entry, i) => ({
    ...entry,
    symbol: pool[i] ?? '?',
  }))
}

/** Black or white glyph color, whichever contrasts against `bg`. */
export function contrastTextColor(bg: RGB): 'black' | 'white' {
  const luma = (0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b) / 255
  return luma > 0.55 ? 'black' : 'white'
}
