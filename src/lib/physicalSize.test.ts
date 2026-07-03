import { describe, expect, it } from 'vitest'
import { computePhysicalSize, formatPhysicalSize } from './physicalSize'

describe('computePhysicalSize', () => {
  it('converts stitch counts to centimeters for a given fabric count', () => {
    const size = computePhysicalSize(14, 14, 14)
    expect(size.widthCm).toBeCloseTo(2.54, 2)
    expect(size.heightCm).toBeCloseTo(2.54, 2)
  })

  it('scales inversely with stitches-per-inch (finer fabric -> smaller finished size)', () => {
    const coarse = computePhysicalSize(100, 80, 11)
    const fine = computePhysicalSize(100, 80, 22)
    expect(fine.widthCm).toBeCloseTo(coarse.widthCm / 2, 5)
    expect(fine.heightCm).toBeCloseTo(coarse.heightCm / 2, 5)
  })

  it('scales linearly with grid dimensions', () => {
    const a = computePhysicalSize(50, 40, 14)
    const b = computePhysicalSize(100, 80, 14)
    expect(b.widthCm).toBeCloseTo(a.widthCm * 2, 5)
    expect(b.heightCm).toBeCloseTo(a.heightCm * 2, 5)
  })
})

describe('formatPhysicalSize', () => {
  it('formats to one decimal with a "cm x cm" suffix by default', () => {
    expect(formatPhysicalSize({ widthCm: 5.04, heightCm: 4.06 })).toBe('5.0 cm x 4.1 cm')
  })

  it('formats in inches when the unit is "in"', () => {
    expect(formatPhysicalSize({ widthCm: 2.54, heightCm: 5.08 }, 'in')).toBe('1.0 in x 2.0 in')
  })
})
