import { useCallback, useRef, useState } from 'react'
import type { CSSProperties, Dispatch, PointerEvent as ReactPointerEvent } from 'react'
import type { PatternProject, DetectedGrid } from '../lib/types'
import type { ProjectAction } from '../lib/projectReducer'
import { confirmDestructiveEdit } from '../lib/confirmDestructive'

interface Props {
  project: PatternProject
  dispatch: Dispatch<ProjectAction>
}

const MAX_DISPLAY_WIDTH = 720

type DragMode = 'tl' | 'br' | 'move'

export function GridPanel({ project, dispatch }: Props) {
  const grid = project.confirmedGrid!
  const imageData = project.imageData!
  const scale = Math.min(1, MAX_DISPLAY_WIDTH / imageData.width)
  const displayWidth = imageData.width * scale
  const displayHeight = imageData.height * scale

  // While dragging, the grid overlay/handles follow the cursor from local state alone - the
  // expensive part (re-sampling every cell's color and rebuilding the palette, in UPDATE_GRID)
  // only happens once, on pointerup, instead of on every pointermove tick (which was laggy).
  const [previewGrid, setPreviewGrid] = useState<DetectedGrid | null>(null)
  const displayGrid = previewGrid ?? grid
  const latestGridRef = useRef<DetectedGrid | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ mode: DragMode; startGrid: DetectedGrid; startX: number; startY: number } | null>(null)
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const imageSizeRef = useRef({ width: imageData.width, height: imageData.height })
  imageSizeRef.current = { width: imageData.width, height: imageData.height }
  // Read via a ref (not closed over directly): `updateGrid` is created once and reused across
  // every drag gesture, so it must see the live count at pointerup time, not the one from
  // whenever this render happened to run.
  const unsavedEditCountRef = useRef(project.history.past.length)
  unsavedEditCountRef.current = project.history.past.length

  const updateGrid = useCallback(
    (next: DetectedGrid) => {
      if (!confirmDestructiveEdit(unsavedEditCountRef.current)) return
      dispatch({ type: 'UPDATE_GRID', grid: next })
    },
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
      const { width: imgW, height: imgH } = imageSizeRef.current

      let next: DetectedGrid
      if (drag.mode === 'move') {
        const dx = x - drag.startX
        const dy = y - drag.startY
        const newX = Math.max(0, Math.min(start.bbox.x + dx, imgW - start.bbox.width))
        const newY = Math.max(0, Math.min(start.bbox.y + dy, imgH - start.bbox.height))
        next = { ...start, bbox: { ...start.bbox, x: newX, y: newY } }
      } else if (drag.mode === 'tl') {
        // Resize handles: stitches must stay square, so a single cellSize is derived from
        // both axes of the drag (averaged) rather than letting width/height scale independently.
        const brX = start.bbox.x + start.bbox.width
        const brY = start.bbox.y + start.bbox.height
        const newX = Math.max(0, Math.min(x, brX - start.cellSize))
        const newY = Math.max(0, Math.min(y, brY - start.cellSize))
        const desiredWidth = brX - newX
        const desiredHeight = brY - newY
        const maxCellSize = Math.min(brX / start.cols, brY / start.rows)
        const cellSize = Math.min((desiredWidth / start.cols + desiredHeight / start.rows) / 2, maxCellSize)
        const width = start.cols * cellSize
        const height = start.rows * cellSize
        next = { ...start, bbox: { x: brX - width, y: brY - height, width, height }, cellSize }
      } else {
        // Keep the grid from being dragged past the image edge - cells
        // beyond it would sample garbage (see cellSampling.ts's clamping
        // for the rest of that defense).
        const maxWidth = imgW - start.bbox.x
        const maxHeight = imgH - start.bbox.y
        const desiredWidth = Math.max(start.cellSize, x - start.bbox.x)
        const desiredHeight = Math.max(start.cellSize, y - start.bbox.y)
        const maxCellSize = Math.min(maxWidth / start.cols, maxHeight / start.rows)
        const cellSize = Math.min((desiredWidth / start.cols + desiredHeight / start.rows) / 2, maxCellSize)
        const width = start.cols * cellSize
        const height = start.rows * cellSize
        next = { ...start, bbox: { ...start.bbox, width, height }, cellSize }
      }
      latestGridRef.current = next
      setPreviewGrid(next)
    },
    [],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    const finalGrid = latestGridRef.current
    latestGridRef.current = null
    setPreviewGrid(null)
    if (finalGrid) updateGrid(finalGrid)
  }, [handlePointerMove, updateGrid])

  const startDrag = useCallback(
    (mode: DragMode) => (e: ReactPointerEvent) => {
      e.preventDefault()
      // Handles are nested inside the move-draggable container - stop the move drag from
      // also starting underneath a resize drag.
      e.stopPropagation()
      const container = containerRef.current
      const rect = container?.getBoundingClientRect()
      const x = rect ? (e.clientX - rect.left) / scaleRef.current : 0
      const y = rect ? (e.clientY - rect.top) / scaleRef.current : 0
      dragRef.current = { mode, startGrid: grid, startX: x, startY: y }
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    },
    [grid, handlePointerMove, handlePointerUp],
  )

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-8">
      <div
        ref={containerRef}
        className="relative shrink-0 cursor-grab touch-none select-none border border-neutral-700 bg-[repeating-conic-gradient(#3f3f46_0%_25%,#27272a_0%_50%)] bg-size-[16px_16px] shadow-lg active:cursor-grabbing"
        style={{ width: displayWidth, height: displayHeight }}
        onPointerDown={startDrag('move')}
      >
        <img
          src={project.imageDataUrl!}
          alt="Source pattern"
          className="pointer-events-none absolute inset-0 h-full w-full"
          draggable={false}
        />
        <GridOverlay grid={displayGrid} scale={scale} />
        <SamplePointsOverlay grid={displayGrid} scale={scale} />
        <Handle
          style={{ left: displayGrid.bbox.x * scale, top: displayGrid.bbox.y * scale }}
          onPointerDown={startDrag('tl')}
        />
        <Handle
          style={{
            left: (displayGrid.bbox.x + displayGrid.bbox.width) * scale,
            top: (displayGrid.bbox.y + displayGrid.bbox.height) * scale,
          }}
          onPointerDown={startDrag('br')}
        />
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
          left: (grid.bbox.x + c * grid.cellSize) * scale,
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
          top: (grid.bbox.y + r * grid.cellSize) * scale,
          left: grid.bbox.x * scale,
          width: grid.bbox.width * scale,
        }}
      />,
    )
  }
  return <>{lines}</>
}

/**
 * One small crosshair per cell showing exactly where its color is actually sampled from (see
 * DetectedGrid.sampleOffsetX/Y) - a filled dot reads as a fuzzy blob with no clear "this exact
 * point", whereas two thin lines crossing have an unambiguous center. A single tiled SVG
 * background instead of one DOM node per cell, so it stays cheap even on a large grid.
 */
function SamplePointsOverlay({ grid, scale }: { grid: DetectedGrid; scale: number }) {
  const cellPx = grid.cellSize * scale
  const offsetXPx = (grid.sampleOffsetX ?? 0) * scale
  const offsetYPx = (grid.sampleOffsetY ?? 0) * scale
  const half = cellPx / 2
  const arm = Math.min(cellPx * 0.28, 5)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cellPx}" height="${cellPx}">` +
    `<line x1="${half - arm}" y1="${half}" x2="${half + arm}" y2="${half}" stroke="#ec4899" stroke-width="1" />` +
    `<line x1="${half}" y1="${half - arm}" x2="${half}" y2="${half + arm}" stroke="#ec4899" stroke-width="1" />` +
    `</svg>`
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: grid.bbox.x * scale,
        top: grid.bbox.y * scale,
        width: grid.bbox.width * scale,
        height: grid.bbox.height * scale,
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundSize: `${cellPx}px ${cellPx}px`,
        // The SVG tile already draws its crosshair at its own center, so the tile grid lands
        // each mark at its cell's center with no offset - only the extra sampleOffsetX/Y shift
        // needs to be added here (not another +cellPx/2, which would shift the whole tile grid
        // by half a cell and misalign every mark from its square).
        backgroundPosition: `${offsetXPx}px ${offsetYPx}px`,
      }}
    />
  )
}

function Handle({ style, onPointerDown }: { style: CSSProperties; onPointerDown: (e: ReactPointerEvent) => void }) {
  return (
    <div
      className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize rounded-full border-2 border-neutral-900 bg-indigo-500 shadow"
      style={style}
      onPointerDown={onPointerDown}
    />
  )
}
