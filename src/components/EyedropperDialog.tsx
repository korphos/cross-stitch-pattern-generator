import { useCallback, useMemo, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { DmcColor, PixelBuffer, RGB } from '../lib/types'
import { allDmcColors } from '../data/dmcSpecialtyColors'
import { sortedBySimilarity } from '../lib/colorMatch'

interface Props {
  imageData: PixelBuffer
  imageDataUrl: string
  /** codes already in the palette - excluded from the match list, same as "+ Add color" */
  existingCodes: ReadonlySet<string>
  ownedCodes: ReadonlySet<string>
  onAdd: (dmc: DmcColor) => void
  onClose: () => void
}

const MAX_DISPLAY_WIDTH = 480
// Absolute scale (1 = native pixel size), not a multiplier of the fit-to-width view - a large
// source photo would otherwise never reach true pixel-level zoom even at the max step.
const MIN_ZOOM = 0.1
const MAX_ZOOM = 16
const ZOOM_FACTOR = 1.5

function readPixel(img: PixelBuffer, x: number, y: number): RGB {
  const px = Math.max(0, Math.min(img.width - 1, Math.floor(x)))
  const py = Math.max(0, Math.min(img.height - 1, Math.floor(y)))
  const i = (py * img.width + px) * 4
  return { r: img.data[i], g: img.data[i + 1], b: img.data[i + 2] }
}

/**
 * Modal for picking a color straight from the original photo instead of the auto-detected
 * palette - e.g. a shade the clustering missed, or (combined with the grid's sample-point
 * offset) a bead's ring color. Zoom in, click a pixel, then add either the closest DMC match
 * or any of the visually similar threads shown below it, same as "+ Add color".
 */
export function EyedropperDialog({ imageData, imageDataUrl, existingCodes, ownedCodes, onAdd, onClose }: Props) {
  const [zoom, setZoom] = useState(() => Math.min(1, MAX_DISPLAY_WIDTH / imageData.width))
  const [picked, setPicked] = useState<RGB | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null)

  const displayWidth = imageData.width * zoom
  const displayHeight = imageData.height * zoom

  const matches = useMemo(() => {
    if (!picked) return []
    return sortedBySimilarity(picked, allDmcColors)
      .filter((d) => !existingCodes.has(d.code))
      .slice(0, 40)
  }, [picked, existingCodes])

  function handlePick(e: MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    setPicked(readPixel(imageData, x, y))
  }

  // Ctrl/Cmd+scroll (and trackpad pinch, reported as a wheel event with ctrlKey set) zooms;
  // plain scroll still pans the container normally - same convention as the pattern canvas.
  // React's onWheel is passive, so preventDefault() there is silently ignored - a native
  // listener with { passive: false } is required to actually stop page/browser zoom too.
  const attachWheelZoom = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el
    if (!el) return
    function onWheel(e: globalThis.WheelEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      setZoom((z) => {
        const next = e.deltaY < 0 ? z * ZOOM_FACTOR : z / ZOOM_FACTOR
        return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next))
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Middle-click drag pans the zoomed image - scrolls the container directly rather than
  // touching zoom/pixel state, so it works regardless of zoom level.
  const handlePanMove = useCallback((e: globalThis.PointerEvent) => {
    const pan = panRef.current
    const container = containerRef.current
    if (!pan || !container) return
    container.scrollLeft = pan.scrollLeft - (e.clientX - pan.startX)
    container.scrollTop = pan.scrollTop - (e.clientY - pan.startY)
  }, [])

  const handlePanEnd = useCallback(() => {
    panRef.current = null
    setIsPanning(false)
    window.removeEventListener('pointermove', handlePanMove)
    window.removeEventListener('pointerup', handlePanEnd)
  }, [handlePanMove])

  const handlePanStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 1) return
      // Suppresses the browser's native middle-click autoscroll/paste so it doesn't fight
      // with our own panning.
      e.preventDefault()
      const container = containerRef.current
      if (!container) return
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      }
      setIsPanning(true)
      window.addEventListener('pointermove', handlePanMove)
      window.addEventListener('pointerup', handlePanEnd)
    },
    [handlePanMove, handlePanEnd],
  )

  function stop(e: MouseEvent) {
    e.stopPropagation()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-3 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 p-5"
        onClick={stop}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-neutral-100">Pick a color from the photo</h3>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            Close
          </button>
        </div>
        <p className="-mt-2 text-xs text-neutral-500">
          Zoom in (buttons, or Ctrl/Cmd+scroll), middle-click drag to pan around, then click a pixel on the original
          photo to find its closest DMC match, or pick any visually similar thread instead.
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / ZOOM_FACTOR))}
            className="flex h-7 w-7 items-center justify-center rounded border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
          >
            −
          </button>
          <span className="w-12 text-center text-xs text-neutral-400">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_FACTOR))}
            className="flex h-7 w-7 items-center justify-center rounded border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
          >
            +
          </button>
        </div>

        <div
          ref={attachWheelZoom}
          onPointerDown={handlePanStart}
          className={`max-h-[45vh] shrink-0 overflow-auto rounded-md border border-neutral-800 bg-[repeating-conic-gradient(#3f3f46_0%_25%,#27272a_0%_50%)] bg-size-[16px_16px] ${
            isPanning ? 'cursor-grabbing' : ''
          }`}
        >
          <img
            src={imageDataUrl}
            alt="Original photo"
            onClick={handlePick}
            draggable={false}
            className="block max-w-none cursor-crosshair select-none"
            style={{ width: displayWidth, height: displayHeight }}
          />
        </div>

        {picked && (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <span
                className="h-6 w-6 shrink-0 rounded-sm border border-black/20"
                style={{ backgroundColor: `rgb(${picked.r}, ${picked.g}, ${picked.b})` }}
              />
              Picked color - choose the closest match or any similar thread below:
            </div>
            <ul className="flex-1 divide-y divide-neutral-800 overflow-y-auto rounded-md border border-neutral-800">
              {matches.map((d) => {
                const owned = ownedCodes.has(d.code)
                return (
                  <li key={d.code}>
                    <button
                      type="button"
                      onClick={() => onAdd(d)}
                      title={owned ? 'You own this thread' : undefined}
                      className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-neutral-200 hover:bg-neutral-800 ${
                        owned ? 'bg-green-950/30' : ''
                      }`}
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-sm border border-black/20"
                        style={{ backgroundColor: `rgb(${d.r}, ${d.g}, ${d.b})` }}
                      />
                      <span className="truncate">
                        {d.code} - {d.name}
                      </span>
                      {owned && <span className="shrink-0 text-green-400">✓ owned</span>}
                      {d.finish && (
                        <span className="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                          {d.finish}
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-xs text-neutral-500">ΔE {d.deltaE.toFixed(1)}</span>
                    </button>
                  </li>
                )
              })}
              {matches.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-neutral-500">No matches</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
