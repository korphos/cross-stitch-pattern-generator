import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import type { PaletteEntry } from '../lib/types'
import { EMPTY_CELL } from '../lib/types'
import { cellIndexFromPoint, computeCanvasSize, renderPattern, setupCanvasForDpr } from '../lib/renderPattern'

interface Props {
  cols: number
  rows: number
  cellAssignment: string[]
  palette: PaletteEntry[]
  cellPx?: number
  /** row*cols+col of every cell to outline (e.g. currently being recolored) */
  selectedCellIndices?: ReadonlySet<number>
  /** DMC code to dim every other cell against, e.g. while hovering it in the sidebar */
  highlightCode?: string | null
  /** hides gridlines, symbols, and rulers for a clean look at just the stitched colors */
  previewMode?: boolean
  /**
   * `additive` is true for Ctrl/Cmd+click: add to (or remove from) the selection instead of
   * replacing it. `range` is true for Shift+click: select every cell in the rectangle between
   * the last plain-clicked cell and this one (a single row/column when they line up).
   */
  onCellClick?: (cellIndex: number, additive: boolean, range: boolean) => void
  /** reports the DMC code under the pointer (or null off-grid/blank), e.g. to highlight it in the sidebar */
  onCellHover?: (code: string | null) => void
}

export function PatternCanvas({
  cols,
  rows,
  cellAssignment,
  palette,
  cellPx = 24,
  selectedCellIndices,
  highlightCode = null,
  previewMode = false,
  onCellClick,
  onCellHover,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastHoverCodeRef = useRef<string | null>(null)
  const showRulers = !previewMode

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height, rulerMargin } = computeCanvasSize(cols, rows, cellPx, showRulers)
    const ctx = setupCanvasForDpr(canvas, width, height)
    renderPattern(
      ctx,
      { cols, rows, cellAssignment, palette, highlightCode },
      { cellPx, showRulers, showSymbols: !previewMode, showGridLines: !previewMode },
    )

    if (selectedCellIndices) {
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 3
      for (const index of selectedCellIndices) {
        const row = Math.floor(index / cols)
        const col = index % cols
        ctx.strokeRect(rulerMargin + col * cellPx + 1.5, rulerMargin + row * cellPx + 1.5, cellPx - 3, cellPx - 3)
      }
    }
  }, [cols, rows, cellAssignment, palette, cellPx, selectedCellIndices, highlightCode, showRulers, previewMode])

  function handleClick(e: MouseEvent<HTMLCanvasElement>) {
    if (!onCellClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cellIndex = cellIndexFromPoint(e.clientX - rect.left, e.clientY - rect.top, cols, rows, cellPx, showRulers)
    if (cellIndex !== null) onCellClick(cellIndex, e.ctrlKey || e.metaKey, e.shiftKey)
  }

  function reportHover(code: string | null) {
    if (code === lastHoverCodeRef.current) return
    lastHoverCodeRef.current = code
    onCellHover?.(code)
  }

  function handleMouseMove(e: MouseEvent<HTMLCanvasElement>) {
    if (!onCellHover) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cellIndex = cellIndexFromPoint(e.clientX - rect.left, e.clientY - rect.top, cols, rows, cellPx, showRulers)
    const code = cellIndex !== null ? cellAssignment[cellIndex] : null
    reportHover(code && code !== EMPTY_CELL ? code : null)
  }

  function handleMouseLeave() {
    reportHover(null)
  }

  // Middle-click drag pans the scrollable viewport, same as most image/map editors - handy once
  // zoomed in past what fits. Native listeners so the drag keeps tracking even if the cursor
  // leaves the scroll container mid-drag; preventDefault suppresses the browser's own middle-click
  // autoscroll/paste behavior from also kicking in.
  function startMiddleClickPan(e: MouseEvent<HTMLDivElement>) {
    if (e.button !== 1) return
    e.preventDefault()
    const scrollEl = e.currentTarget
    const startX = e.clientX
    const startY = e.clientY
    const startScrollLeft = scrollEl.scrollLeft
    const startScrollTop = scrollEl.scrollTop
    function onMove(ev: globalThis.MouseEvent) {
      scrollEl.scrollLeft = startScrollLeft - (ev.clientX - startX)
      scrollEl.scrollTop = startScrollTop - (ev.clientY - startY)
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="flex h-full overflow-auto p-8" onMouseDown={startMiddleClickPan}>
      <canvas
        ref={canvasRef}
        className={`m-auto shadow-lg ${onCellClick ? 'cursor-pointer' : ''}`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  )
}
