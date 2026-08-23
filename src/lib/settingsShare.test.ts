import { describe, expect, it } from 'vitest'
import { encodeSettings, decodeSettings } from './settingsShare'
import { allDmcColors } from '../data/dmcSpecialtyColors'

describe('settingsShare', () => {
  it('round-trips an empty inventory', () => {
    const decoded = decodeSettings(encodeSettings({ ownedThreadCodes: [], sizeUnit: 'cm', printMode: 'auto', printColorMode: 'color', symbolStyle: 'letters' }))
    expect(decoded).toEqual({ ownedThreadCodes: [], sizeUnit: 'cm', printMode: 'auto', printColorMode: 'color', symbolStyle: 'letters' })
  })

  it('round-trips a handful of owned codes and the size unit', () => {
    const codes = ['310', 'B5200', 'E3852', 'S310']
    const decoded = decodeSettings(encodeSettings({ ownedThreadCodes: codes, sizeUnit: 'in', printMode: 'auto', printColorMode: 'color', symbolStyle: 'letters' }))
    expect(decoded?.sizeUnit).toBe('in')
    expect(decoded?.ownedThreadCodes.sort()).toEqual([...codes].sort())
  })

  it('round-trips every known thread owned', () => {
    const codes = allDmcColors.map((d) => d.code)
    const decoded = decodeSettings(encodeSettings({ ownedThreadCodes: codes, sizeUnit: 'cm', printMode: 'auto', printColorMode: 'color', symbolStyle: 'letters' }))
    expect(decoded?.ownedThreadCodes.sort()).toEqual([...codes].sort())
  })

  it('ignores unknown codes when encoding (they cannot be represented in the bitset)', () => {
    const decoded = decodeSettings(encodeSettings({ ownedThreadCodes: ['not-a-real-code'], sizeUnit: 'cm', printMode: 'auto', printColorMode: 'color', symbolStyle: 'letters' }))
    expect(decoded?.ownedThreadCodes).toEqual([])
  })

  it('produces a token shorter than a naive comma-joined list, for a realistic owned count', () => {
    const codes = allDmcColors.slice(0, 60).map((d) => d.code)
    const token = encodeSettings({ ownedThreadCodes: codes, sizeUnit: 'cm', printMode: 'auto', printColorMode: 'color', symbolStyle: 'letters' })
    expect(token.length).toBeLessThan(codes.join(',').length)
  })

  it('is unaffected by the order of allDmcColors - codes are stored as text, not by index', () => {
    const codes = ['3852', 'B5200', 'E155', 'S602']
    const decoded = decodeSettings(encodeSettings({ ownedThreadCodes: codes, sizeUnit: 'cm', printMode: 'auto', printColorMode: 'color', symbolStyle: 'letters' }))
    expect(decoded?.ownedThreadCodes.sort()).toEqual([...codes].sort())
  })

  it('returns null for garbage input', () => {
    expect(decodeSettings('!!!not-base64!!!')).toBeNull()
  })

  it('returns null for an empty token', () => {
    expect(decodeSettings('')).toBeNull()
  })
})
