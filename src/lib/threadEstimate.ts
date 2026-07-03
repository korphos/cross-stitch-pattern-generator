import type { PaletteEntry } from './types'

/** Standard DMC stranded cotton skein: 8m of 6-strand cord. */
const SKEIN_LENGTH_CM = 800
const STRANDS_PER_SKEIN = 6

/**
 * Empirical multiplier: length of floss actually consumed per stitch, as a
 * multiple of the stitch's physical width. This folds in both diagonal
 * legs of a full cross, front-and-back thread usage, and realistic waste
 * (starting tails, travel between stitches, cut ends too short to reuse) -
 * it's a widely used embroidery rule of thumb, not a precise geometric
 * calculation, so results are an estimate: round up and buy a bit extra.
 */
const LENGTH_PER_STITCH_FACTOR = 16

export interface ThreadEstimate {
  code: string
  stitchCount: number
  skeins: number
}

/** Estimated skeins needed per color, given the fabric count and strand count in use. */
export function estimateThreadUsage(
  palette: PaletteEntry[],
  stitchesPerInch: number,
  strands: number,
): ThreadEstimate[] {
  const stitchSizeCm = 2.54 / stitchesPerInch
  const lengthPerStitchCm = LENGTH_PER_STITCH_FACTOR * stitchSizeCm * strands
  const skeinCapacityCm = SKEIN_LENGTH_CM * STRANDS_PER_SKEIN

  return palette
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      code: entry.dmc.code,
      stitchCount: entry.count,
      skeins: Math.max(1, Math.ceil((entry.count * lengthPerStitchCm) / skeinCapacityCm)),
    }))
}
