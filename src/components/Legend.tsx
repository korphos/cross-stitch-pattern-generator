import { useTranslation } from 'react-i18next'
import type { PaletteEntry } from '../lib/types'

interface Props {
  palette: PaletteEntry[]
  cols: number
  rows: number
  className?: string
  /** the swatch colors are always the true DMC colors; this only affects surrounding text/chrome */
  dark?: boolean
}

export function Legend({ palette, cols, rows, className, dark = false }: Props) {
  const { t } = useTranslation()
  return (
    <div className={className}>
      <h3 className={`mb-2 text-sm font-semibold ${dark ? 'text-neutral-100' : 'text-gray-900'}`}>
        {t('legend.title', { count: palette.length, cols, rows })}
      </h3>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {palette.map((entry) => (
          <li key={entry.dmc.code} className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-black/20 font-mono text-[11px]"
              style={{
                backgroundColor: `rgb(${entry.color.r}, ${entry.color.g}, ${entry.color.b})`,
                color: entry.textColor,
              }}
            >
              {entry.symbol}
            </span>
            <span className={dark ? 'text-neutral-300' : 'text-gray-800'}>
              {entry.dmc.code} - {entry.dmc.name}
              {entry.dmc.finish === 'metallic' && (
                <span className={dark ? 'text-neutral-500' : 'text-gray-500'}> {t('legend.metallic')}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
