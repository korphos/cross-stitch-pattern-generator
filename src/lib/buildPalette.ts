import type { RGB, DmcColor, PaletteEntry, PaletteMode, SymbolStyle } from './types'
import { EMPTY_CELL } from './types'
import { clusterPreparedColors, prepareColors, type PreparedColors } from './colorClustering'
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

interface ForegroundColors {
  /** indices into the original `cellColors` that survived background exclusion, same order as `prepared` was built from */
  foregroundIndices: number[]
  /** deduped + Lab-converted once, independent of `deltaEThreshold` - see `prepareColors` */
  prepared: PreparedColors
}

function prepareForeground(cellColors: RGB[], backgroundCellIndices: ReadonlySet<number> | undefined): ForegroundColors {
  const foregroundIndices: number[] = []
  const foregroundColors: RGB[] = []
  cellColors.forEach((color, index) => {
    if (backgroundCellIndices?.has(index)) return
    foregroundIndices.push(index)
    foregroundColors.push(color)
  })
  return { foregroundIndices, prepared: prepareColors(foregroundColors) }
}

/**
 * The threshold-dependent half of `buildPalette`: cluster the already-prepared foreground colors,
 * match each cluster to a DMC floss, merge clusters landing on the same code, assign glyphs. Split
 * out so `buildPaletteForTargetCount`'s search can reuse one `prepareForeground` pass (the
 * expensive per-color dedup + Lab conversion) across every threshold it tries, instead of redoing
 * it - unchanged by threshold - on each of its ~15 probes.
 */
function assemblePalette(
  cellColorsLength: number,
  foreground: ForegroundColors,
  deltaEThreshold: number,
  options: BuildPaletteOptions,
): PaletteResult {
  const { foregroundIndices, prepared } = foreground
  const { clusters, sampleToCluster } = clusterPreparedColors(prepared, deltaEThreshold)
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
  const cellAssignment = new Array<string>(cellColorsLength).fill(EMPTY_CELL)
  sampleToCluster.forEach((clusterId, i) => {
    cellAssignment[foregroundIndices[i]] = clusterIdToDmcCode.get(clusterId)!
  })

  return { palette, cellAssignment }
}

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
  const foreground = prepareForeground(cellColors, options.backgroundCellIndices)
  return assemblePalette(cellColors.length, foreground, deltaEThreshold, options)
}

export interface TargetPaletteResult extends PaletteResult {
  /** the ΔE merge threshold the search settled on, for callers that want to display/store it */
  thresholdUsed: number
}

/** Upper bound tried before falling back to whatever the highest threshold achieves - CIEDE2000 distances between very different colors rarely exceed this. */
const ABSOLUTE_MAX_THRESHOLD = 100
// Each iteration re-clusters every unique foreground color from scratch (see clusterPreparedColors)
// - for a busy photo with tens of thousands of unique colors that's the dominant cost of the whole
// search, so this stays low enough to keep the search responsive. 8 iterations over the 0-100
// range still resolves to within ~0.4 ΔE, far finer than the gaps between real achievable color
// counts in practice - more iterations buys precision this search doesn't need at a cost it can't
// afford to pay per keystroke.
const SEARCH_ITERATIONS = 8

/**
 * Wraps `buildPalette` with a binary search over `deltaEThreshold` to land the
 * final palette size as close as possible to `targetColorCount`, since the
 * threshold itself is an implementation detail users shouldn't have to reason
 * about - they think in terms of "how many colors should this pattern have."
 *
 * Raising the threshold can only merge clusters further, so the resulting
 * palette size is non-increasing in the threshold; that monotonicity is what
 * makes a binary search valid here. When the image naturally has fewer
 * distinct DMC matches than the target even with zero merging (threshold 0),
 * that's already the closest achievable result - returned immediately since
 * increasing the threshold further would only move away from the target.
 *
 * That "already close enough" check is exactly the case worth spending no
 * time on: a real photo's cell colors commonly contain tens of thousands of
 * unique RGB values (anti-aliasing/compression noise), and threshold 0
 * clusters each of those into its own group, so confirming the check would
 * mean DMC-matching (a ~500-entry CIEDE2000 scan - the actual expensive part,
 * not clusterColors' already-bucketed grouping) against every single one of
 * them, on every keystroke. The number of *unique raw colors* is a free
 * upper bound on that zero-threshold DMC-matched count - merging only ever
 * reduces cluster count further, and every cluster maps to at most one DMC
 * code - so when that bound is already within the target, the real count
 * underneath it is guaranteed to be too, letting the check happen without
 * ever running DMC-matching at the catastrophic (unmerged) end of the range.
 *
 * The search itself also shares one `prepareForeground` pass (dedup + Lab
 * conversion of every color, the dominant cost for a busy photo) across all
 * ~15 thresholds it probes, via `assemblePalette` - only the actual
 * clustering-and-DMC-matching redoes work per threshold, not the whole
 * pipeline from raw cell colors.
 */
export function buildPaletteForTargetCount(
  cellColors: RGB[],
  targetColorCount: number,
  options: BuildPaletteOptions = DEFAULT_OPTIONS,
): TargetPaletteResult {
  const target = Math.max(1, Math.round(targetColorCount))
  const foreground = prepareForeground(cellColors, options.backgroundCellIndices)
  const at = (threshold: number) => assemblePalette(cellColors.length, foreground, threshold, options)

  const uniqueColorCount = foreground.prepared.uniques.length
  if (uniqueColorCount <= target) return { ...at(0), thresholdUsed: 0 }

  let lo = 0
  // Stands in for the (deliberately never computed, see above) zero-threshold result for the
  // final distance comparison below - real once the search actually narrows lo above 0, which
  // happens on the very first iteration unless the target is so close to uniqueColorCount that
  // even the loosest mid-range threshold already satisfies it.
  let loCount = uniqueColorCount
  let loResult: PaletteResult | null = null
  let hi = ABSOLUTE_MAX_THRESHOLD
  let hiResult = at(hi)

  for (let i = 0; i < SEARCH_ITERATIONS && hi - lo > 1e-3; i++) {
    const mid = (lo + hi) / 2
    const midResult = at(mid)
    if (midResult.palette.length <= target) {
      hi = mid
      hiResult = midResult
    } else {
      lo = mid
      loCount = midResult.palette.length
      loResult = midResult
    }
  }

  // lo's count is always > target here (the target>=uniqueColorCount case returned above), hi's
  // is <= target - pick whichever lands closer to what was actually asked for. Only in the rare
  // case where lo never left 0 (loResult still unset) and it turns out to be the closer side does
  // this force the actual zero-threshold computation - everywhere else it stays exactly as cheap
  // as the search's own probes.
  const loDiff = Math.abs(loCount - target)
  const hiDiff = Math.abs(hiResult.palette.length - target)
  return loDiff < hiDiff ? { ...(loResult ?? at(lo)), thresholdUsed: lo } : { ...hiResult, thresholdUsed: hi }
}

/** The merge sensitivity used whenever `targetColorCount` is "auto" (null) - a good general-purpose default, not exposed to the user directly. */
export const DEFAULT_CLUSTER_THRESHOLD = 2.3

/**
 * Single entry point the reducer uses to go from sampled cell colors to a
 * palette: `null` means "auto", i.e. let `DEFAULT_CLUSTER_THRESHOLD` decide
 * how many colors come out (this is also what a fresh image/crop/grid
 * resample always resets `targetColorCount` back to - see `resample` in
 * projectReducer.ts); a number pins the search in `buildPaletteForTargetCount`
 * to aim for that many.
 */
export function buildPaletteAdaptive(
  cellColors: RGB[],
  targetColorCount: number | null,
  options: BuildPaletteOptions = DEFAULT_OPTIONS,
): TargetPaletteResult {
  if (targetColorCount == null) {
    return { ...buildPalette(cellColors, DEFAULT_CLUSTER_THRESHOLD, options), thresholdUsed: DEFAULT_CLUSTER_THRESHOLD }
  }
  return buildPaletteForTargetCount(cellColors, targetColorCount, options)
}
