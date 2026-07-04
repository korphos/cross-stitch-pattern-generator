import { useState } from 'react'
import type { PaletteEntry, DmcColor } from '../lib/types'
import { AddColorDialog } from './AddColorDialog'

interface Props {
  palette: PaletteEntry[]
  /** show an "owned"/"buy" flag per color - only meaningful once the user has marked at least one thread as owned in Settings */
  showOwned?: boolean
  onEdit?: (code: string) => void
  /** reports the hovered entry's DMC code (or null on mouse-leave), e.g. to highlight it on the pattern canvas */
  onHoverCode?: (code: string | null) => void
  /** DMC code to visually highlight, e.g. while hovering the matching pixels on the canvas */
  highlightCode?: string | null
  /** DMC codes the user already owns, for the "Add color" picker's owned highlight/filter */
  ownedCodes?: ReadonlySet<string>
  /** adds a brand-new color to the palette with nothing stitched yet - omit to hide the "Add color" button */
  onAddColor?: (dmc: DmcColor) => void
}

export function DmcColorList({
  palette,
  showOwned = false,
  onEdit,
  onHoverCode,
  highlightCode = null,
  ownedCodes = new Set(),
  onAddColor,
}: Props) {
  const [showAddColor, setShowAddColor] = useState(false)

  return (
    <div className="flex h-full flex-col">
      {onAddColor && (
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-3 py-2">
          <h2 className="text-sm font-semibold text-neutral-100">Colors</h2>
          <button
            type="button"
            onClick={() => setShowAddColor(true)}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-100 hover:bg-neutral-700"
          >
            + Add color
          </button>
        </div>
      )}

      <ul className="flex-1 divide-y divide-neutral-800 overflow-y-auto">
        {palette.map((entry) => (
          <li
            key={entry.dmc.code}
            className={`group flex items-center gap-2 px-3 py-1.5 text-sm ${onEdit ? 'cursor-pointer hover:bg-neutral-800' : ''} ${
              entry.dmc.code === highlightCode ? 'bg-indigo-950' : ''
            }`}
            onClick={onEdit ? () => onEdit(entry.dmc.code) : undefined}
            onMouseEnter={() => onHoverCode?.(entry.dmc.code)}
            onMouseLeave={() => onHoverCode?.(null)}
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
            {entry.finishAlternative && (
              <span
                className="shrink-0 text-xs text-amber-400"
                title={`${entry.dmc.finish ? 'Standard' : 'Shiny'} alternative available: ${entry.finishAlternative.dmc.code} - ${entry.finishAlternative.dmc.name}`}
              >
                ✨
              </span>
            )}
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

      {showAddColor && onAddColor && (
        <AddColorDialog
          existingCodes={new Set(palette.map((p) => p.dmc.code))}
          ownedCodes={ownedCodes}
          onAdd={(dmc) => {
            onAddColor(dmc)
            setShowAddColor(false)
          }}
          onClose={() => setShowAddColor(false)}
        />
      )}
    </div>
  )
}
