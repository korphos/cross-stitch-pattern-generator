import type { RGB, DmcColor, PaletteEntry } from './types'
import { clusterColors } from './colorClustering'
import { nearestDmc } from './colorMatch'
import { assignSymbols, contrastTextColor } from './symbolAssignment'

export interface PaletteResult {
  palette: PaletteEntry[]
  /** DMC code (matches a `palette` entry's `dmc.code`) per input cell, same order/length as `cellColors` */
  cellAssignment: string[]
}

/**
 * Full pipeline from raw per-cell sampled colors to a print-ready palette:
 * cluster near-identical colors, match each cluster to its nearest DMC
 * floss, merge clusters that land on the *same* DMC code (two visually
 * close but distinct sampled colors can round to one floss color - they
 * should share a single legend row/symbol, not two), then assign glyphs.
 */
export function buildPalette(cellColors: RGB[], deltaEThreshold: number): PaletteResult {
  const { clusters, sampleToCluster } = clusterColors(cellColors, deltaEThreshold)

  interface Accum {
    dmc: DmcColor
    count: number
    deltaESum: number
  }
  const byDmcCode = new Map<string, Accum>()
  const clusterIdToDmcCode = new Map<number, string>()

  for (const cluster of clusters) {
    const match = nearestDmc(cluster.color)
    clusterIdToDmcCode.set(cluster.id, match.dmc.code)
    const existing = byDmcCode.get(match.dmc.code)
    if (existing) {
      existing.count += cluster.count
      existing.deltaESum += match.deltaE * cluster.count
    } else {
      byDmcCode.set(match.dmc.code, { dmc: match.dmc, count: cluster.count, deltaESum: match.deltaE * cluster.count })
    }
  }

  const merged = [...byDmcCode.values()].map((acc) => ({
    color: { r: acc.dmc.r, g: acc.dmc.g, b: acc.dmc.b } as RGB,
    dmc: acc.dmc,
    deltaE: acc.deltaESum / acc.count,
    count: acc.count,
  }))

  const withSymbols = assignSymbols(merged)
  const palette: PaletteEntry[] = withSymbols.map((entry) => ({
    ...entry,
    textColor: contrastTextColor(entry.color),
  }))

  const cellAssignment = sampleToCluster.map((clusterId) => clusterIdToDmcCode.get(clusterId)!)

  return { palette, cellAssignment }
}
