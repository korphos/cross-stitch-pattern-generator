import type { WizardStep } from '../lib/types'

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: '1. Image' },
  { key: 'adjust', label: '2. Grid' },
  { key: 'palette', label: '3. Palette' },
  { key: 'print', label: '4. Print' },
]

interface Props {
  step: WizardStep
  canNavigateTo: (step: WizardStep) => boolean
  onSelect: (step: WizardStep) => void
}

export function Stepper({ step, canNavigateTo, onSelect }: Props) {
  return (
    <nav className="flex gap-4 text-sm">
      {STEPS.map((s) => {
        const isActive = s.key === step
        const isEnabled = canNavigateTo(s.key)
        return (
          <button
            key={s.key}
            type="button"
            disabled={!isEnabled}
            onClick={() => onSelect(s.key)}
            className={
              isActive
                ? 'font-semibold text-indigo-600'
                : isEnabled
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'cursor-not-allowed text-gray-300'
            }
          >
            {s.label}
          </button>
        )
      })}
    </nav>
  )
}
