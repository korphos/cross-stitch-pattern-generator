import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  onFile: (file: File) => void
  isUploading: boolean
  error: string | null
  isDraggingOver: boolean
}

// Drag-and-drop is handled globally (see App.tsx) so a file can be dropped
// anywhere in the app at any time, not just onto this box - this is just
// the call-to-action shown in the main viewport before an image is loaded.
export function UploadDropzone({ onFile, isUploading, error, isDraggingOver }: Props) {
  const { t } = useTranslation()
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div
        className={`flex max-w-md flex-col items-center gap-3 rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          isDraggingOver ? 'border-indigo-500 bg-indigo-950/30' : 'border-neutral-700 bg-neutral-900'
        }`}
      >
        <p className="text-neutral-400">{t('uploadDropzone.dragDrop')}</p>
        <label className="cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">
          {t('uploadDropzone.chooseFile')}
          <input type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={isUploading} />
        </label>
        {isUploading && <p className="text-sm text-neutral-500">{t('uploadDropzone.analyzing')}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  )
}
