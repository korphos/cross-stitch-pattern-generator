import { useLayoutEffect, useRef, useState } from 'react'
import type { PatternProject } from '../lib/types'
import { computeCanvasSize, renderPattern, setupCanvasForDpr } from '../lib/renderPattern'
import { Legend } from './Legend'
import { FABRIC_COUNTS, computePhysicalSize, formatPhysicalSize } from '../lib/physicalSize'
import { estimateThreadUsage } from '../lib/threadEstimate'

interface Props {
  project: PatternProject
}

// The CSS "in" unit is defined as exactly 96px, so working in that
// reference lets us size the printable page precisely to US Letter.
const PX_PER_INCH = 96
const PAGE_WIDTH_IN = 8.5
const PAGE_HEIGHT_IN = 11
const MARGIN_IN = 0.5
const PAGE_USABLE_WIDTH_PX = (PAGE_WIDTH_IN - 2 * MARGIN_IN) * PX_PER_INCH
const PAGE_USABLE_HEIGHT_PX = (PAGE_HEIGHT_IN - 2 * MARGIN_IN) * PX_PER_INCH

/**
 * Always mounted (so the browser's native print dialog / Ctrl+P works from
 * anywhere in the app), but invisible on screen - only shown via the
 * `.print-only` / `@media print` rules in index.css. There's no in-app
 * "print preview" screen: the OS print dialog already provides one.
 */
export function PrintablePage({ project }: Props) {
  const grid = project.confirmedGrid
  const palette = project.palette
  const cellAssignment = project.cellAssignment
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ scale: 1, naturalHeight: 0 })

  const cellPx = grid ? Math.max(2, Math.min(30, Math.floor(PAGE_USABLE_WIDTH_PX / grid.cols))) : 0
  const size = grid ? computePhysicalSize(grid.cols, grid.rows, project.fabricCount) : null
  const fabricLabel = FABRIC_COUNTS.find((f) => f.stitchesPerInch === project.fabricCount)?.label
  const threadEstimates = palette ? estimateThreadUsage(palette, project.fabricCount, project.strands) : []
  const skeinsByCode = new Map(threadEstimates.map((e) => [e.code, e.skeins]))
  const totalSkeins = threadEstimates.reduce((sum, e) => sum + e.skeins, 0)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const content = contentRef.current
    if (!canvas || !content || !grid || !palette || !cellAssignment) return
    const { width, height } = computeCanvasSize(grid.cols, grid.rows, cellPx)
    const ctx = setupCanvasForDpr(canvas, width, height)
    renderPattern(ctx, { cols: grid.cols, rows: grid.rows, cellAssignment, palette }, { cellPx })

    // `transform: scale` doesn't affect layout metrics, so this reads the
    // block's natural (unscaled) height regardless of the previous scale.
    const naturalHeight = content.scrollHeight
    setFit({ naturalHeight, scale: Math.min(1, PAGE_USABLE_HEIGHT_PX / naturalHeight) })
  }, [grid, cellAssignment, palette, cellPx])

  if (!grid || !palette || !cellAssignment || !size) return null

  return (
    <div className="print-only">
      <div
        className="mx-auto overflow-hidden bg-white"
        style={{
          // `@page { margin: 0.5in }` already insets the printable area,
          // so this box must match that *usable* size, not the raw paper
          // size - sizing it to the full 8.5in would overflow past the
          // printable area on the right/bottom.
          width: PAGE_USABLE_WIDTH_PX,
          height: fit.naturalHeight ? `${fit.naturalHeight * fit.scale}px` : undefined,
        }}
      >
        <div
          ref={contentRef}
          className="mx-auto flex flex-col items-center gap-4"
          style={{ width: PAGE_USABLE_WIDTH_PX, transform: `scale(${fit.scale})`, transformOrigin: 'top center' }}
        >
          <div className="w-full text-center text-sm text-gray-600">
            {grid.cols}×{grid.rows} stitches — {formatPhysicalSize(size)} on {fabricLabel} — ~{totalSkeins} skein
            {totalSkeins > 1 ? 's' : ''} total ({project.strands} strand{project.strands > 1 ? 's' : ''})
          </div>
          <canvas ref={canvasRef} />
          <Legend palette={palette} cols={grid.cols} rows={grid.rows} className="w-full" skeinsByCode={skeinsByCode} />
        </div>
      </div>
    </div>
  )
}
