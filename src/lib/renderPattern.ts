import type { PaletteEntry } from './types'
import type { PageTile } from './printLayout'

export interface RenderGridInput {
  cols: number
  rows: number
  /** DMC code (matches a `palette` entry's `dmc.code`) per cell, row-major, length cols*rows */
  cellAssignment: string[]
  palette: PaletteEntry[]
  /** when set, every cell whose code doesn't match is dimmed so this color stands out (e.g. hovering it in the sidebar) */
  highlightCode?: string | null
}

/** A sub-rectangle of the full grid, in global row/col coordinates - see the multi-page print
 * layout in printLayout.ts. Rendering a window draws only these cells, sized to just the
 * window's own dimensions, while keeping ruler numbers in *global* coordinates. */
export interface RenderWindow {
  colStart: number
  colEnd: number
  rowStart: number
  rowEnd: number
}

/** Cell index (row*cols+col) under a click/pointer point in the same CSS-px space the canvas was rendered in, or null if outside the grid. */
export function cellIndexFromPoint(
  x: number,
  y: number,
  cols: number,
  rows: number,
  cellPx: number,
  showRulers = true,
): number | null {
  const { rulerMargin } = computeCanvasSize(cols, rows, cellPx, showRulers)
  const col = Math.floor((x - rulerMargin) / cellPx)
  const row = Math.floor((y - rulerMargin) / cellPx)
  if (col < 0 || col >= cols || row < 0 || row >= rows) return null
  return row * cols + col
}

export interface RenderOptions {
  /** size of one stitch cell in output (CSS) pixels */
  cellPx: number
  showRulers?: boolean
  /** hide the symbol/letter glyphs, e.g. for a clean preview of just the stitched colors */
  showSymbols?: boolean
  /** hide the cell gridlines, e.g. for a clean preview of just the stitched colors */
  showGridLines?: boolean
  fontFamily?: string
  /** draws only this sub-rectangle (global coordinates) instead of the whole grid - see
   * `RenderWindow`. Ruler numbers are always labeled at the window's own edges in addition to
   * the usual every-5 ticks, so a printed page's exact boundary is unambiguous. */
  window?: RenderWindow
}

const RULER_EVERY = 5
const THICK_EVERY = 10

export function computeCanvasSize(cols: number, rows: number, cellPx: number, showRulers = true, window?: RenderWindow) {
  const rulerMargin = showRulers ? Math.max(18, Math.round(cellPx * 0.9)) : 0
  const w = window ? window.colEnd - window.colStart : cols
  const h = window ? window.rowEnd - window.rowStart : rows
  return {
    width: w * cellPx + rulerMargin,
    height: h * cellPx + rulerMargin,
    rulerMargin,
  }
}

/** Sizes a canvas crisply for the current devicePixelRatio and returns a scaled 2D context. */
export function setupCanvasForDpr(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(cssWidth * dpr)
  canvas.height = Math.round(cssHeight * dpr)
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssHeight}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

/**
 * Draws the full pattern: cell fills, glyphs, then gridlines in three
 * passes (fine every cell, medium every 5, thick every 10) so thicker
 * lines always paint on top, then row/column ruler numbers every 5.
 */
export function renderPattern(ctx: CanvasRenderingContext2D, grid: RenderGridInput, options: RenderOptions): void {
  const { cols, rows, cellAssignment, palette, highlightCode } = grid
  const { cellPx, fontFamily = 'ui-monospace, Menlo, Consolas, monospace' } = options
  const showRulers = options.showRulers ?? true
  const showSymbols = options.showSymbols ?? true
  const showGridLines = options.showGridLines ?? true
  const isWindowed = options.window !== undefined
  const win = options.window ?? { colStart: 0, colEnd: cols, rowStart: 0, rowEnd: rows }
  const { rulerMargin, width, height } = computeCanvasSize(cols, rows, cellPx, showRulers, win)
  const originX = rulerMargin
  const originY = rulerMargin
  const paletteByCode = new Map(palette.map((entry) => [entry.dmc.code, entry]))

  // Cell (row, col) is given in *global* grid coordinates throughout - these translate a global
  // coordinate to this canvas's own local pixel space, which starts at the window's top-left
  // corner rather than the full grid's. A no-op offset when unwindowed (colStart/rowStart are 0).
  const toPxX = (col: number) => originX + (col - win.colStart) * cellPx
  const toPxY = (row: number) => originY + (row - win.rowStart) * cellPx

  ctx.clearRect(0, 0, width, height)

  // 1. cell fills - cells with no matching palette entry (deleted colors,
  // e.g. a background left unstitched) are filled plain white rather than
  // left transparent, so they read as blank fabric, not a rendering gap.
  for (let row = win.rowStart; row < win.rowEnd; row++) {
    for (let col = win.colStart; col < win.colEnd; col++) {
      const entry = paletteByCode.get(cellAssignment[row * cols + col])
      ctx.fillStyle = entry ? `rgb(${entry.color.r}, ${entry.color.g}, ${entry.color.b})` : '#ffffff'
      ctx.fillRect(toPxX(col), toPxY(row), cellPx, cellPx)
    }
  }

  // 2. glyphs
  if (showSymbols) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${Math.round(cellPx * 0.62)}px ${fontFamily}`
    for (let row = win.rowStart; row < win.rowEnd; row++) {
      for (let col = win.colStart; col < win.colEnd; col++) {
        const entry = paletteByCode.get(cellAssignment[row * cols + col])
        if (!entry) continue
        ctx.fillStyle = entry.textColor
        ctx.fillText(entry.symbol, toPxX(col) + cellPx / 2, toPxY(row) + cellPx / 2 + cellPx * 0.03)
      }
    }
  }

  // 3. gridlines (fine -> medium every 5 -> thick every 10, later passes on top) - the every-5/
  // every-10 modulo checks always use the *global* col/row index, even when windowed, so a page's
  // gridline weights line up with the whole pattern's numbering instead of restarting at the
  // page's own edge.
  if (showGridLines) {
    const gridRight = toPxX(win.colEnd)
    const gridBottom = toPxY(win.rowEnd)

    const drawVLine = (col: number, lineWidth: number, color: string) => {
      const x = toPxX(col)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      ctx.moveTo(x, originY)
      ctx.lineTo(x, gridBottom)
      ctx.stroke()
    }
    const drawHLine = (row: number, lineWidth: number, color: string) => {
      const y = toPxY(row)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      ctx.moveTo(originX, y)
      ctx.lineTo(gridRight, y)
      ctx.stroke()
    }

    for (let col = win.colStart; col <= win.colEnd; col++) {
      if (col % THICK_EVERY === 0 || col % RULER_EVERY === 0) continue
      drawVLine(col, 0.5, 'rgba(0,0,0,0.35)')
    }
    for (let row = win.rowStart; row <= win.rowEnd; row++) {
      if (row % THICK_EVERY === 0 || row % RULER_EVERY === 0) continue
      drawHLine(row, 0.5, 'rgba(0,0,0,0.35)')
    }
    for (let col = win.colStart; col <= win.colEnd; col++) {
      if (col % THICK_EVERY === 0) continue
      if (col % RULER_EVERY === 0) drawVLine(col, 1.1, 'rgba(0,0,0,0.7)')
    }
    for (let row = win.rowStart; row <= win.rowEnd; row++) {
      if (row % THICK_EVERY === 0) continue
      if (row % RULER_EVERY === 0) drawHLine(row, 1.1, 'rgba(0,0,0,0.7)')
    }
    for (let col = win.colStart; col <= win.colEnd; col++) {
      if (col % THICK_EVERY === 0) drawVLine(col, 2.2, '#000')
    }
    for (let row = win.rowStart; row <= win.rowEnd; row++) {
      if (row % THICK_EVERY === 0) drawHLine(row, 2.2, '#000')
    }
  }

  // 4. highlight - dim every cell that isn't the hovered color, so it pops
  // out against the rest of the pattern.
  if (highlightCode) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    for (let row = win.rowStart; row < win.rowEnd; row++) {
      for (let col = win.colStart; col < win.colEnd; col++) {
        if (cellAssignment[row * cols + col] === highlightCode) continue
        ctx.fillRect(toPxX(col), toPxY(row), cellPx, cellPx)
      }
    }
  }

  // 5. rulers - always labeled at the usual every-5 ticks; a windowed render (a printed page)
  // additionally always labels its own edges, even off-multiples-of-5, so the exact stitch a
  // page starts/ends on is unambiguous when lining sheets up against each other.
  if (showRulers) {
    ctx.fillStyle = '#000'
    ctx.font = `${Math.max(9, Math.round(cellPx * 0.4))}px ${fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    const colLabels = new Set<number>()
    for (let col = Math.ceil(win.colStart / RULER_EVERY) * RULER_EVERY; col <= win.colEnd; col += RULER_EVERY) colLabels.add(col)
    if (isWindowed) {
      colLabels.add(win.colStart)
      colLabels.add(win.colEnd)
    }
    for (const col of colLabels) ctx.fillText(String(col), toPxX(col), originY - 2)

    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    const rowLabels = new Set<number>()
    for (let row = Math.ceil(win.rowStart / RULER_EVERY) * RULER_EVERY; row <= win.rowEnd; row += RULER_EVERY) rowLabels.add(row)
    if (isWindowed) {
      rowLabels.add(win.rowStart)
      rowLabels.add(win.rowEnd)
    }
    for (const row of rowLabels) ctx.fillText(String(row), originX - 4, toPxY(row))
  }
}

/**
 * Draws the page-boundary grid + page numbers over an already-rendered thumbnail of the whole
 * pattern (see `renderPattern` with a tiny `cellPx` and symbols/gridlines/rulers off) - the
 * assembly map on the print legend page for a multi-page pattern.
 */
export function renderPageMapOverlay(ctx: CanvasRenderingContext2D, tiles: PageTile[], thumbCellPx: number): void {
  if (tiles.length === 0) return
  const first = tiles[0]
  const tileWidthPx = (first.colEnd - first.colStart) * thumbCellPx
  const tileHeightPx = (first.rowEnd - first.rowStart) * thumbCellPx
  const fontSize = Math.max(8, Math.min(16, Math.round(Math.min(tileWidthPx, tileHeightPx) * 0.3)))

  ctx.save()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.font = `bold ${fontSize}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const tile of tiles) {
    const x = tile.colStart * thumbCellPx
    const y = tile.rowStart * thumbCellPx
    const w = (tile.colEnd - tile.colStart) * thumbCellPx
    const h = (tile.rowEnd - tile.rowStart) * thumbCellPx
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
    const label = String(tile.index + 1)
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(0,0,0,0.65)'
    ctx.strokeText(label, x + w / 2, y + h / 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, x + w / 2, y + h / 2)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
  }
  ctx.restore()
}
