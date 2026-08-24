import { useTranslation } from 'react-i18next'
import { Undo2 } from 'lucide-react'
import type { CropShapeChoice } from './CropPanel'

interface Props {
  shape: CropShapeChoice
  onShapeChange: (shape: CropShapeChoice) => void
  onApply: () => void
  canUndo: boolean
  onUndo: () => void
}

const SHAPES: { value: CropShapeChoice; labelKey: string; swatchClassName: string }[] = [
  { value: 'rectangle', labelKey: 'cropControls.shapeRectangle', swatchClassName: 'h-3 w-5 rounded-sm' },
  { value: 'square', labelKey: 'cropControls.shapeSquare', swatchClassName: 'h-4 w-4 rounded-sm' },
  { value: 'circle', labelKey: 'cropControls.shapeCircle', swatchClassName: 'h-4 w-4 rounded-full' },
  { value: 'oval', labelKey: 'cropControls.shapeOval', swatchClassName: 'h-3 w-5 rounded-full' },
]

export function CropControls({ shape, onShapeChange, onApply, canUndo, onUndo }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <h2 className="text-sm font-semibold text-neutral-100">{t('cropControls.title')}</h2>
      <p className="text-xs text-neutral-400">{t('cropControls.helper')}</p>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-neutral-300">{t('cropControls.shape')}</span>
        <div className="grid grid-cols-2 gap-2">
          {SHAPES.map(({ value, labelKey, swatchClassName }) => (
            <button
              key={value}
              type="button"
              onClick={() => onShapeChange(value)}
              className={
                shape === value
                  ? 'flex items-center justify-center gap-1.5 rounded-md border border-indigo-500 bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white'
                  : 'flex items-center justify-center gap-1.5 rounded-md border border-neutral-600 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-800'
              }
            >
              <span className={`shrink-0 border-2 border-current ${swatchClassName}`} />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onApply}
        className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        {t('cropControls.apply')}
      </button>

      {canUndo && (
        <div className="border-t border-neutral-800 pt-3">
          <p className="mb-2 text-xs text-neutral-500">{t('cropControls.appliedNote')}</p>
          <button
            type="button"
            onClick={onUndo}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-neutral-600 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-800"
          >
            <Undo2 className="h-4 w-4" />
            {t('cropControls.undo')}
          </button>
        </div>
      )}
    </div>
  )
}
