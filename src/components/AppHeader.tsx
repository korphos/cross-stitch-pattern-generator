import type { ChangeEvent } from 'react'

interface Props {
  onFile: (file: File) => void
  isUploading: boolean
  canPrint: boolean
  onPrint: () => void
}

export function AppHeader({ onFile, isUploading, canPrint, onPrint }: Props) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  return (
    <header className="screen-only grid grid-cols-[1fr_auto_1fr] items-center border-b border-neutral-800 bg-neutral-900 px-4 py-2">
      <label className="w-fit cursor-pointer justify-self-start rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700">
        {isUploading ? 'Loading…' : 'Replace image'}
        <input type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={isUploading} />
      </label>
      <button
        type="button"
        disabled={!canPrint}
        onClick={onPrint}
        className="justify-self-center rounded-lg bg-indigo-600 px-8 py-1.5 text-base font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
      >
        Print
      </button>
    </header>
  )
}
