import { useMemo, useState } from 'react'
import { dmcColors } from '../data/dmcColors'
import type { SizeUnit } from '../lib/physicalSize'

interface Props {
  ownedCodes: ReadonlySet<string>
  onToggleOwned: (code: string) => void
  sizeUnit: SizeUnit
  onSetSizeUnit: (unit: SizeUnit) => void
  onClose: () => void
}

type FilterMode = 'all' | 'owned'

/**
 * A standalone full-page view (not a modal) so it's comfortable to use on a
 * phone - e.g. checking your DMC stash while standing in a craft store.
 */
export function SettingsPage({ ownedCodes, onToggleOwned, sizeUnit, onSetSizeUnit, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = filterMode === 'owned' ? dmcColors.filter((d) => ownedCodes.has(d.code)) : dmcColors
    if (!q) return base
    return base.filter((d) => d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q))
  }, [search, filterMode, ownedCodes])

  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center gap-3 border-b border-neutral-800 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
        >
          ← Back
        </button>
        <h1 className="text-base font-semibold">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <section className="border-b border-neutral-800 p-4">
          <h2 className="mb-2 text-sm font-semibold">Size unit</h2>
          <div className="flex gap-2">
            {(['cm', 'in'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => onSetSizeUnit(unit)}
                className={
                  sizeUnit === unit
                    ? 'rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white'
                    : 'rounded-md border border-neutral-700 px-4 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800'
                }
              >
                {unit === 'cm' ? 'Centimeters' : 'Inches'}
              </button>
            ))}
          </div>
        </section>

        <section className="p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">My DMC threads</h2>
            <span className="text-xs text-neutral-500">
              {ownedCodes.size} / {dmcColors.length} owned
            </span>
          </div>
          <p className="mb-3 text-xs text-neutral-500">
            Mark the threads you already have. The "Only my threads" palette mode will prefer these when generating a
            pattern.
          </p>

          <div className="mb-3 flex gap-2">
            {(['all', 'owned'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={
                  filterMode === mode
                    ? 'rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white'
                    : 'rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800'
                }
              >
                {mode === 'all' ? 'All threads' : 'Owned only'}
              </button>
            ))}
          </div>

          <input
            type="text"
            inputMode="search"
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-base text-neutral-100"
          />
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((d) => {
              const owned = ownedCodes.has(d.code)
              return (
                <li key={d.code}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-800 px-3 py-1.5 hover:bg-neutral-900 active:bg-neutral-800">
                    <input
                      type="checkbox"
                      checked={owned}
                      onChange={() => onToggleOwned(d.code)}
                      className="h-4 w-4 shrink-0 accent-indigo-500"
                    />
                    <span
                      className="h-5 w-5 shrink-0 rounded-sm border border-black/20"
                      style={{ backgroundColor: `rgb(${d.r}, ${d.g}, ${d.b})` }}
                    />
                    <span className="flex-1 truncate text-sm text-neutral-200">
                      {d.code} - {d.name}
                    </span>
                  </label>
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="col-span-full px-3 py-6 text-center text-sm text-neutral-500">No matches</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
