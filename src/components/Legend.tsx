import type { PaletteEntry } from '../lib/types'

interface Props {
  palette: PaletteEntry[]
  cols: number
  rows: number
  className?: string
}

export function Legend({ palette, cols, rows, className }: Props) {
  return (
    <div className={className}>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">
        DMC Palette — {palette.length} colors | {cols}×{rows} stitches
      </h3>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {palette.map((entry) => (
          <li key={entry.dmc.code} className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-black/20 font-mono text-[11px]"
              style={{
                backgroundColor: `rgb(${entry.color.r}, ${entry.color.g}, ${entry.color.b})`,
                color: entry.textColor,
              }}
            >
              {entry.symbol}
            </span>
            <span className="text-gray-800">
              DMC {entry.dmc.code} — {entry.dmc.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
