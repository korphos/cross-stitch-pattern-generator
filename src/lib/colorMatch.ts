import { converter, differenceCiede2000, type Lab } from 'culori'
import type { RGB, DmcColor } from './types'
import { dmcColors } from '../data/dmcColors'
import { dmcSpecialtyColors } from '../data/dmcSpecialtyColors'

const toLab = converter('lab')
const deltaE = differenceCiede2000()

function rgbToLab(rgb: RGB): Lab {
  return toLab({ mode: 'rgb', r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 })
}

const dmcLabByCode = new Map<string, Lab>(
  [...dmcColors, ...dmcSpecialtyColors].map((d) => [d.code, rgbToLab(d)]),
)

export interface DmcMatch {
  dmc: DmcColor
  deltaE: number
}

/** Nearest DMC floss color to `rgb`, by perceptual CIEDE2000 distance in Lab space. */
export function nearestDmc(rgb: RGB, table: DmcColor[] = dmcColors): DmcMatch {
  const targetLab = rgbToLab(rgb)
  let best: DmcMatch | null = null
  for (const entry of table) {
    const entryLab = dmcLabByCode.get(entry.code) ?? rgbToLab(entry)
    const d = deltaE(targetLab, entryLab)
    if (!best || d < best.deltaE) best = { dmc: entry, deltaE: d }
  }
  return best!
}

/** CIEDE2000 perceptual distance between two sRGB colors. */
export function colorDistance(a: RGB, b: RGB): number {
  return deltaE(rgbToLab(a), rgbToLab(b))
}

/** All DMC colors sorted nearest-first (by CIEDE2000) to `target`, e.g. for a "recolor to..." picker. */
export function sortedBySimilarity(target: RGB, table: DmcColor[] = dmcColors): (DmcColor & { deltaE: number })[] {
  const targetLab = rgbToLab(target)
  return table
    .map((entry) => ({ ...entry, deltaE: deltaE(targetLab, dmcLabByCode.get(entry.code) ?? rgbToLab(entry)) }))
    .sort((a, b) => a.deltaE - b.deltaE)
}

/**
 * A specialty thread (metallic/satin) close enough to `dmc` to be worth
 * offering as a switchable alternative - or, when `dmc` is itself already a
 * specialty thread, the nearest standard floss (so the user can switch
 * back). Undefined when nothing of the other kind is close enough.
 */
const FINISH_ALTERNATIVE_DELTA_E = 8

export function findFinishAlternative(dmc: DmcColor): { dmc: DmcColor; deltaE: number } | undefined {
  const table = dmc.finish ? dmcColors : dmcSpecialtyColors
  const match = nearestDmc(dmc, table)
  return match.deltaE <= FINISH_ALTERNATIVE_DELTA_E ? match : undefined
}
