import type { PaletteEntry } from '../lib/types'

interface Props {
  palette: PaletteEntry[]
  /** show an "owned"/"buy" flag per color - only meaningful once the user has marked at least one thread as owned in Settings */
  showOwned?: boolean
  onEdit?: (code: string) => void
}

export function DmcColorList({ palette, showOwned = false, onEdit }: Props) {
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
          <span className="flex-1 truncate text-neutral-300">
            {entry.dmc.code} - {entry.dmc.name}
          </span>
          {showOwned && !entry.owned && (
            <span className="shrink-0 rounded bg-amber-950 px-1.5 py-0.5 text-xs text-amber-400" title="Not in your thread inventory">
              buy
            </span>
          )}
          {onEdit && (
            <span className="ml-1 shrink-0 text-xs text-neutral-500 opacity-0 group-hover:opacity-100">Edit</span>
          )}
        </li>
      ))}
    </ul>
  )
}
