import { useCallback, useRef } from 'react'
import type { CSSProperties, Dispatch, PointerEvent as ReactPointerEvent } from 'react'
import type { PatternProject, DetectedGrid } from '../lib/types'
import type { ProjectAction } from '../lib/projectReducer'
import { detectGrid } from '../lib/gridDetection'

interface Props {
  project: PatternProject
  dispatch: Dispatch<ProjectAction>
}

const MAX_DISPLAY_WIDTH = 640

type Corner = 'tl' | 'br'

export function GridAdjustStep({ project, dispatch }: Props) {
  const grid = project.confirmedGrid!
  const imageData = project.imageData!
  const scale = Math.min(1, MAX_DISPLAY_WIDTH / imageData.width)
  const displayWidth = imageData.width * scale
  const displayHeight = imageData.height * scale

  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ corner: Corner; startGrid: DetectedGrid } | null>(null)
  const scaleRef = useRef(scale)
  scaleRef.current = scale

  const updateGrid = useCallback(
    (next: DetectedGrid) => dispatch({ type: 'UPDATE_GRID', grid: next }),
    [dispatch],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current
      const container = containerRef.current
      if (!drag || !container) return
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / scaleRef.current
      const y = (e.clientY - rect.top) / scaleRef.current
      const start = drag.startGrid

      if (drag.corner === 'tl') {
        const maxX = start.bbox.x + start.bbox.width - start.cellWidth
        const maxY = start.bbox.y + start.bbox.height - start.cellHeight
        const newX = Math.max(0, Math.min(x, maxX))
        const newY = Math.max(0, Math.min(y, maxY))
        const newWidth = start.bbox.x + start.bbox.width - newX
        const newHeight = start.bbox.y + start.bbox.height - newY
        updateGrid({
          ...start,
          bbox: { x: newX, y: newY, width: newWidth, height: newHeight },
          cellWidth: newWidth / start.cols,
          cellHeight: newHeight / start.rows,
        })
      } else {
        const minX = start.bbox.x + start.cellWidth
        const minY = start.bbox.y + start.cellHeight
        const newWidth = Math.max(minX, x) - start.bbox.x
        const newHeight = Math.max(minY, y) - start.bbox.y
        updateGrid({
          ...start,
          bbox: { ...start.bbox, width: newWidth, height: newHeight },
          cellWidth: newWidth / start.cols,
          cellHeight: newHeight / start.rows,
        })
      }
    },
    [updateGrid],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerMove])

  const startDrag = useCallback(
    (corner: Corner) => (e: ReactPointerEvent) => {
      e.preventDefault()
      dragRef.current = { corner, startGrid: grid }
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    },
    [grid, handlePointerMove, handlePointerUp],
  )

  function setField(
    patch: Partial<{ offsetX: number; offsetY: number; cellWidth: number; cellHeight: number; cols: number; rows: number }>,
  ) {
    const offsetX = patch.offsetX ?? grid.bbox.x
    const offsetY = patch.offsetY ?? grid.bbox.y
    const cellWidth = patch.cellWidth ?? grid.cellWidth
    const cellHeight = patch.cellHeight ?? grid.cellHeight
    const cols = patch.cols ?? grid.cols
    const rows = patch.rows ?? grid.rows
    if (cellWidth <= 0 || cellHeight <= 0 || cols <= 0 || rows <= 0) return
    updateGrid({
      bbox: { x: offsetX, y: offsetY, width: cols * cellWidth, height: rows * cellHeight },
      cellWidth,
      cellHeight,
      cols,
      rows,
      confidence: grid.confidence,
    })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="mb-1 text-lg font-medium text-gray-900">Check the detected grid</h2>
      <p className="mb-4 text-sm text-gray-500">
        Adjust the offset and cell size if needed, by dragging the handles or using the fields on the right.
      </p>
      <div className="flex flex-col gap-6 md:flex-row">
        <div
          ref={containerRef}
          className="relative shrink-0 touch-none select-none border border-gray-300 bg-[repeating-conic-gradient(#e5e7eb_0%_25%,white_0%_50%)] bg-[length:16px_16px]"
          style={{ width: displayWidth, height: displayHeight }}
        >
          <img
            src={project.imageDataUrl!}
            alt="Source pattern"
            className="pointer-events-none absolute inset-0 h-full w-full"
            draggable={false}
          />
          <GridOverlay grid={grid} scale={scale} />
          <Handle
            style={{ left: grid.bbox.x * scale, top: grid.bbox.y * scale }}
            onPointerDown={startDrag('tl')}
          />
          <Handle
            style={{ left: (grid.bbox.x + grid.bbox.width) * scale, top: (grid.bbox.y + grid.bbox.height) * scale }}
            onPointerDown={startDrag('br')}
          />
        </div>

        <div className="flex w-64 shrink-0 flex-col gap-3">
          <NumberField label="Offset X (px)" value={grid.bbox.x} onChange={(v) => setField({ offsetX: v })} />
          <NumberField label="Offset Y (px)" value={grid.bbox.y} onChange={(v) => setField({ offsetY: v })} />
          <NumberField
            label="Cell width (px)"
            value={grid.cellWidth}
            step={0.1}
            onChange={(v) => setField({ cellWidth: v })}
          />
          <NumberField
            label="Cell height (px)"
            value={grid.cellHeight}
            step={0.1}
            onChange={(v) => setField({ cellHeight: v })}
          />
          <NumberField label="Columns" value={grid.cols} onChange={(v) => setField({ cols: Math.round(v) })} />
          <NumberField label="Rows" value={grid.rows} onChange={(v) => setField({ rows: Math.round(v) })} />

          <p className="text-xs text-gray-500">
            Automatic detection confidence: {Math.round(grid.confidence * 100)}%
          </p>

          <button
            type="button"
            className="mt-2 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => updateGrid(detectGrid(imageData))}
          >
            Re-detect automatically
          </button>
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            onClick={() => dispatch({ type: 'CONFIRM_GRID' })}
          >
            Confirm grid
          </button>
        </div>
      </div>
    </div>
  )
}

function GridOverlay({ grid, scale }: { grid: DetectedGrid; scale: number }) {
  const lines = []
  for (let c = 0; c <= grid.cols; c++) {
    lines.push(
      <div
        key={`v${c}`}
        className="absolute w-px bg-red-500/70"
        style={{
          left: (grid.bbox.x + c * grid.cellWidth) * scale,
          top: grid.bbox.y * scale,
          height: grid.bbox.height * scale,
        }}
      />,
    )
  }
  for (let r = 0; r <= grid.rows; r++) {
    lines.push(
      <div
        key={`h${r}`}
        className="absolute h-px bg-red-500/70"
        style={{
          top: (grid.bbox.y + r * grid.cellHeight) * scale,
          left: grid.bbox.x * scale,
          width: grid.bbox.width * scale,
        }}
      />,
    )
  }
  return <>{lines}</>
}

function Handle({ style, onPointerDown }: { style: CSSProperties; onPointerDown: (e: ReactPointerEvent) => void }) {
  return (
    <div
      className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border-2 border-white bg-indigo-600 shadow"
      style={style}
      onPointerDown={onPointerDown}
    />
  )
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {label}
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-gray-300 px-2 py-1"
      />
    </label>
  )
}
