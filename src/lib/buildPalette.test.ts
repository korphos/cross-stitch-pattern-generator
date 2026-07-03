import { describe, expect, it } from 'vitest'
import { buildPalette } from './buildPalette'
import { dmcColors } from '../data/dmcColors'
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
})
