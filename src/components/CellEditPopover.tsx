import type { PaletteEntry } from '../lib/types'

interface Props {
  cellIndex: number
  cols: number
  palette: PaletteEntry[]
  currentCode: string
  onPick: (dmcCode: string) => void
  onClose: () => void
}

/** A contextual toolbar for recoloring a single clicked cell to any existing palette color. */
export function CellEditPopover({ cellIndex, cols, palette, currentCode, onPick, onClose }: Props) {
  const row = Math.floor(cellIndex / cols)
  const col = cellIndex % cols

  return (
    <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-2 border-b border-neutral-800 bg-neutral-900/95 px-4 py-2 shadow-lg">
      <span className="text-sm text-neutral-300">
        Cell (col {col}, row {row}):
      </span>
      <div className="flex flex-wrap gap-1">
        {palette.map((entry) => (
          <button
            key={entry.dmc.code}
            type="button"
            title={`DMC ${entry.dmc.code} — ${entry.dmc.name}`}
            onClick={() => onPick(entry.dmc.code)}
            className={`flex h-7 w-7 items-center justify-center rounded-sm border font-mono text-xs ${
              entry.dmc.code === currentCode ? 'border-indigo-400 ring-2 ring-indigo-400' : 'border-black/20'
            }`}
            style={{ backgroundColor: `rgb(${entry.color.r}, ${entry.color.g}, ${entry.color.b})`, color: entry.textColor }}
          >
            {entry.symbol}
          </button>
        ))}
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
