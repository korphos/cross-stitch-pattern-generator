import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import type { PaletteEntry } from '../lib/types'
import { cellIndexFromPoint, computeCanvasSize, renderPattern, setupCanvasForDpr } from '../lib/renderPattern'

interface Props {
  cols: number
  rows: number
  cellAssignment: string[]
  palette: PaletteEntry[]
  cellPx?: number
  /** row*cols+col of a cell to outline (e.g. one currently being recolored) */
  selectedCellIndex?: number | null
  onCellClick?: (cellIndex: number) => void
}

export function PatternCanvas({
  cols,
  rows,
  cellAssignment,
  palette,
  cellPx = 24,
  selectedCellIndex = null,
  onCellClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height, rulerMargin } = computeCanvasSize(cols, rows, cellPx)
    const ctx = setupCanvasForDpr(canvas, width, height)
    renderPattern(ctx, { cols, rows, cellAssignment, palette }, { cellPx })

    if (selectedCellIndex !== null) {
      const row = Math.floor(selectedCellIndex / cols)
      const col = selectedCellIndex % cols
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 3
      ctx.strokeRect(rulerMargin + col * cellPx + 1.5, rulerMargin + row * cellPx + 1.5, cellPx - 3, cellPx - 3)
    }
  }, [cols, rows, cellAssignment, palette, cellPx, selectedCellIndex])

  function handleClick(e: MouseEvent<HTMLCanvasElement>) {
    if (!onCellClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cellIndex = cellIndexFromPoint(e.clientX - rect.left, e.clientY - rect.top, cols, rows, cellPx)
    if (cellIndex !== null) onCellClick(cellIndex)
  }

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-8">
      <canvas ref={canvasRef} className={`shadow-lg ${onCellClick ? 'cursor-pointer' : ''}`} onClick={handleClick} />
    </div>
  )
}
