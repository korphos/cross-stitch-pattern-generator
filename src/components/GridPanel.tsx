import { useCallback, useRef } from 'react'
import type { CSSProperties, Dispatch, PointerEvent as ReactPointerEvent } from 'react'
import type { PatternProject, DetectedGrid } from '../lib/types'
import type { ProjectAction } from '../lib/projectReducer'

interface Props {
  project: PatternProject
  dispatch: Dispatch<ProjectAction>
}

const MAX_DISPLAY_WIDTH = 720

type Corner = 'tl' | 'br'

export function GridPanel({ project, dispatch }: Props) {
  const grid = project.confirmedGrid!
  const imageData = project.imageData!
  const scale = Math.min(1, MAX_DISPLAY_WIDTH / imageData.width)
  const displayWidth = imageData.width * scale
  const displayHeight = imageData.height * scale

  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ corner: Corner; startGrid: DetectedGrid } | null>(null)
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const imageSizeRef = useRef({ width: imageData.width, height: imageData.height })
  imageSizeRef.current = { width: imageData.width, height: imageData.height }

  const updateGrid = useCallback((next: DetectedGrid) => dispatch({ type: 'UPDATE_GRID', grid: next }), [dispatch])

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
        // Keep the grid from being dragged past the image edge - cells
        // beyond it would sample garbage (see cellSampling.ts's clamping
        // for the rest of that defense).
        const maxWidth = imageSizeRef.current.width - start.bbox.x
        const maxHeight = imageSizeRef.current.height - start.bbox.y
        const newWidth = Math.min(maxWidth, Math.max(minX, x) - start.bbox.x)
        const newHeight = Math.min(maxHeight, Math.max(minY, y) - start.bbox.y)
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

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-8">
      <div
        ref={containerRef}
        className="relative shrink-0 touch-none select-none border border-neutral-700 bg-[repeating-conic-gradient(#3f3f46_0%_25%,#27272a_0%_50%)] bg-[length:16px_16px] shadow-lg"
        style={{ width: displayWidth, height: displayHeight }}
      >
        <img
          src={project.imageDataUrl!}
          alt="Source pattern"
          className="pointer-events-none absolute inset-0 h-full w-full"
          draggable={false}
        />
        <GridOverlay grid={grid} scale={scale} />
        <Handle style={{ left: grid.bbox.x * scale, top: grid.bbox.y * scale }} onPointerDown={startDrag('tl')} />
        <Handle
          style={{ left: (grid.bbox.x + grid.bbox.width) * scale, top: (grid.bbox.y + grid.bbox.height) * scale }}
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
      className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border-2 border-neutral-900 bg-indigo-500 shadow"
      style={style}
      onPointerDown={onPointerDown}
    />
  )
}
