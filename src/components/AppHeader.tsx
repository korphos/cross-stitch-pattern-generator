import type { ChangeEvent } from 'react'

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
}: Props) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  return (
    <header className="screen-only flex flex-col gap-2 border-b border-neutral-800 bg-neutral-900 px-3 py-2 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-0 sm:px-4">
      <div className="order-2 flex flex-wrap items-center justify-center gap-2 sm:order-1 sm:justify-self-start">
        <label className="w-fit cursor-pointer rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700">
          {isUploading ? 'Loading…' : 'Replace image'}
          <input type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={isUploading} />
        </label>
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Redo
        </button>
      </div>
      <button
        type="button"
        disabled={!canPrint}
        onClick={onPrint}
        className="order-1 w-full rounded-lg bg-indigo-600 px-8 py-1.5 text-base font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 sm:order-2 sm:w-auto sm:justify-self-center"
      >
        Print
      </button>
      <div className="order-3 flex justify-center sm:justify-self-end">
        <button
          type="button"
          onClick={onSettings}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700"
        >
          Settings
        </button>
      </div>
    </header>
  )
}
