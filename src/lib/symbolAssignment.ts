import type { RGB, SymbolStyle } from './types'

function codeRange(start: number, end: number): string[] {
  const out: string[] = []
  for (let c = start; c <= end; c++) out.push(String.fromCharCode(c))
  return out
}

/** Visually confusable with a Latin letter or digit already in the pool - {0, O, Q} vs 'O',
 * {1, I, L, l} vs 'L'. Pushed to the very end of the pool rather than dropped, so they only
 * surface once a pattern needs more distinct glyphs than the unambiguous ones can cover. */
const LATIN_LOOKALIKE = ['O', 'Q', 'I', 'L', 'l', '0', '1']

/** Greek letters that are (near-)identical in shape to a Latin letter already earlier in the
 * pool - e.g. 'Α'/'A', 'Β'/'B', 'ο'/'o' - plus the final-form sigma 'ς', a duplicate glyph for
 * 'σ'. Kept, but deprioritized to the tail alongside the other lookalike tiers. */
const GREEK_LOOKALIKE = new Set([
  'Α', 'Β', 'Ε', 'Ζ', 'Η', 'Ι', 'Κ', 'Μ', 'Ν', 'Ο', 'Ρ', 'Τ', 'Υ', 'Χ',
  'α', 'ι', 'κ', 'ν', 'ο', 'ς', 'τ', 'υ', 'χ',
])

/** Cyrillic letters that read as a Latin letter at a glance - e.g. 'А'/'A', 'Н'/'H', 'р'/'p'. */
const CYRILLIC_LOOKALIKE = new Set([
  'А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х',
  'а', 'в', 'е', 'к', 'м', 'н', 'о', 'р', 'с', 'т', 'у', 'х',
])

/**
 * Builds the letters/digits/symbols pool: Latin letters and digits first (most legible on a
 * printed grid with no unfamiliar shapes), then ASCII punctuation, then the Greek and Cyrillic
 * alphabets - each split into a "distinct-shaped" tier and a "looks like a Latin letter" tier,
 * with every lookalike tier held back to the end. This only matters for patterns with well over
 * a hundred colors, once the unambiguous glyphs are exhausted.
 */
function buildLetterSymbolPool(): string[] {
  const latinUpper = codeRange(65, 90).filter((ch) => !LATIN_LOOKALIKE.includes(ch))
  const latinLower = codeRange(97, 122).filter((ch) => !LATIN_LOOKALIKE.includes(ch))
  const digits = codeRange(50, 57) // '2'..'9'
  const asciiSymbols = '+*#@%&?!~^<>=_$'.split('')

  // Greek: uppercase 0x0391-0x03A9 (0x03A2 is unassigned), lowercase 0x03B1-0x03C9.
  const greekUpper = codeRange(0x0391, 0x03a9).filter((ch) => ch.codePointAt(0) !== 0x03a2)
  const greekLower = codeRange(0x03b1, 0x03c9)

  // Cyrillic (Russian alphabet): uppercase 0x0410-0x042F plus Ё; lowercase 0x0430-0x044F plus ё.
  const cyrillicUpper = [String.fromCharCode(0x0401), ...codeRange(0x0410, 0x042f)]
  const cyrillicLower = [String.fromCharCode(0x0451), ...codeRange(0x0430, 0x044f)]

  const distinct = (chars: string[], lookalikes: Set<string>) => chars.filter((ch) => !lookalikes.has(ch))
  const onlyLookalike = (chars: string[], lookalikes: Set<string>) => chars.filter((ch) => lookalikes.has(ch))

  return [
    ...latinUpper,
    ...latinLower,
    ...digits,
    ...asciiSymbols,
    ...distinct(greekUpper, GREEK_LOOKALIKE),
    ...distinct(greekLower, GREEK_LOOKALIKE),
    ...distinct(cyrillicUpper, CYRILLIC_LOOKALIKE),
    ...distinct(cyrillicLower, CYRILLIC_LOOKALIKE),
    ...onlyLookalike(greekUpper, GREEK_LOOKALIKE),
    ...onlyLookalike(greekLower, GREEK_LOOKALIKE),
    ...onlyLookalike(cyrillicUpper, CYRILLIC_LOOKALIKE),
    ...onlyLookalike(cyrillicLower, CYRILLIC_LOOKALIKE),
    ...LATIN_LOOKALIKE,
  ]
}

export const LETTER_SYMBOL_POOL = buildLetterSymbolPool()

/**
 * Unicode shape/dingbat glyphs, ordered simplest/most-legible first, for users who find
 * same-shaped letters (e.g. 'v' vs 'V') harder to tell apart on a printed grid than plainly
 * distinct shapes. Drawn from Geometric Shapes, Dingbats, Miscellaneous Symbols, Arrows, and
 * Mathematical Operators - blocks with broad system-font fallback coverage, so no web font is
 * needed to render them. The tail is glyphs that are easy to mistake for another shape earlier in
 * the pool (filled/open pairs, tiny rotations, near-duplicate snowflakes/stars); those only
 * surface once a pattern needs well past a hundred colors.
 */
export const ICON_SYMBOL_POOL = [
  '●', '■', '▲', '▼', '◆', '★', '✚', '✖', '○', '□', '△', '▽', '◇', '☆', '♦', '♣',
  '♠', '♥', '✦', '✳', '➤', '↑', '↓', '←', '→', '✓', '+', '-', '/', '\\', '=', '⊙',
  '⊕', '⊗', '⬟', '⬢', '⎔', '✜', '◈', '⚑', '†', '‡', '◐', '◑', '◒', '◓', '❖', '✽',
  '∎', '✪', '⌘', '✧',
  '▶', '◀', '▷', '◁', '▧', '▨', '▩', '▤', '▥', '▦', '⬤', '⬣', '⬡', '⬠',
  '⌂', '⌗', '⌬', '⏣', '✱', '✴', '✵', '✶', '✷', '✸', '✹', '✺', '✻', '✼',
  '❂', '❃', '❄', '❅', '❆', '❇', '❈', '❉', '❊', '❋', '✢', '✣', '✤', '✥',
  '⚐', '⚒', '⚔', '⚕', '⚖', '⚗', '⚙', '⚛', '⚜', '⌖', '⍟', '⏢', '⏤', '⌭',
  '➔', '➘', '➙', '➚', '➛', '➜', '➝', '➞', '➟', '➠', '➡', '➢', '➣',
  '↔', '↕', '↖', '↗', '↘', '↙', '⇧', '⇩', '⇦', '⇨', '⇑', '⇓', '⇐', '⇒',
  '≈', '≠', '≤', '≥', '±', '÷', '×', '∞', '∑', '∏', '∆', '∇', '√', '∂',
  '∫', '∮', '∴', '∵', '∝', '∽', '≅', '≡', '∀', '∃', '∈', '∉', '⊂', '⊃',
  '◉', '◎', '◍', '◌', '◊', '▪', '▫', '▬', '▭', '▮', '▯', '▰', '▱',
  '◫', '◪', '◩', '◨', '◧', '◦', '⚬', '⚫', '⚪', '◾', '◽', '◼', '◻',
  '✕', '✗', '✘', '✙', '✛', '✞', '✟', '✠',
  '❍', '❏', '❐', '❑', '❒', '✾', '✿', '❀', '❁',
  '⋄', '⋆', '∗', '⁕', '⁂',
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
  style: SymbolStyle = 'icons',
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
