import { useLayoutEffect, useRef, useState } from 'react'
import type { Dispatch } from 'react'
import type { PatternProject } from '../lib/types'
import type { ProjectAction } from '../lib/projectReducer'
import { computeCanvasSize, renderPattern, setupCanvasForDpr } from '../lib/renderPattern'
import { Legend } from './Legend'
import { FABRIC_COUNTS, computePhysicalSize, formatPhysicalSize } from '../lib/physicalSize'

interface Props {
  project: PatternProject
  dispatch: Dispatch<ProjectAction>
}

// The CSS "in" unit is defined as exactly 96px, so working in that
// reference lets us size the printable page precisely to US Letter.
const PX_PER_INCH = 96
const PAGE_WIDTH_IN = 8.5
const PAGE_HEIGHT_IN = 11
const MARGIN_IN = 0.5
const PAGE_USABLE_WIDTH_PX = (PAGE_WIDTH_IN - 2 * MARGIN_IN) * PX_PER_INCH
const PAGE_USABLE_HEIGHT_PX = (PAGE_HEIGHT_IN - 2 * MARGIN_IN) * PX_PER_INCH

export function PrintView({ project, dispatch }: Props) {
  const grid = project.confirmedGrid!
  const palette = project.palette!
  const cellAssignment = project.cellAssignment!
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ scale: 1, naturalHeight: 0 })

  // Cell size fits the page width; height is handled below by measuring
  // the whole block (title + grid + legend) and scaling it down as a
  // unit if it's taller than one page, since legend height depends on
  // how many colors there are and how DMC names wrap.
  const cellPx = Math.max(2, Math.min(30, Math.floor(PAGE_USABLE_WIDTH_PX / grid.cols)))

  const size = computePhysicalSize(grid.cols, grid.rows, project.fabricCount)
  const fabricLabel = FABRIC_COUNTS.find((f) => f.stitchesPerInch === project.fabricCount)?.label

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const content = contentRef.current
    if (!canvas || !content) return
    const { width, height } = computeCanvasSize(grid.cols, grid.rows, cellPx)
    const ctx = setupCanvasForDpr(canvas, width, height)
    renderPattern(ctx, { cols: grid.cols, rows: grid.rows, cellAssignment, palette }, { cellPx })

    // `transform: scale` doesn't affect layout metrics, so this reads the
    // block's natural (unscaled) height regardless of the previous scale.
    const naturalHeight = content.scrollHeight
    setFit({ naturalHeight, scale: Math.min(1, PAGE_USABLE_HEIGHT_PX / naturalHeight) })
  }, [grid.cols, grid.rows, cellAssignment, palette, cellPx])

  return (
    <div className="mx-auto max-w-4xl">
      <div className="screen-only mb-6 flex flex-wrap items-end justify-between gap-4 rounded-md border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Fabric count
          <select
            value={project.fabricCount}
            onChange={(e) => dispatch({ type: 'SET_FABRIC_COUNT', stitchesPerInch: Number(e.target.value) })}
            className="rounded-md border border-gray-300 px-2 py-1"
          >
            {FABRIC_COUNTS.map((fc) => (
              <option key={fc.stitchesPerInch} value={fc.stitchesPerInch}>
                {fc.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-gray-700">
          This cross-stitch will measure approximately <strong>{formatPhysicalSize(size)}</strong>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => dispatch({ type: 'GO_TO_STEP', step: 'palette' })}
          >
            Back
          </button>
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div
        className="print-page mx-auto overflow-hidden border border-gray-200 bg-white p-[0.5in] shadow print:border-0 print:p-0 print:shadow-none"
        style={{ width: `${PAGE_WIDTH_IN}in`, height: fit.naturalHeight ? `${fit.naturalHeight * fit.scale}px` : undefined }}
      >
        <div
          ref={contentRef}
          className="mx-auto flex flex-col items-center gap-4"
          style={{ width: PAGE_USABLE_WIDTH_PX, transform: `scale(${fit.scale})`, transformOrigin: 'top center' }}
        >
          <div className="w-full text-center text-sm text-gray-600">
            {grid.cols}×{grid.rows} stitches — {formatPhysicalSize(size)} on {fabricLabel}
          </div>
          <canvas ref={canvasRef} />
          <Legend palette={palette} cols={grid.cols} rows={grid.rows} className="w-full" />
        </div>
      </div>
    </div>
  )
}
