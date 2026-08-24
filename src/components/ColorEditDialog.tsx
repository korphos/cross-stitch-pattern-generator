import { useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { PaletteEntry, DmcColor } from '../lib/types'
import { sortedBySimilarity } from '../lib/colorMatch'
import { allDmcColors } from '../data/dmcSpecialtyColors'

interface Props {
  entry: PaletteEntry
  otherEntries: PaletteEntry[]
  onMergeInto: (toCode: string) => void
  onRecolor: (newDmc: DmcColor) => void
  onDelete: () => void
  onClose: () => void
  /** DMC codes the user already owns a skein of, so this dialog can highlight them - see Settings */
  ownedCodes: ReadonlySet<string>
}

/** Modal for editing one palette color: merge it into another color already in the pattern, recolor it to any DMC thread (sorted by similarity), or remove it entirely. */
export function ColorEditDialog({ entry, otherEntries, onMergeInto, onRecolor, onDelete, onClose, ownedCodes }: Props) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const candidates = useMemo(() => {
    const sorted = sortedBySimilarity(entry.color, allDmcColors)
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
            DMC {entry.dmc.code} - {entry.dmc.name}
          </h3>
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto rounded-md px-2 py-1 text-sm text-red-400 hover:bg-red-950 hover:text-red-300"
          >
            {t('colorEditDialog.removeColor')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            {t('common.close')}
          </button>
        </div>
        <p className="-mt-2 text-xs text-neutral-500">
          {t('colorEditDialog.removeHelper', { symbol: entry.symbol })}
        </p>

        {entry.finishAlternative && (
          <div className="flex items-center gap-3 rounded-md border border-amber-900/60 bg-amber-950/30 px-3 py-2">
            <span
              className="h-6 w-6 shrink-0 rounded-sm border border-black/20"
              style={{
                backgroundColor: `rgb(${entry.finishAlternative.dmc.r}, ${entry.finishAlternative.dmc.g}, ${entry.finishAlternative.dmc.b})`,
              }}
            />
            <p className="flex-1 text-xs text-amber-200">
              {entry.dmc.finish ? t('colorEditDialog.standardAlternative') : t('colorEditDialog.shinyAlternative')}
              <span className="font-medium">
                {entry.finishAlternative.dmc.code} - {entry.finishAlternative.dmc.name}
              </span>
              {entry.finishAlternative.dmc.finish && (
                <span className="ml-1 uppercase text-amber-400">({entry.finishAlternative.dmc.finish})</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => onRecolor(entry.finishAlternative!.dmc)}
              className="shrink-0 rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-500"
            >
              {t('colorEditDialog.switch')}
            </button>
          </div>
        )}

        {otherEntries.length > 0 && (
          <div>
            <h4 className="mb-1 text-sm font-medium text-neutral-200">{t('colorEditDialog.replaceTitle')}</h4>
            <p className="mb-2 text-xs text-neutral-500">
              {t('colorEditDialog.replaceHelper', { symbol: entry.symbol })}
            </p>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
              {otherEntries.map((other) => {
                const owned = ownedCodes.has(other.dmc.code)
                return (
                  <button
                    key={other.dmc.code}
                    type="button"
                    onClick={() => onMergeInto(other.dmc.code)}
                    title={owned ? t('common.ownedTitle') : undefined}
                    className={`flex items-center gap-2 rounded-md border px-2 py-1 text-sm text-neutral-200 hover:bg-neutral-800 ${
                      owned ? 'border-green-600 bg-green-950/30' : 'border-neutral-700'
                    }`}
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-sm border border-black/20 font-mono text-[11px]"
                      style={{ backgroundColor: `rgb(${other.color.r}, ${other.color.g}, ${other.color.b})`, color: other.textColor }}
                    >
                      {other.symbol}
                    </span>
                    {other.dmc.code}
                    {owned && <span className="text-green-400">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <h4 className="mb-2 text-sm font-medium text-neutral-200">{t('colorEditDialog.changeTitle')}</h4>
          <input
            type="text"
            placeholder={t('common.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 rounded-md border border-neutral-600 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
          />
          <ul className="flex-1 divide-y divide-neutral-800 overflow-y-auto rounded-md border border-neutral-800">
            {candidates.map((d) => {
              const owned = ownedCodes.has(d.code)
              return (
                <li key={d.code}>
                  <button
                    type="button"
                    onClick={() => onRecolor(d)}
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
                      <span className="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                        {d.finish}
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-xs text-neutral-500">{t('common.deltaE', { value: d.deltaE.toFixed(1) })}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
