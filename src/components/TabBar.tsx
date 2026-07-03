import type { ActiveTab } from '../lib/types'

const TABS: { key: ActiveTab; label: string }[] = [
  { key: 'grid', label: 'Grid' },
  { key: 'palette', label: 'Palette' },
]

interface Props {
  activeTab: ActiveTab
  onSelect: (tab: ActiveTab) => void
}

export function TabBar({ activeTab, onSelect }: Props) {
  return (
    <div className="screen-only flex justify-center gap-1 border-t border-neutral-800 bg-neutral-900 py-2">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelect(tab.key)}
          className={
            tab.key === activeTab
              ? 'rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white'
              : 'rounded-md px-4 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
