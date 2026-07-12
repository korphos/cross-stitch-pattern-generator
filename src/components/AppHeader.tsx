import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageUp, Undo2, Redo2, Printer, Settings, Download, Upload } from 'lucide-react'
import { PROJECT_FILE_EXTENSION } from '../lib/projectFile'

interface Props {
  onFile: (file: File) => void
  isUploading: boolean
  canPrint: boolean
  onPrint: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onSettings: () => void
  canExport: boolean
  onExport: () => void
  onImportFile: (file: File) => void
  isImporting: boolean
}

export function AppHeader({
  onFile,
  isUploading,
  canPrint,
  onPrint,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSettings,
  canExport,
  onExport,
  onImportFile,
  isImporting,
}: Props) {
  const { t } = useTranslation()
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  function handleImportChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onImportFile(file)
    e.target.value = ''
  }

  return (
    <header className="screen-only flex flex-col gap-2 border-b border-neutral-800 bg-neutral-900 px-3 py-2 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-0 sm:px-4">
      <div className="order-2 flex flex-wrap items-center justify-center gap-2 sm:order-1 sm:justify-self-start">
        <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700">
          <ImageUp size={16} className="shrink-0" />
          {isUploading ? t('common.loading') : t('header.replaceImage')}
          <input type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={isUploading} />
        </label>
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          title={t('header.undoTitle')}
          className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo2 size={16} className="shrink-0" />
          {t('header.undo')}
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={onRedo}
          title={t('header.redoTitle')}
          className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Redo2 size={16} className="shrink-0" />
          {t('header.redo')}
        </button>
      </div>
      <button
        type="button"
        disabled={!canPrint}
        onClick={onPrint}
        className="order-1 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-8 py-1.5 text-base font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 sm:order-2 sm:w-auto sm:justify-self-center"
      >
        <Printer size={18} className="shrink-0" />
        {t('header.print')}
      </button>
      <div className="order-3 flex flex-wrap items-center justify-center gap-2 sm:justify-self-end">
        <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700">
          <Upload size={16} className="shrink-0" />
          {isImporting ? t('common.loading') : t('header.import')}
          <input
            type="file"
            accept={`${PROJECT_FILE_EXTENSION},application/json`}
            className="hidden"
            onChange={handleImportChange}
            disabled={isImporting}
          />
        </label>
        <button
          type="button"
          disabled={!canExport}
          onClick={onExport}
          title={t('header.exportTitle')}
          className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={16} className="shrink-0" />
          {t('header.export')}
        </button>
        <button
          type="button"
          onClick={onSettings}
          className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700"
        >
          <Settings size={16} className="shrink-0" />
          {t('header.settings')}
        </button>
      </div>
    </header>
  )
}
