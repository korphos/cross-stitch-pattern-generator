import { useMemo } from 'react'
import type { PaletteEntry } from '../lib/types'
import { estimateThreadUsage } from '../lib/threadEstimate'

interface Props {
  palette: PaletteEntry[]
  stitchesPerInch: number
  strands: number
  onEdit?: (code: string) => void
}

export function DmcColorList({ palette, stitchesPerInch, strands, onEdit }: Props) {
  const skeinsByCode = useMemo(() => {
    const estimates = estimateThreadUsage(palette, stitchesPerInch, strands)
    return new Map(estimates.map((e) => [e.code, e.skeins]))
  }, [palette, stitchesPerInch, strands])

  return (
    <ul className="h-full divide-y divide-neutral-800 overflow-y-auto">
      {palette.map((entry) => {
        const skeins = skeinsByCode.get(entry.dmc.code) ?? 0
        return (
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
              {entry.dmc.code} — {entry.dmc.name}
            </span>
            {skeins > 0 && (
              <span className="shrink-0 text-xs text-neutral-500" title="Estimated skeins needed">
                {skeins} skein{skeins > 1 ? 's' : ''}
              </span>
            )}
            {onEdit && (
              <span className="ml-1 shrink-0 text-xs text-neutral-500 opacity-0 group-hover:opacity-100">Edit</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
