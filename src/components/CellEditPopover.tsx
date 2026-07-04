import type { PaletteEntry } from '../lib/types'
import { EMPTY_CELL } from '../lib/types'

interface Props {
  /** row*cols+col of every selected cell (non-empty) */
  cellIndices: number[]
  cols: number
  palette: PaletteEntry[]
  /** the DMC code shared by every selected cell, or null when the selection has mixed colors */
  currentCode: string | null
  onPick: (dmcCode: string) => void
  onClose: () => void
}

/** A contextual toolbar for recoloring one or more selected cells to any existing palette color (Ctrl/Cmd+click a cell to add it to the selection). */
export function CellEditPopover({ cellIndices, cols, palette, currentCode, onPick, onClose }: Props) {
  const label =
    cellIndices.length === 1
      ? `Cell (col ${cellIndices[0] % cols}, row ${Math.floor(cellIndices[0] / cols)}):`
      : `${cellIndices.length} cells selected:`

  return (
    <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-2 border-b border-neutral-800 bg-neutral-900/95 px-4 py-2 shadow-lg">
      <span className="text-sm text-neutral-300">{label}</span>
      <div className="flex flex-wrap gap-1">
        {palette.map((entry) => (
          <button
            key={entry.dmc.code}
            type="button"
            title={`DMC ${entry.dmc.code} - ${entry.dmc.name}`}
            onClick={() => onPick(entry.dmc.code)}
            className={`flex h-7 w-7 items-center justify-center rounded-sm border font-mono text-xs ${
              entry.dmc.code === currentCode ? 'border-indigo-400 ring-2 ring-indigo-400' : 'border-black/20'
            }`}
            style={{ backgroundColor: `rgb(${entry.color.r}, ${entry.color.g}, ${entry.color.b})`, color: entry.textColor }}
          >
            {entry.symbol}
          </button>
        ))}
        <button
          type="button"
          title="No stitch (blank)"
          onClick={() => onPick(EMPTY_CELL)}
          className={`flex h-7 w-7 items-center justify-center rounded-sm border bg-white text-xs text-neutral-400 ${
            currentCode === EMPTY_CELL ? 'border-indigo-400 ring-2 ring-indigo-400' : 'border-black/20'
          }`}
        >
          ×
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="ml-auto rounded-md px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
      >
        Done
      </button>
    </div>
  )
}
