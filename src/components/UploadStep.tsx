import { useCallback, useState } from 'react'
import type { Dispatch } from 'react'
import { detectGrid } from '../lib/gridDetection'
import type { ProjectAction } from '../lib/projectReducer'

interface Props {
  dispatch: Dispatch<ProjectAction>
}

async function loadImageFile(file: File): Promise<{ imageData: ImageData; dataUrl: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Could not load the image'))
    img.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2D canvas unavailable')
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { imageData, dataUrl }
}

export function UploadStep({ dispatch }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setIsLoading(true)
      try {
        const { imageData, dataUrl } = await loadImageFile(file)
        const detectedGrid = detectGrid(imageData)
        dispatch({ type: 'IMAGE_LOADED', imageData, imageDataUrl: dataUrl, detectedGrid })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error while loading the image')
      } finally {
        setIsLoading(false)
      }
    },
    [dispatch],
  )

  return (
    <div className="mx-auto max-w-xl">
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) void handleFile(file)
        }}
      >
        <p className="text-gray-600">Drag and drop an already-pixelated image here, or</p>
        <label className="cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          Choose a file
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
        </label>
        {isLoading && <p className="text-sm text-gray-500">Analyzing image...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
