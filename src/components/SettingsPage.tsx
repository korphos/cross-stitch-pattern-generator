import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { allDmcColors } from '../data/dmcSpecialtyColors'
import type { SizeUnit } from '../lib/physicalSize'
import type { PrintMode } from '../lib/printLayout'
import type { PrintColorMode } from '../lib/renderPattern'
import type { SymbolStyle } from '../lib/types'
import { ICON_SYMBOL_POOL, LETTER_SYMBOL_POOL } from '../lib/symbolAssignment'
import { encodeSettings, SETTINGS_SHARE_PARAM } from '../lib/settingsShare'
import { SUPPORTED_LANGUAGES } from '../i18n'

interface Props {
  ownedCodes: ReadonlySet<string>
  onToggleOwned: (code: string) => void
  sizeUnit: SizeUnit
  onSetSizeUnit: (unit: SizeUnit) => void
  printMode: PrintMode
  onSetPrintMode: (mode: PrintMode) => void
  printColorMode: PrintColorMode
  onSetPrintColorMode: (mode: PrintColorMode) => void
  symbolStyle: SymbolStyle
  onSetSymbolStyle: (style: SymbolStyle) => void
  onClose: () => void
}

type FilterMode = 'all' | 'owned' | 'specialty'

/**
 * A standalone full-page view (not a modal) so it's comfortable to use on a
 * phone - e.g. checking your DMC stash while standing in a craft store.
 */
export function SettingsPage({
  ownedCodes,
  onToggleOwned,
  sizeUnit,
  onSetSizeUnit,
  printMode,
  onSetPrintMode,
  printColorMode,
  onSetPrintColorMode,
  symbolStyle,
  onSetSymbolStyle,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation()
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [copied, setCopied] = useState(false)

  function handleShare() {
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set(
      SETTINGS_SHARE_PARAM,
      encodeSettings({ ownedThreadCodes: [...ownedCodes], sizeUnit, printMode, printColorMode, symbolStyle }),
    )
    void navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let base = allDmcColors
    if (filterMode === 'owned') base = base.filter((d) => ownedCodes.has(d.code))
    else if (filterMode === 'specialty') base = base.filter((d) => d.finish)
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
          {t('settingsPage.back')}
        </button>
        <h1 className="text-base font-semibold">{t('settingsPage.title')}</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-px border-b border-neutral-800 bg-neutral-800 sm:grid-cols-2 lg:grid-cols-3">
          <section className="bg-neutral-950 p-4">
            <h2 className="mb-2 text-sm font-semibold">{t('settingsPage.language')}</h2>
            <select
              value={i18n.resolvedLanguage ?? i18n.language}
              onChange={(e) => {
                const lang = e.target.value
                void i18n.changeLanguage(lang)
                // Reflects the pick in the URL (see the hreflang alternates in index.html) so
                // the page stays shareable/bookmarkable in that language, not just cached locally.
                const url = new URL(window.location.href)
                url.searchParams.set('lang', lang)
                window.history.replaceState(null, '', url)
              }}
              className="rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </section>

          <section className="bg-neutral-950 p-4">
            <h2 className="mb-2 text-sm font-semibold">{t('settingsPage.sizeUnit')}</h2>
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
                  {unit === 'cm' ? t('settingsPage.centimeters') : t('settingsPage.inches')}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-neutral-950 p-4">
            <h2 className="mb-2 text-sm font-semibold">{t('settingsPage.symbolStyle')}</h2>
            <p className="mb-2 text-xs text-neutral-500">{t('settingsPage.symbolStyleHelp')}</p>
            <div className="flex flex-col gap-2">
              {(['icons', 'letters'] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => onSetSymbolStyle(style)}
                  className={
                    symbolStyle === style
                      ? 'rounded-md bg-indigo-600 px-4 py-1.5 text-left text-sm font-medium text-white'
                      : 'rounded-md border border-neutral-700 px-4 py-1.5 text-left text-sm text-neutral-300 hover:bg-neutral-800'
                  }
                >
                  {style === 'letters'
                    ? t('settingsPage.symbolStyleLetters', { sample: LETTER_SYMBOL_POOL.slice(0, 3).join(', ') })
                    : t('settingsPage.symbolStyleIcons', { sample: ICON_SYMBOL_POOL.slice(0, 3).join(', ') })}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-neutral-950 p-4">
            <h2 className="mb-2 text-sm font-semibold">{t('settingsPage.printMode')}</h2>
            <p className="mb-2 text-xs text-neutral-500">{t('settingsPage.printModeHelp')}</p>
            <select
              value={printMode}
              onChange={(e) => onSetPrintMode(e.target.value as PrintMode)}
              className="w-full rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100"
            >
              <option value="auto">{t('settingsPage.printModeAuto')}</option>
              <option value="single">{t('settingsPage.printModeSingle')}</option>
              <option value="multi">{t('settingsPage.printModeMulti')}</option>
            </select>
            <label className="mt-3 flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={printColorMode === 'blackAndWhite'}
                onChange={(e) => onSetPrintColorMode(e.target.checked ? 'blackAndWhite' : 'color')}
                className="h-4 w-4 accent-indigo-500"
              />
              {t('settingsPage.printBlackAndWhite')}
            </label>
            <p className="mt-1 text-xs text-neutral-500">{t('settingsPage.printBlackAndWhiteHelp')}</p>
          </section>

          <section className="bg-neutral-950 p-4">
            <h2 className="mb-2 text-sm font-semibold">{t('settingsPage.shareSettings')}</h2>
            <p className="mb-3 text-xs text-neutral-500">{t('settingsPage.shareHelp')}</p>
            <button
              type="button"
              onClick={handleShare}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              {copied ? t('settingsPage.copied') : t('settingsPage.copyShareLink')}
            </button>
          </section>
        </div>

        <section className="p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">{t('settingsPage.myThreads')}</h2>
            <span className="text-xs text-neutral-500">
              {t('settingsPage.ownedCount', { owned: ownedCodes.size, total: allDmcColors.length })}
            </span>
          </div>
          <p className="mb-3 text-xs text-neutral-500">{t('settingsPage.threadsHelp')}</p>

          <div className="mb-3 flex flex-wrap gap-2">
            {(['all', 'owned', 'specialty'] as const).map((mode) => (
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
                {mode === 'all' ? t('common.allThreads') : mode === 'owned' ? t('common.ownedOnly') : t('settingsPage.metallicSatin')}
              </button>
            ))}
          </div>

          <input
            type="text"
            inputMode="search"
            placeholder={t('common.searchPlaceholder')}
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
                    {d.finish && (
                      <span className="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                        {d.finish}
                      </span>
                    )}
                  </label>
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="col-span-full px-3 py-6 text-center text-sm text-neutral-500">{t('common.noMatches')}</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
