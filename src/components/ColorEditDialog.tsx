import { useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import type { PaletteEntry, DmcColor } from '../lib/types'
import { sortedBySimilarity } from '../lib/colorMatch'

interface Props {
  entry: PaletteEntry
  otherEntries: PaletteEntry[]
  onMergeInto: (toCode: string) => void
  onRecolor: (newDmc: DmcColor) => void
  onClose: () => void
}

/** Modal for editing one palette color: merge it into another color already in the pattern, or recolor it to any DMC thread (sorted by similarity). */
export function ColorEditDialog({ entry, otherEntries, onMergeInto, onRecolor, onClose }: Props) {
  const [search, setSearch] = useState('')

  const candidates = useMemo(() => {
    const sorted = sortedBySimilarity(entry.color)
    const q = search.trim().toLowerCase()
    const filtered = q ? sorted.filter((d) => d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q)) : sorted
    return filtered.slice(0, 40)
  }, [entry.color, search])

  function stop(e: MouseEvent) {
    e.stopPropagation()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 p-5"
        onClick={stop}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-black/20 font-mono text-sm"
            style={{ backgroundColor: `rgb(${entry.color.r}, ${entry.color.g}, ${entry.color.b})`, color: entry.textColor }}
          >
            {entry.symbol}
          </span>
          <h3 className="text-base font-semibold text-neutral-100">
            DMC {entry.dmc.code} — {entry.dmc.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            Close
          </button>
        </div>

        {otherEntries.length > 0 && (
          <div>
            <h4 className="mb-1 text-sm font-medium text-neutral-200">Replace with another color already in this pattern</h4>
            <p className="mb-2 text-xs text-neutral-500">
              Every "{entry.symbol}" stitch becomes this color, and "{entry.symbol}" disappears from the palette.
            </p>
            <div className="flex flex-wrap gap-2">
              {otherEntries.map((other) => (
                <button
                  key={other.dmc.code}
                  type="button"
                  onClick={() => onMergeInto(other.dmc.code)}
                  className="flex items-center gap-2 rounded-md border border-neutral-700 px-2 py-1 text-sm text-neutral-200 hover:bg-neutral-800"
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-sm border border-black/20 font-mono text-[11px]"
                    style={{ backgroundColor: `rgb(${other.color.r}, ${other.color.g}, ${other.color.b})`, color: other.textColor }}
                  >
                    {other.symbol}
                  </span>
                  {other.dmc.code}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <h4 className="mb-2 text-sm font-medium text-neutral-200">Change to a different DMC thread</h4>
          <input
            type="text"
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 rounded-md border border-neutral-600 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
          />
          <ul className="flex-1 divide-y divide-neutral-800 overflow-y-auto rounded-md border border-neutral-800">
            {candidates.map((d) => (
              <li key={d.code}>
                <button
                  type="button"
                  onClick={() => onRecolor(d)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-neutral-200 hover:bg-neutral-800"
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded-sm border border-black/20"
                    style={{ backgroundColor: `rgb(${d.r}, ${d.g}, ${d.b})` }}
                  />
                  <span className="truncate">
                    {d.code} — {d.name}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-neutral-500">ΔE {d.deltaE.toFixed(1)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
