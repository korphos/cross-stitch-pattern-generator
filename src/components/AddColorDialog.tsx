import { useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { DmcColor } from '../lib/types'
import { allDmcColors } from '../data/dmcSpecialtyColors'

interface Props {
  existingCodes: ReadonlySet<string>
  ownedCodes: ReadonlySet<string>
  onAdd: (dmc: DmcColor) => void
  onClose: () => void
}

type FilterMode = 'all' | 'owned'

/** Modal for adding a brand-new DMC thread to the palette - with no cells assigned yet, ready to be picked from the single-cell recolor popover. */
export function AddColorDialog({ existingCodes, ownedCodes, onAdd, onClose }: Props) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    let base = allDmcColors.filter((d) => !existingCodes.has(d.code))
    if (filterMode === 'owned') base = base.filter((d) => ownedCodes.has(d.code))
    if (q) base = base.filter((d) => d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q))
    return base
  }, [search, filterMode, existingCodes, ownedCodes])

  function stop(e: MouseEvent) {
    e.stopPropagation()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 p-5"
        onClick={stop}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-neutral-100">{t('addColorDialog.title')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            {t('common.close')}
          </button>
        </div>
        <p className="-mt-2 text-xs text-neutral-500">{t('addColorDialog.helper')}</p>

        <div className="flex gap-2">
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
              {mode === 'all' ? t('common.allThreads') : t('common.ownedOnly')}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder={t('common.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-neutral-600 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
        />

        <ul className="flex-1 divide-y divide-neutral-800 overflow-y-auto rounded-md border border-neutral-800">
          {candidates.map((d) => {
            const owned = ownedCodes.has(d.code)
            return (
              <li key={d.code}>
                <button
                  type="button"
                  onClick={() => onAdd(d)}
                  title={owned ? t('common.ownedTitle') : undefined}
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-neutral-200 hover:bg-neutral-800 ${
                    owned ? 'bg-green-950/30' : ''
                  }`}
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded-sm border border-black/20"
                    style={{ backgroundColor: `rgb(${d.r}, ${d.g}, ${d.b})` }}
                  />
                  <span className="truncate">
                    {d.code} - {d.name}
                  </span>
                  {owned && <span className="shrink-0 text-green-400">{t('common.ownedBadge')}</span>}
                  {d.finish && (
                    <span className="ml-auto shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                      {d.finish}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
          {candidates.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-neutral-500">{t('common.noMatches')}</li>
          )}
        </ul>
      </div>
    </div>
  )
}
