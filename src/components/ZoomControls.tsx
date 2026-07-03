interface Props {
  cellPx: number
  defaultCellPx: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

/** Floating zoom controls for the pattern canvas viewport. */
export function ZoomControls({ cellPx, defaultCellPx, onZoomIn, onZoomOut, onReset }: Props) {
  const percent = Math.round((cellPx / defaultCellPx) * 100)

  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900/90 px-1 py-1 shadow-lg">
      <button
        type="button"
        onClick={onZoomOut}
        title="Zoom out"
        className="flex h-7 w-7 items-center justify-center rounded text-base text-neutral-200 hover:bg-neutral-800"
      >
        −
      </button>
      <button
        type="button"
        onClick={onReset}
        title="Reset zoom"
        className="w-14 rounded py-1 text-center text-xs text-neutral-400 hover:bg-neutral-800"
      >
        {percent}%
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        title="Zoom in"
        className="flex h-7 w-7 items-center justify-center rounded text-base text-neutral-200 hover:bg-neutral-800"
      >
        +
      </button>
    </div>
  )
}
