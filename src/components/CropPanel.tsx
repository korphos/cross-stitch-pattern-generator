import { useCallback, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { PixelBuffer } from '../lib/types'

export interface CropSelection {
  x: number
  y: number
  width: number
  height: number
}

export type CropShapeChoice = 'square' | 'rectangle' | 'circle' | 'oval'

interface Props {
  imageData: PixelBuffer
  imageDataUrl: string
  selection: CropSelection
  onSelectionChange: (next: CropSelection) => void
  shape: CropShapeChoice
}

const MAX_DISPLAY_DIMENSION = 720
const MIN_DISPLAY_DIMENSION = 480
const MIN_CROP_SIZE = 12
const MIN_ZOOM = 1
const MAX_ZOOM = 8
const ZOOM_STEP_FACTOR = 1.25

/** 'square'/'circle' keep the selection's width and height locked together while resizing. */
function isLockedAspect(shape: CropShapeChoice): boolean {
  return shape === 'square' || shape === 'circle'
}

/** 'circle'/'oval' clip the selection down to its inscribed ellipse. */
function isElliptical(shape: CropShapeChoice): boolean {
  return shape === 'circle' || shape === 'oval'
}

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

/** Same fit-to-viewport logic as GridPanel: shrink a large image down, or grow a tiny one up so
 * its drag handles aren't unusably close together - never both at once. */
function computeDisplayScale(width: number, height: number): number {
  const largest = Math.max(width, height)
  if (largest > MAX_DISPLAY_DIMENSION) return MAX_DISPLAY_DIMENSION / largest
  const smallest = Math.min(width, height)
  if (smallest < MIN_DISPLAY_DIMENSION) return MIN_DISPLAY_DIMENSION / smallest
  return 1
}

type DragMode = 'move' | 'resize'

export function CropPanel({ imageData, imageDataUrl, selection, onSelectionChange, shape }: Props) {
  const { t } = useTranslation()
  // On top of the fit-to-viewport base scale - the base alone is often too coarse to place a
  // round selection precisely on a large source photo, hence letting the user zoom in further.
  const [zoomFactor, setZoomFactor] = useState(1)
  const baseScale = computeDisplayScale(imageData.width, imageData.height)
  const scale = baseScale * zoomFactor
  const displayWidth = imageData.width * scale
  const displayHeight = imageData.height * scale

  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ mode: DragMode; start: CropSelection; startX: number; startY: number } | null>(null)
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const imageSizeRef = useRef({ width: imageData.width, height: imageData.height })
  imageSizeRef.current = { width: imageData.width, height: imageData.height }
  const onSelectionChangeRef = useRef(onSelectionChange)
  onSelectionChangeRef.current = onSelectionChange
  const shapeRef = useRef(shape)
  shapeRef.current = shape

  // Zoom resets whenever the underlying image changes (new upload, or a crop was just applied) -
  // a zoom level chosen for the previous image rarely still makes sense for the new one.
  const imageDataUrlRef = useRef(imageDataUrl)
  if (imageDataUrlRef.current !== imageDataUrl) {
    imageDataUrlRef.current = imageDataUrl
    if (zoomFactor !== 1) setZoomFactor(1)
  }

  const zoomIn = useCallback(() => setZoomFactor((z) => clampZoom(z * ZOOM_STEP_FACTOR)), [])
  const zoomOut = useCallback(() => setZoomFactor((z) => clampZoom(z / ZOOM_STEP_FACTOR)), [])
  const zoomReset = useCallback(() => setZoomFactor(1), [])

  // Ctrl/Cmd+scroll (and trackpad pinch) zooms instead of scrolling the viewport - same trick as
  // the palette canvas in App.tsx. A native listener is required since React's onWheel is passive.
  const attachWheelZoom = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    function onWheel(e: globalThis.WheelEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      setZoomFactor((z) => clampZoom(e.deltaY < 0 ? z * ZOOM_STEP_FACTOR : z / ZOOM_STEP_FACTOR))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current
    const container = containerRef.current
    if (!drag || !container) return
    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scaleRef.current
    const y = (e.clientY - rect.top) / scaleRef.current
    const { width: imgW, height: imgH } = imageSizeRef.current
    const { start } = drag

    if (drag.mode === 'move') {
      const dx = x - drag.startX
      const dy = y - drag.startY
      const newX = Math.max(0, Math.min(start.x + dx, imgW - start.width))
      const newY = Math.max(0, Math.min(start.y + dy, imgH - start.height))
      onSelectionChangeRef.current({ ...start, x: newX, y: newY })
    } else if (isLockedAspect(shapeRef.current)) {
      const maxSize = Math.min(imgW - start.x, imgH - start.y)
      const desired = Math.max(x - start.x, y - start.y)
      const size = Math.max(MIN_CROP_SIZE, Math.min(desired, maxSize))
      onSelectionChangeRef.current({ ...start, width: size, height: size })
    } else {
      const maxWidth = imgW - start.x
      const maxHeight = imgH - start.y
      const width = Math.max(MIN_CROP_SIZE, Math.min(x - start.x, maxWidth))
      const height = Math.max(MIN_CROP_SIZE, Math.min(y - start.y, maxHeight))
      onSelectionChangeRef.current({ ...start, width, height })
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerMove])

  const startDrag = useCallback(
    (mode: DragMode) => (e: ReactPointerEvent) => {
      // Left button only - the middle button pans the viewport instead (see startMiddleClickPan).
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      const container = containerRef.current
      const rect = container?.getBoundingClientRect()
      const x = rect ? (e.clientX - rect.left) / scaleRef.current : 0
      const y = rect ? (e.clientY - rect.top) / scaleRef.current : 0
      dragRef.current = { mode, start: selection, startX: x, startY: y }
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    },
    [selection, handlePointerMove, handlePointerUp],
  )

  // Middle-click drag pans the scrollable viewport, same as most image/map editors - handy once
  // zoomed in past what fits. Native listeners so the drag keeps tracking even if the cursor
  // leaves the scroll container mid-drag; preventDefault suppresses the browser's own middle-click
  // autoscroll/paste behavior from also kicking in.
  function startMiddleClickPan(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 1) return
    e.preventDefault()
    const scrollEl = e.currentTarget
    const startX = e.clientX
    const startY = e.clientY
    const startScrollLeft = scrollEl.scrollLeft
    const startScrollTop = scrollEl.scrollTop
    function onMove(ev: PointerEvent) {
      scrollEl.scrollLeft = startScrollLeft - (ev.clientX - startX)
      scrollEl.scrollTop = startScrollTop - (ev.clientY - startY)
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const selLeft = selection.x * scale
  const selTop = selection.y * scale
  const selWidth = selection.width * scale
  const selHeight = selection.height * scale

  return (
    <div className="flex h-full overflow-auto p-8" ref={attachWheelZoom} onPointerDown={startMiddleClickPan}>
      <div
        ref={containerRef}
        className="relative m-auto shrink-0 border border-neutral-700 shadow-lg"
        style={{ width: displayWidth, height: displayHeight }}
      >
        <img
          src={imageDataUrl}
          alt={t('cropPanel.imageAlt')}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={baseScale > 1 ? { imageRendering: 'pixelated' } : undefined}
          draggable={false}
        />

        {/* Dim everything outside the selection rectangle. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/55" style={{ height: selTop }} />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55"
          style={{ height: displayHeight - selTop - selHeight }}
        />
        <div
          className="pointer-events-none absolute bg-black/55"
          style={{ left: 0, top: selTop, width: selLeft, height: selHeight }}
        />
        <div
          className="pointer-events-none absolute bg-black/55"
          style={{ left: selLeft + selWidth, top: selTop, width: displayWidth - selLeft - selWidth, height: selHeight }}
        />

        <div
          className="absolute cursor-move touch-none border-2 border-indigo-400"
          style={{ left: selLeft, top: selTop, width: selWidth, height: selHeight }}
          onPointerDown={startDrag('move')}
        >
          {isElliptical(shape) && <EllipseDimOverlay width={selWidth} height={selHeight} />}
        </div>

        <Handle style={{ left: selLeft + selWidth, top: selTop + selHeight }} onPointerDown={startDrag('resize')} />
      </div>

      {/* Positioned against the App.tsx viewport wrapper (the nearest ancestor with `position`
          set), same trick as GridPanel's flip button and ZoomControls - stays pinned to the
          corner regardless of how far the image is scrolled or zoomed inside this panel. */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900/90 px-1 py-1 shadow-lg">
        <button
          type="button"
          onClick={zoomOut}
          title={t('zoomControls.zoomOut')}
          className="flex h-7 w-7 items-center justify-center rounded text-base text-neutral-200 hover:bg-neutral-800"
        >
          −
        </button>
        <button
          type="button"
          onClick={zoomReset}
          title={t('zoomControls.resetZoom')}
          className="w-14 rounded py-1 text-center text-xs text-neutral-400 hover:bg-neutral-800"
        >
          {Math.round(zoomFactor * 100)}%
        </button>
        <button
          type="button"
          onClick={zoomIn}
          title={t('zoomControls.zoomIn')}
          className="flex h-7 w-7 items-center justify-center rounded text-base text-neutral-200 hover:bg-neutral-800"
        >
          +
        </button>
      </div>
    </div>
  )
}

/** Additionally dims the selection rectangle's own corners when the crop shape is a circle or
 * oval, so what will actually survive the crop (the inscribed ellipse) is visually obvious. */
function EllipseDimOverlay({ width, height }: { width: number; height: number }) {
  const cx = width / 2
  const rx = width / 2
  const ry = height / 2
  return (
    <svg className="pointer-events-none absolute inset-0" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={`M0 0H${width}V${height}H0Z M${cx} 0A${rx} ${ry} 0 1 0 ${cx} ${height}A${rx} ${ry} 0 1 0 ${cx} 0Z`}
        fillRule="evenodd"
        fill="rgba(0,0,0,0.55)"
      />
    </svg>
  )
}

function Handle({ style, onPointerDown }: { style: CSSProperties; onPointerDown: (e: ReactPointerEvent) => void }) {
  return (
    <div
      className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize touch-none rounded-full border-2 border-neutral-900 bg-indigo-500 shadow"
      style={style}
      onPointerDown={onPointerDown}
    />
  )
}
