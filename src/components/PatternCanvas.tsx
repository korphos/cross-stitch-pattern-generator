import { useEffect, useRef } from 'react'
import type { PaletteEntry } from '../lib/types'
import { computeCanvasSize, renderPattern, setupCanvasForDpr } from '../lib/renderPattern'

interface Props {
  cols: number
  rows: number
  cellAssignment: number[]
  palette: PaletteEntry[]
  cellPx?: number
}

export function PatternCanvas({ cols, rows, cellAssignment, palette, cellPx = 24 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height } = computeCanvasSize(cols, rows, cellPx)
    const ctx = setupCanvasForDpr(canvas, width, height)
    renderPattern(ctx, { cols, rows, cellAssignment, palette }, { cellPx })
  }, [cols, rows, cellAssignment, palette, cellPx])

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-8">
      <canvas ref={canvasRef} className="shadow-lg" />
    </div>
  )
}
