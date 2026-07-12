import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  cellPx: number
  defaultCellPx: number
  previewMode: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onTogglePreview: () => void
}

/** Floating zoom + preview controls for the pattern canvas viewport. */
export function ZoomControls({
  cellPx,
  defaultCellPx,
  previewMode,
  onZoomIn,
  onZoomOut,
  onReset,
  onTogglePreview,
}: Props) {
  const { t } = useTranslation()
  const percent = Math.round((cellPx / defaultCellPx) * 100)

  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900/90 px-1 py-1 shadow-lg">
      <button
        type="button"
        onClick={onTogglePreview}
        title={previewMode ? t('zoomControls.showGridSymbols') : t('zoomControls.hideGridSymbols')}
        aria-pressed={previewMode}
        className={`flex h-7 w-7 items-center justify-center rounded ${
          previewMode ? 'bg-indigo-600 text-white' : 'text-neutral-200 hover:bg-neutral-800'
        }`}
      >
        {previewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      <div className="mx-0.5 h-5 w-px bg-neutral-700" />
      <button
        type="button"
        onClick={onZoomOut}
        title={t('zoomControls.zoomOut')}
        className="flex h-7 w-7 items-center justify-center rounded text-base text-neutral-200 hover:bg-neutral-800"
      >
        −
      </button>
      <button
        type="button"
        onClick={onReset}
        title={t('zoomControls.resetZoom')}
        className="w-14 rounded py-1 text-center text-xs text-neutral-400 hover:bg-neutral-800"
      >
        {percent}%
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        title={t('zoomControls.zoomIn')}
        className="flex h-7 w-7 items-center justify-center rounded text-base text-neutral-200 hover:bg-neutral-800"
      >
        +
      </button>
    </div>
  )
}
