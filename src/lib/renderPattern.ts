import type { PaletteEntry } from './types'

export interface RenderGridInput {
  cols: number
  rows: number
  /** DMC code (matches a `palette` entry's `dmc.code`) per cell, row-major, length cols*rows */
  cellAssignment: string[]
  palette: PaletteEntry[]
  /** when set, every cell whose code doesn't match is dimmed so this color stands out (e.g. hovering it in the sidebar) */
  highlightCode?: string | null
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
  fontFamily?: string
}

const RULER_EVERY = 5
const THICK_EVERY = 10

export function computeCanvasSize(cols: number, rows: number, cellPx: number, showRulers = true) {
  const rulerMargin = showRulers ? Math.max(18, Math.round(cellPx * 0.9)) : 0
  return {
    width: cols * cellPx + rulerMargin,
    height: rows * cellPx + rulerMargin,
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
  const { rulerMargin, width, height } = computeCanvasSize(cols, rows, cellPx, showRulers)
  const originX = rulerMargin
  const originY = rulerMargin
  const paletteByCode = new Map(palette.map((entry) => [entry.dmc.code, entry]))

  ctx.clearRect(0, 0, width, height)

  // 1. cell fills - cells with no matching palette entry (deleted colors,
  // e.g. a background left unstitched) are filled plain white rather than
  // left transparent, so they read as blank fabric, not a rendering gap.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const entry = paletteByCode.get(cellAssignment[row * cols + col])
      ctx.fillStyle = entry ? `rgb(${entry.color.r}, ${entry.color.g}, ${entry.color.b})` : '#ffffff'
      ctx.fillRect(originX + col * cellPx, originY + row * cellPx, cellPx, cellPx)
    }
  }

  // 2. glyphs
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${Math.round(cellPx * 0.62)}px ${fontFamily}`
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const entry = paletteByCode.get(cellAssignment[row * cols + col])
      if (!entry) continue
      ctx.fillStyle = entry.textColor
      ctx.fillText(entry.symbol, originX + col * cellPx + cellPx / 2, originY + row * cellPx + cellPx / 2 + cellPx * 0.03)
    }
  }

  // 3. gridlines (fine -> medium every 5 -> thick every 10, later passes on top)
  const gridRight = originX + cols * cellPx
  const gridBottom = originY + rows * cellPx

  const drawVLine = (col: number, lineWidth: number, color: string) => {
    const x = originX + col * cellPx
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.beginPath()
    ctx.moveTo(x, originY)
    ctx.lineTo(x, gridBottom)
    ctx.stroke()
  }
  const drawHLine = (row: number, lineWidth: number, color: string) => {
    const y = originY + row * cellPx
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.beginPath()
    ctx.moveTo(originX, y)
    ctx.lineTo(gridRight, y)
    ctx.stroke()
  }

  for (let col = 0; col <= cols; col++) {
    if (col % THICK_EVERY === 0 || col % RULER_EVERY === 0) continue
    drawVLine(col, 0.5, 'rgba(0,0,0,0.35)')
  }
  for (let row = 0; row <= rows; row++) {
    if (row % THICK_EVERY === 0 || row % RULER_EVERY === 0) continue
    drawHLine(row, 0.5, 'rgba(0,0,0,0.35)')
  }
  for (let col = 0; col <= cols; col++) {
    if (col % THICK_EVERY === 0) continue
    if (col % RULER_EVERY === 0) drawVLine(col, 1.1, 'rgba(0,0,0,0.7)')
  }
  for (let row = 0; row <= rows; row++) {
    if (row % THICK_EVERY === 0) continue
    if (row % RULER_EVERY === 0) drawHLine(row, 1.1, 'rgba(0,0,0,0.7)')
  }
  for (let col = 0; col <= cols; col++) {
    if (col % THICK_EVERY === 0) drawVLine(col, 2.2, '#000')
  }
  for (let row = 0; row <= rows; row++) {
    if (row % THICK_EVERY === 0) drawHLine(row, 2.2, '#000')
  }

  // 4. highlight - dim every cell that isn't the hovered color, so it pops
  // out against the rest of the pattern.
  if (highlightCode) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (cellAssignment[row * cols + col] === highlightCode) continue
        ctx.fillRect(originX + col * cellPx, originY + row * cellPx, cellPx, cellPx)
      }
    }
  }

  // 5. rulers
  if (showRulers) {
    ctx.fillStyle = '#000'
    ctx.font = `${Math.max(9, Math.round(cellPx * 0.4))}px ${fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    for (let col = 0; col <= cols; col += RULER_EVERY) {
      ctx.fillText(String(col), originX + col * cellPx, originY - 2)
    }
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let row = 0; row <= rows; row += RULER_EVERY) {
      ctx.fillText(String(row), originX - 4, originY + row * cellPx)
    }
  }
}
