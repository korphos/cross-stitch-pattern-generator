import type { PaletteEntry } from '../lib/types'

interface Props {
  palette: PaletteEntry[]
  onEdit?: (code: string) => void
}

export function DmcColorList({ palette, onEdit }: Props) {
  return (
    <ul className="h-full divide-y divide-neutral-800 overflow-y-auto">
      {palette.map((entry) => (
        <li
          key={entry.dmc.code}
          className={`group flex items-center gap-2 px-3 py-1.5 text-sm ${onEdit ? 'cursor-pointer hover:bg-neutral-800' : ''}`}
          onClick={onEdit ? () => onEdit(entry.dmc.code) : undefined}
        >
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
          {onEdit && (
            <span className="ml-auto shrink-0 text-xs text-neutral-500 opacity-0 group-hover:opacity-100">Edit</span>
          )}
        </li>
      ))}
    </ul>
  )
}
