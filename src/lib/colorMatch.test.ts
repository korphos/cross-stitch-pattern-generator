import { describe, expect, it } from 'vitest'
import { nearestDmc, colorDistance } from './colorMatch'
import { dmcColors } from '../data/dmcColors'

describe('nearestDmc', () => {
  it('matches a known DMC color to itself with ~zero deltaE', () => {
    const black = dmcColors.find((c) => c.code === '310')!
    const match = nearestDmc({ r: black.r, g: black.g, b: black.b })
    expect(match.dmc.code).toBe('310')
    expect(match.deltaE).toBeLessThan(0.5)
  })

  it('matches a slightly perturbed color to its expected nearest neighbor', () => {
    const brightRed = dmcColors.find((c) => c.code === '666')!
    const perturbed = { r: brightRed.r - 4, g: brightRed.g + 3, b: brightRed.b - 2 }
    const match = nearestDmc(perturbed)
    expect(match.dmc.code).toBe('666')
  })

  it('matches every sampled DMC entry to itself exactly (no accidental RGB collisions in the table)', () => {
    const sample = dmcColors.filter((_, i) => i % 40 === 0)
    for (const entry of sample) {
      const match = nearestDmc({ r: entry.r, g: entry.g, b: entry.b })
      expect(match.dmc.code).toBe(entry.code)
    }
  })
})

describe('colorDistance', () => {
  it('is zero for identical colors', () => {
    expect(colorDistance({ r: 100, g: 150, b: 200 }, { r: 100, g: 150, b: 200 })).toBeCloseTo(0, 5)
  })

  it('increases with larger RGB differences', () => {
    const base = { r: 100, g: 100, b: 100 }
    const near = { r: 105, g: 100, b: 100 }
    const far = { r: 200, g: 100, b: 100 }
    expect(colorDistance(base, far)).toBeGreaterThan(colorDistance(base, near))
  })
})
