import { describe, expect, it } from 'vitest'
import { flipImageHorizontal, mirrorRowMajorHorizontal } from './imageTransform'
import type { PixelBuffer } from './types'

describe('flipImageHorizontal', () => {
  it('mirrors a 2x2 image left-right, preserving each row', () => {
    // top row: red, green - bottom row: blue, yellow
    const img: PixelBuffer = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        255, 0, 0, 255, 0, 255, 0, 255, // row 0: red, green
        0, 0, 255, 255, 255, 255, 0, 255, // row 1: blue, yellow
      ]),
    }
    const flipped = flipImageHorizontal(img)
    expect(flipped.width).toBe(2)
    expect(flipped.height).toBe(2)
    expect([...flipped.data]).toEqual([
      0, 255, 0, 255, 255, 0, 0, 255, // row 0: green, red
      255, 255, 0, 255, 0, 0, 255, 255, // row 1: yellow, blue
    ])
  })

  it('is its own inverse', () => {
    const img: PixelBuffer = {
      width: 3,
      height: 2,
      data: new Uint8ClampedArray(Array.from({ length: 3 * 2 * 4 }, (_, i) => i * 7)),
    }
    const roundTripped = flipImageHorizontal(flipImageHorizontal(img))
    expect([...roundTripped.data]).toEqual([...img.data])
  })
})

describe('mirrorRowMajorHorizontal', () => {
  it('reverses column order within each row', () => {
    const arr = ['a1', 'b1', 'c1', 'a2', 'b2', 'c2']
    expect(mirrorRowMajorHorizontal(arr, 3, 2)).toEqual(['c1', 'b1', 'a1', 'c2', 'b2', 'a2'])
  })

  it('is a no-op for a single column', () => {
    const arr = ['a', 'b', 'c']
    expect(mirrorRowMajorHorizontal(arr, 1, 3)).toEqual(['a', 'b', 'c'])
  })
})
