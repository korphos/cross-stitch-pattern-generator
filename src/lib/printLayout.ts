import { EMPTY_CELL } from './types'

// The CSS "in" unit is defined as exactly 96px, so working in that reference lets us size the
// printable page precisely to US Letter - shared by PrintablePage.tsx (actual rendering) and the
// layout math below (deciding page count before anything is rendered).
export const PX_PER_INCH = 96
export const PAGE_WIDTH_IN = 8.5
export const PAGE_HEIGHT_IN = 11
export const MARGIN_IN = 0.5
export const PAGE_USABLE_WIDTH_PX = (PAGE_WIDTH_IN - 2 * MARGIN_IN) * PX_PER_INCH
export const PAGE_USABLE_HEIGHT_PX = (PAGE_HEIGHT_IN - 2 * MARGIN_IN) * PX_PER_INCH

export type PrintMode = 'auto' | 'single' | 'multi'

/** One printed sheet's slice of the full grid, in global (whole-pattern) row/col coordinates. */
export interface PageTile {
  /** 0-based, row-major reading order (left-to-right, top-to-bottom) */
  index: number
  pageRow: number
  pageCol: number
  colStart: number
  /** exclusive */
  colEnd: number
  rowStart: number
  /** exclusive */
  rowEnd: number
}

export interface PrintLayout {
  mode: 'single' | 'multi'
  /** stitch cell size, CSS px, used for every tile */
  cellPx: number
  pagesX: number
  pagesY: number
  /** row-major; a single-page layout has exactly one tile spanning the whole grid */
  tiles: PageTile[]
}

/** Cross-stitch symbols become illegible somewhere around this cell size (CSS px) when printed -
 * still governs the single-vs-multi auto-switch below, independently of the multi-page baseline
 * itself (which can start smaller than this - see `MULTI_PAGE_CELL_PX`). */
export const LEGIBILITY_THRESHOLD_PX = 10
/** Baseline cell size multi-page mode starts from - the actual size used ends up a bit larger
 * once pages are evenly divided (see `computePrintLayout`), since evening out a ragged last
 * row/column of stitches into equal-sized pages leaves each page with room to spare at this
 * baseline, which goes toward bigger, easier-to-read cells instead of blank margin. Kept smaller
 * than a "comfortably legible" size on purpose: fitting more stitches per sheet at a still-usable
 * size means fewer sheets overall for a large pattern, which matters more in practice than a few
 * extra millimeters per symbol. */
export const MULTI_PAGE_CELL_PX = 10
/** Multi-page cells never grow bigger than this even when a pattern divides into very few
 * stitches per page - matches the single-page cap so a small residual page doesn't look absurd. */
const MULTI_PAGE_MAX_CELL_PX = 30
/** Rough budget reserved for the single-page header text + color legend below the grid, when
 * estimating whether a pattern would still be legible squeezed onto one sheet - the real
 * single-page layout measures its actual DOM height and shrinks further if needed (see
 * PrintablePage.tsx's `fit.scale`), this is only for the auto/multi decision below. */
const SINGLE_PAGE_RESERVED_HEIGHT_PX = 260
/** Small header strip ("Page N of M") reserved at the top of every multi-page sheet. */
const MULTI_PAGE_HEADER_HEIGHT_PX = 24
/** A tile isn't worth its own printed sheet below both of these bars - e.g. a corner of a round
 * crop that a rectangular tile grid only barely clips. The pattern's still fully represented on
 * the color page's whole-pattern thumbnail, so nothing is actually lost by skipping its sheet. */
const MIN_TILE_STITCHED_CELLS = 4
const MIN_TILE_STITCHED_FRACTION = 0.01

function estimateSinglePageCellPx(cols: number, rows: number, pageUsableWidthPx: number, pageUsableHeightPx: number): number {
  const byWidth = pageUsableWidthPx / cols
  const byHeight = (pageUsableHeightPx - SINGLE_PAGE_RESERVED_HEIGHT_PX) / rows
  return Math.max(2, Math.min(30, Math.floor(Math.min(byWidth, byHeight))))
}

/** How many stitches fit across one page dimension at a given cell size. */
function maxStitchesPerPage(usablePx: number, marginPx: number, cellPx: number): number {
  return Math.max(1, Math.floor((usablePx - marginPx) / cellPx))
}

/** Splits `total` into `buckets` parts as evenly as possible - sizes differ by at most one
 * (the remainder is spread one-per-bucket across the first buckets, not dumped on the last). */
function distributeEvenly(total: number, buckets: number): number[] {
  const base = Math.floor(total / buckets)
  const remainder = total % buckets
  return Array.from({ length: buckets }, (_, i) => base + (i < remainder ? 1 : 0))
}

/** Running total of `sizes`, so `[starts[i], starts[i+1])` is bucket `i`'s range. */
function cumulativeStarts(sizes: number[]): number[] {
  const starts = [0]
  for (const size of sizes) starts.push(starts[starts.length - 1] + size)
  return starts
}

/**
 * Counts cells actually assigned a thread within a tile's bounds - the fraction of it worth
 * printing. `cellAssignment` is row-major over the *full* grid (`gridCols` wide), same indexing
 * `sampleGridColors`/`buildPalette` use elsewhere.
 */
function countStitchedCells(tile: PageTile, cellAssignment: string[], gridCols: number): number {
  let count = 0
  for (let row = tile.rowStart; row < tile.rowEnd; row++) {
    for (let col = tile.colStart; col < tile.colEnd; col++) {
      if (cellAssignment[row * gridCols + col] !== EMPTY_CELL) count++
    }
  }
  return count
}

/**
 * Decides whether the pattern fits legibly on one printed sheet or needs to be tiled across
 * several, and if so, exactly where each page's boundaries fall - `mode: 'auto'` switches to
 * multi-page only once a single sheet would shrink stitches below `LEGIBILITY_THRESHOLD_PX`;
 * `'single'`/`'multi'` force one or the other regardless of size. Ruler numbers stay in *global*
 * grid coordinates on every page (see renderPattern.ts's windowed rendering), so lining up
 * printed sheets by their row/col numbers is enough to assemble them - no overlap needed.
 *
 * Multi-page tiles are sized by evenly dividing cols/rows across however many pages are needed at
 * the baseline cell size, rather than cutting fixed-size blocks and leaving a ragged, often
 * near-empty sliver as the last row/column - the cell size then grows to fill whatever room that
 * even division leaves spare, up to `MULTI_PAGE_MAX_CELL_PX`. When `cellAssignment` is given
 * (the actual stitch-per-cell data, not just grid dimensions), any tile with next to nothing
 * actually stitched in it - typically a corner a round/irregular crop left outside the design -
 * is dropped rather than printed as a blank or near-blank sheet; the remaining pages are
 * renumbered so the printed sequence has no gaps.
 */
export function computePrintLayout(
  cols: number,
  rows: number,
  mode: PrintMode,
  cellAssignment: string[] | null = null,
  pageUsableWidthPx: number = PAGE_USABLE_WIDTH_PX,
  pageUsableHeightPx: number = PAGE_USABLE_HEIGHT_PX,
): PrintLayout {
  const wouldBeSinglePageCellPx = estimateSinglePageCellPx(cols, rows, pageUsableWidthPx, pageUsableHeightPx)
  const useMulti = mode === 'multi' || (mode === 'auto' && wouldBeSinglePageCellPx < LEGIBILITY_THRESHOLD_PX)

  if (!useMulti) {
    return {
      mode: 'single',
      cellPx: wouldBeSinglePageCellPx,
      pagesX: 1,
      pagesY: 1,
      tiles: [{ index: 0, pageRow: 0, pageCol: 0, colStart: 0, colEnd: cols, rowStart: 0, rowEnd: rows }],
    }
  }

  const baseRulerMargin = Math.max(18, Math.round(MULTI_PAGE_CELL_PX * 0.9))
  const pagesX = Math.ceil(cols / maxStitchesPerPage(pageUsableWidthPx, baseRulerMargin, MULTI_PAGE_CELL_PX))
  const pagesY = Math.ceil(
    rows / maxStitchesPerPage(pageUsableHeightPx - MULTI_PAGE_HEADER_HEIGHT_PX, baseRulerMargin, MULTI_PAGE_CELL_PX),
  )

  // Evenly redistribute cols/rows across that many pages (instead of cols/pagesX-sized blocks,
  // which still leave a shrunken remainder on the last page whenever cols/pagesX isn't a whole
  // number - e.g. 400 cols over 12 pages at 34/page apiece would leave just 400-11*34=26 on the
  // last one). The extra few stitches that don't divide evenly are spread one-per-page across the
  // first pages instead, so no two pages differ in size by more than one stitch.
  const colSizes = distributeEvenly(cols, pagesX)
  const rowSizes = distributeEvenly(rows, pagesY)
  const colStarts = cumulativeStarts(colSizes)
  const rowStarts = cumulativeStarts(rowSizes)

  // The cell size is then grown to fill whatever room even redistribution leaves spare, sized to
  // the *largest* page on each axis so every page (not just the average-sized one) still fits.
  const cellPxByWidth = (pageUsableWidthPx - baseRulerMargin) / Math.max(...colSizes)
  const cellPxByHeight = (pageUsableHeightPx - MULTI_PAGE_HEADER_HEIGHT_PX - baseRulerMargin) / Math.max(...rowSizes)
  const cellPx = Math.max(MULTI_PAGE_CELL_PX, Math.min(MULTI_PAGE_MAX_CELL_PX, Math.floor(Math.min(cellPxByWidth, cellPxByHeight))))

  let tiles: PageTile[] = []
  let index = 0
  for (let pageRow = 0; pageRow < pagesY; pageRow++) {
    for (let pageCol = 0; pageCol < pagesX; pageCol++) {
      tiles.push({
        index: index++,
        pageRow,
        pageCol,
        colStart: colStarts[pageCol],
        colEnd: colStarts[pageCol + 1],
        rowStart: rowStarts[pageRow],
        rowEnd: rowStarts[pageRow + 1],
      })
    }
  }

  if (cellAssignment) {
    tiles = tiles
      .filter((tile) => {
        const stitched = countStitchedCells(tile, cellAssignment, cols)
        const area = (tile.colEnd - tile.colStart) * (tile.rowEnd - tile.rowStart)
        return stitched >= MIN_TILE_STITCHED_CELLS && stitched / area >= MIN_TILE_STITCHED_FRACTION
      })
      .map((tile, i) => ({ ...tile, index: i }))
  }

  return { mode: 'multi', cellPx, pagesX, pagesY, tiles }
}
