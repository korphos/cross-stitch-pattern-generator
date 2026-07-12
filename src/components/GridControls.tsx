import type { Dispatch } from 'react'
import type { PatternProject } from '../lib/types'
import type { ProjectAction } from '../lib/projectReducer'
import { detectGrid } from '../lib/gridDetection'
import { confirmDestructiveEdit } from '../lib/confirmDestructive'

interface Props {
  project: PatternProject
  dispatch: Dispatch<ProjectAction>
  onFlipHorizontal: () => void
}

export function GridControls({ project, dispatch, onFlipHorizontal }: Props) {
  const grid = project.confirmedGrid!
  const imageData = project.imageData!

  function updateGrid(next: typeof grid) {
    if (!confirmDestructiveEdit(project.history.past.length)) return
    dispatch({ type: 'UPDATE_GRID', grid: next })
  }

  function setField(patch: Partial<{ offsetX: number; offsetY: number; cellSize: number; cols: number; rows: number }>) {
    const offsetX = patch.offsetX ?? grid.bbox.x
    const offsetY = patch.offsetY ?? grid.bbox.y
    const cellSize = patch.cellSize ?? grid.cellSize
    const cols = patch.cols ?? grid.cols
    const rows = patch.rows ?? grid.rows
    if (![offsetX, offsetY, cellSize, cols, rows].every(Number.isFinite)) return
    if (cellSize <= 0 || cols <= 0 || rows <= 0) return

    // Keep the grid fully inside the source image - an offset or cell size
    // that pushes it past the edge would sample garbage for the cells that
    // fall outside the image (see cellSampling.ts's clamping for the rest
    // of that defense).
    const width = cols * cellSize
    const height = rows * cellSize
    const x = Math.min(Math.max(0, offsetX), Math.max(0, imageData.width - width))
    const y = Math.min(Math.max(0, offsetY), Math.max(0, imageData.height - height))

    updateGrid({
      bbox: { x, y, width, height },
      cellSize,
      cols,
      rows,
      confidence: grid.confidence,
    })
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <h2 className="text-sm font-semibold text-neutral-100">Grid</h2>
      <p className="text-xs text-neutral-400">
        Adjust the offset and cell size if needed: drag a corner handle to resize (stitches stay square), drag
        anywhere else on the image to move the whole grid, or use the fields below.
      </p>

      <NumberField label="Offset X (px)" value={grid.bbox.x} onChange={(v) => setField({ offsetX: v })} />
      <NumberField label="Offset Y (px)" value={grid.bbox.y} onChange={(v) => setField({ offsetY: v })} />
      <NumberField
        label="Cell size (px)"
        value={grid.cellSize}
        step={0.1}
        onChange={(v) => setField({ cellSize: v })}
      />
      <NumberField label="Columns" value={grid.cols} onChange={(v) => setField({ cols: Math.round(v) })} />
      <NumberField label="Rows" value={grid.rows} onChange={(v) => setField({ rows: Math.round(v) })} />

      <p className="text-xs text-neutral-500">Automatic detection confidence: {Math.round(grid.confidence * 100)}%</p>

      <button
        type="button"
        className="mt-2 rounded-md border border-neutral-600 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
        onClick={() => updateGrid(detectGrid(imageData))}
      >
        Re-detect automatically
      </button>

      <button
        type="button"
        className="rounded-md border border-neutral-600 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
        onClick={onFlipHorizontal}
      >
        Flip horizontally
      </button>
    </div>
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
    <label className="flex flex-col gap-1 text-sm text-neutral-300">
      {label}
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-100"
      />
    </label>
  )
}
