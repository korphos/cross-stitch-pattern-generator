import { useTranslation } from 'react-i18next'
import { Circle, Square, Undo2 } from 'lucide-react'

interface Props {
  shape: 'square' | 'circle'
  onShapeChange: (shape: 'square' | 'circle') => void
  onApply: () => void
  canUndo: boolean
  onUndo: () => void
}

export function CropControls({ shape, onShapeChange, onApply, canUndo, onUndo }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <h2 className="text-sm font-semibold text-neutral-100">{t('cropControls.title')}</h2>
      <p className="text-xs text-neutral-400">{t('cropControls.helper')}</p>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-neutral-300">{t('cropControls.shape')}</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onShapeChange('square')}
            className={
              shape === 'square'
                ? 'flex items-center justify-center gap-1.5 rounded-md border border-indigo-500 bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white'
                : 'flex items-center justify-center gap-1.5 rounded-md border border-neutral-600 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-800'
            }
          >
            <Square className="h-4 w-4" />
            {t('cropControls.shapeSquare')}
          </button>
          <button
            type="button"
            onClick={() => onShapeChange('circle')}
            className={
              shape === 'circle'
                ? 'flex items-center justify-center gap-1.5 rounded-md border border-indigo-500 bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white'
                : 'flex items-center justify-center gap-1.5 rounded-md border border-neutral-600 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-800'
            }
          >
            <Circle className="h-4 w-4" />
            {t('cropControls.shapeCircle')}
          </button>
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
