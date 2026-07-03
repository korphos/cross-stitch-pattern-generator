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
  /** row*cols+col of a cell to outline (e.g. one currently being recolored) */
  selectedCellIndex?: number | null
  /** DMC code to dim every other cell against, e.g. while hovering it in the sidebar */
  highlightCode?: string | null
  onCellClick?: (cellIndex: number) => void
  /** reports the DMC code under the pointer (or null off-grid/blank), e.g. to highlight it in the sidebar */
  onCellHover?: (code: string | null) => void
}

export function PatternCanvas({
  cols,
  rows,
  cellAssignment,
  palette,
  cellPx = 24,
  selectedCellIndex = null,
  highlightCode = null,
  onCellClick,
  onCellHover,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastHoverCodeRef = useRef<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height, rulerMargin } = computeCanvasSize(cols, rows, cellPx)
    const ctx = setupCanvasForDpr(canvas, width, height)
    renderPattern(ctx, { cols, rows, cellAssignment, palette, highlightCode }, { cellPx })

    if (selectedCellIndex !== null) {
      const row = Math.floor(selectedCellIndex / cols)
      const col = selectedCellIndex % cols
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 3
      ctx.strokeRect(rulerMargin + col * cellPx + 1.5, rulerMargin + row * cellPx + 1.5, cellPx - 3, cellPx - 3)
    }
  }, [cols, rows, cellAssignment, palette, cellPx, selectedCellIndex, highlightCode])

  function handleClick(e: MouseEvent<HTMLCanvasElement>) {
    if (!onCellClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cellIndex = cellIndexFromPoint(e.clientX - rect.left, e.clientY - rect.top, cols, rows, cellPx)
    if (cellIndex !== null) onCellClick(cellIndex)
  }

  function reportHover(code: string | null) {
    if (code === lastHoverCodeRef.current) return
    lastHoverCodeRef.current = code
    onCellHover?.(code)
  }

  function handleMouseMove(e: MouseEvent<HTMLCanvasElement>) {
    if (!onCellHover) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cellIndex = cellIndexFromPoint(e.clientX - rect.left, e.clientY - rect.top, cols, rows, cellPx)
    const code = cellIndex !== null ? cellAssignment[cellIndex] : null
    reportHover(code && code !== EMPTY_CELL ? code : null)
  }

  function handleMouseLeave() {
    reportHover(null)
  }

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-8">
      <canvas
        ref={canvasRef}
        className={`shadow-lg ${onCellClick ? 'cursor-pointer' : ''}`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  )
}
