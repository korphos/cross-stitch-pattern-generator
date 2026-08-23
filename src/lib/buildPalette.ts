import type { RGB, DmcColor, PaletteEntry, PaletteMode, SymbolStyle } from './types'
import { EMPTY_CELL } from './types'
import { clusterColors } from './colorClustering'
import { nearestDmc, findFinishAlternative } from './colorMatch'
import { assignSymbols, contrastTextColor } from './symbolAssignment'
import { allDmcColors } from '../data/dmcSpecialtyColors'

export interface PaletteResult {
  palette: PaletteEntry[]
  /** DMC code (matches a `palette` entry's `dmc.code`) per input cell, same order/length as `cellColors` */
  cellAssignment: string[]
}

export interface BuildPaletteOptions {
  mode: PaletteMode
  ownedCodes: ReadonlySet<string>
  /** indices into `cellColors` to leave blank (EMPTY_CELL) instead of matching to a thread - see `findBackgroundCells` */
  backgroundCellIndices?: ReadonlySet<number>
  /** defaults to 'letters' - see SymbolStyle */
  symbolStyle?: SymbolStyle
}

const DEFAULT_OPTIONS: BuildPaletteOptions = { mode: 'best', ownedCodes: new Set() }

/**
 * In 'ownedOnly' mode, a thread from the user's inventory is used only if
 * it's within this CIEDE2000 distance of the sampled color; beyond that,
 * the match would look visibly wrong, so the single best overall match is
 * used instead (and flagged as not-owned, meaning "you'd need to buy this").
 */
const OWNED_FALLBACK_DELTA_E = 10

/**
 * Full pipeline from raw per-cell sampled colors to a print-ready palette:
 * exclude background cells (see `findBackgroundCells` - this only receives
 * the already-resolved set of indices, since telling background from an
 * interior highlight of the same color needs the grid's shape, which this
 * function doesn't otherwise need), cluster the rest's near-identical
 * colors, match each cluster to a DMC floss (either the closest thread
 * overall, or preferring the user's owned inventory - see `options.mode`),
 * merge clusters that land on the *same* DMC code (two visually close but
 * distinct sampled colors can round to one floss color - they should share
 * a single legend row/symbol, not two), then assign glyphs.
 */
export function buildPalette(
  cellColors: RGB[],
  deltaEThreshold: number,
  options: BuildPaletteOptions = DEFAULT_OPTIONS,
): PaletteResult {
  const backgroundCellIndices = options.backgroundCellIndices
  const foregroundIndices: number[] = []
  const foregroundColors: RGB[] = []
  cellColors.forEach((color, index) => {
    if (backgroundCellIndices?.has(index)) return
    foregroundIndices.push(index)
    foregroundColors.push(color)
  })

  const { clusters, sampleToCluster } = clusterColors(foregroundColors, deltaEThreshold)
  const ownedTable = options.ownedCodes.size > 0 ? allDmcColors.filter((d) => options.ownedCodes.has(d.code)) : []

  interface Accum {
    dmc: DmcColor
    count: number
    deltaESum: number
    owned: boolean
  }
  const byDmcCode = new Map<string, Accum>()
  const clusterIdToDmcCode = new Map<number, string>()

  for (const cluster of clusters) {
    let match = nearestDmc(cluster.color)
    let owned = options.ownedCodes.has(match.dmc.code)

    if (options.mode === 'ownedOnly' && ownedTable.length > 0) {
      const ownedMatch = nearestDmc(cluster.color, ownedTable)
      if (ownedMatch.deltaE <= OWNED_FALLBACK_DELTA_E) {
        match = ownedMatch
        owned = true
      } else {
        // Nothing owned is close enough - keep the best overall match
        // (already computed above) but flag it as not-owned.
        owned = false
      }
    }

    clusterIdToDmcCode.set(cluster.id, match.dmc.code)
    const existing = byDmcCode.get(match.dmc.code)
    if (existing) {
      existing.count += cluster.count
      existing.deltaESum += match.deltaE * cluster.count
    } else {
      byDmcCode.set(match.dmc.code, { dmc: match.dmc, count: cluster.count, deltaESum: match.deltaE * cluster.count, owned })
    }
  }

  const merged = [...byDmcCode.values()].map((acc) => ({
    color: { r: acc.dmc.r, g: acc.dmc.g, b: acc.dmc.b } as RGB,
    dmc: acc.dmc,
    deltaE: acc.deltaESum / acc.count,
    count: acc.count,
    owned: acc.owned,
    finishAlternative: findFinishAlternative(acc.dmc),
  }))

  const withSymbols = assignSymbols(merged, options.symbolStyle ?? 'letters')
  const palette: PaletteEntry[] = withSymbols.map((entry) => ({
    ...entry,
    textColor: contrastTextColor(entry.color),
  }))

  // Every cell starts out EMPTY_CELL (covers the background-excluded ones);
  // foreground cells then get their DMC code filled in at their *original*
  // index, since `sampleToCluster`/`foregroundColors` were reindexed to
  // skip background cells entirely.
  const cellAssignment = new Array<string>(cellColors.length).fill(EMPTY_CELL)
  sampleToCluster.forEach((clusterId, i) => {
    cellAssignment[foregroundIndices[i]] = clusterIdToDmcCode.get(clusterId)!
  })

  return { palette, cellAssignment }
}
