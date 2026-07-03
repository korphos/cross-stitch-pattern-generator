import type { PaletteEntry } from '../lib/types'

interface Props {
  palette: PaletteEntry[]
}

export function DmcColorList({ palette }: Props) {
  return (
    <ul className="h-full divide-y divide-neutral-800 overflow-y-auto">
      {palette.map((entry) => (
        <li key={entry.dmc.code} className="flex items-center gap-2 px-3 py-1.5 text-sm">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-black/20 font-mono text-[11px]"
            style={{
              backgroundColor: `rgb(${entry.color.r}, ${entry.color.g}, ${entry.color.b})`,
              color: entry.textColor,
            }}
          >
            {entry.symbol}
          </span>
          <span className="truncate text-neutral-300">
            {entry.dmc.code} — {entry.dmc.name}
          </span>
        </li>
      ))}
    </ul>
  )
}
