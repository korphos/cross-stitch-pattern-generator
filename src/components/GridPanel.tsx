import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CSSProperties,
  Dispatch,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { FlipHorizontal, Move, Ruler, Crosshair } from 'lucide-react'
import type { PatternProject, DetectedGrid } from '../lib/types'
import type { ProjectAction } from '../lib/projectReducer'
import { applyGridFieldPatch } from '../lib/gridGeometry'
import { confirmDestructiveEdit } from '../lib/confirmDestructive'

interface Props {
  project: PatternProject
  dispatch: Dispatch<ProjectAction>
  onFlipHorizontal: () => void
  /** Bumped by GridControls' wizard button to (re)start the guided setup - the value itself is
   * never read, only watched for changes, since this component owns the wizard's actual state. */
  wizardTrigger: number
}

const MAX_DISPLAY_DIMENSION = 720
// A source image smaller than this in both dimensions (e.g. an already-pixelated 20x20 sprite)
// gets scaled UP to at least this size instead of rendering at its tiny native size - otherwise
// the resize handles land a few pixels apart and dragging becomes unusable.
const MIN_DISPLAY_DIMENSION = 480
const MIN_ZOOM = 1
const MAX_ZOOM = 8
const ZOOM_STEP_FACTOR = 1.25

// Image-space px of mouse travel from center to one edge of the sample point's +/- half-cell
// range (so a full edge-to-edge sweep takes twice this). Lower = more sensitive.
const SAMPLE_DRAG_TRAVEL_PX = 45

/** Shrinks a large image down to fit, or grows a small one up to stay usably draggable - never
 * both, since the two triggers can't apply to the same image at once. */
function computeDisplayScale(width: number, height: number): number {
  const largest = Math.max(width, height)
  if (largest > MAX_DISPLAY_DIMENSION) return MAX_DISPLAY_DIMENSION / largest
  const smallest = Math.min(width, height)
  if (smallest < MIN_DISPLAY_DIMENSION) return MIN_DISPLAY_DIMENSION / smallest
  return 1
}

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

type DragMode = 'tl' | 'br' | 'move' | 'sample'
type GridMode = 'adjust' | 'calibrate' | 'sample'
// Mirrors the three modes in the order the guided setup walks them: cell size first (everything
// else is measured in stitches), then position, then the optional sample-point nudge.
type WizardStep = 0 | 1 | 2
const WIZARD_STEP_MODE: Record<WizardStep, GridMode> = { 0: 'calibrate', 1: 'adjust', 2: 'sample' }
// Zoom level the wizard jumps to on step 1 - zoomed out, individual stitches are too small to
// click a precise calibration point on.
const WIZARD_ZOOM = 2.5

interface ImagePoint {
  x: number
  y: number
}

export function GridPanel({ project, dispatch, onFlipHorizontal, wizardTrigger }: Props) {
  const { t } = useTranslation()
  const grid = project.confirmedGrid!
  const imageData = project.imageData!

  const [mode, setModeState] = useState<GridMode>('adjust')
  const [zoomFactor, setZoomFactor] = useState(1)
  const baseScale = computeDisplayScale(imageData.width, imageData.height)
  const scale = baseScale * zoomFactor
  const displayWidth = imageData.width * scale
  const displayHeight = imageData.height * scale

  // Zoom (and any pending calibration click) resets whenever the underlying image changes (new
  // upload, flip, or a crop was just applied) - a zoom level or half-placed calibration point
  // chosen for the previous image rarely still makes sense for the new one.
  const imageDataUrlRef = useRef(project.imageDataUrl)
  if (imageDataUrlRef.current !== project.imageDataUrl) {
    imageDataUrlRef.current = project.imageDataUrl
    if (zoomFactor !== 1) setZoomFactor(1)
  }

  // While dragging, the grid overlay/handles follow the cursor from local state alone - the
  // expensive part (re-sampling every cell's color and rebuilding the palette, in UPDATE_GRID)
  // only happens once, on pointerup, instead of on every pointermove tick (which was laggy).
  const [previewGrid, setPreviewGrid] = useState<DetectedGrid | null>(null)
  const displayGrid = previewGrid ?? grid
  const latestGridRef = useRef<DetectedGrid | null>(null)

  // Calibrate mode: two clicks exactly one stitch apart set the cell size directly.
  const [calibrationPoint, setCalibrationPoint] = useState<ImagePoint | null>(null)
  const [cursorPoint, setCursorPoint] = useState<ImagePoint | null>(null)
  // True right after a wizard calibration commits, until the user starts a new attempt or moves
  // on - lets the grid (hidden while actively aiming) reappear so they can judge the result before
  // deciding to retry or continue.
  const [justCalibrated, setJustCalibrated] = useState(false)

  // Guided setup: null when not running, otherwise which of the 3 steps is active. Walks the
  // same three modes above in order, just with instructions and Back/Next controls instead of
  // requiring the toolbar buttons.
  const [wizardStep, setWizardStep] = useState<WizardStep | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const centerPendingRef = useRef(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ mode: DragMode; startGrid: DetectedGrid; startX: number; startY: number } | null>(null)
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const imageSizeRef = useRef({ width: imageData.width, height: imageData.height })
  imageSizeRef.current = { width: imageData.width, height: imageData.height }
  const gridRef = useRef(grid)
  gridRef.current = grid
  const modeRef = useRef(mode)
  modeRef.current = mode
  // Read via a ref (not closed over directly): `updateGrid` is created once and reused across
  // every drag gesture, so it must see the live count at pointerup time, not the one from
  // whenever this render happened to run.
  const unsavedEditCountRef = useRef(project.history.past.length)
  unsavedEditCountRef.current = project.history.past.length

  const updateGrid = useCallback(
    (next: DetectedGrid) => {
      if (!confirmDestructiveEdit(unsavedEditCountRef.current)) return
      dispatch({ type: 'UPDATE_GRID', grid: next })
    },
    [dispatch],
  )

  const switchMode = useCallback((next: GridMode) => {
    setModeState(next)
    setCalibrationPoint(null)
    setCursorPoint(null)
    setJustCalibrated(false)
  }, [])

  const zoomAndCenter = useCallback((factor: number) => {
    setZoomFactor(clampZoom(factor))
    centerPendingRef.current = true
  }, [])

  // Runs once the DOM has settled after a zoomAndCenter call (scrollWidth/clientWidth need the
  // new size already committed), not inside the click handler itself.
  useEffect(() => {
    if (!centerPendingRef.current) return
    centerPendingRef.current = false
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2
  }, [zoomFactor])

  const startWizard = useCallback(() => {
    setWizardStep(0)
    switchMode(WIZARD_STEP_MODE[0])
    zoomAndCenter(WIZARD_ZOOM)
  }, [switchMode, zoomAndCenter])

  function goToWizardStep(step: WizardStep) {
    setWizardStep(step)
    switchMode(WIZARD_STEP_MODE[step])
  }

  function wizardNext() {
    if (wizardStep === null) return
    if (wizardStep === 2) {
      setWizardStep(null)
      switchMode('adjust')
      setZoomFactor(1)
      return
    }
    goToWizardStep((wizardStep + 1) as WizardStep)
  }

  function wizardBack() {
    if (wizardStep === null || wizardStep === 0) return
    goToWizardStep((wizardStep - 1) as WizardStep)
  }

  function exitWizard() {
    setWizardStep(null)
    setZoomFactor(1)
  }

  // (Re)starts the wizard whenever GridControls' button bumps this - the initial value (0) must
  // not itself trigger a start, only later changes to it.
  const wizardTriggerRef = useRef(wizardTrigger)
  useEffect(() => {
    if (wizardTrigger === wizardTriggerRef.current) return
    wizardTriggerRef.current = wizardTrigger
    startWizard()
  }, [wizardTrigger, startWizard])

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current
      const container = containerRef.current
      if (!drag || !container) return
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / scaleRef.current
      const y = (e.clientY - rect.top) / scaleRef.current
      const start = drag.startGrid
      const { width: imgW, height: imgH } = imageSizeRef.current

      let next: DetectedGrid
      if (drag.mode === 'move') {
        // Not clamped to keep the grid inside the image - if cols/rows already nearly fill the
        // image (e.g. right after a calibration that re-fit them), that clamp left almost no
        // room to actually drag. Instead, cols/rows are re-fit live from the new origin out to
        // the image's far edge on every tick, same as calibration does on commit - the grid
        // keeps covering the image without overflowing it, but the origin itself is free to go
        // anywhere, including past an edge.
        const newX = start.bbox.x + (x - drag.startX)
        const newY = start.bbox.y + (y - drag.startY)
        const cols = Math.max(1, Math.round((imgW - newX) / start.cellSize))
        const rows = Math.max(1, Math.round((imgH - newY) / start.cellSize))
        next = {
          ...start,
          bbox: { x: newX, y: newY, width: cols * start.cellSize, height: rows * start.cellSize },
          cols,
          rows,
        }
      } else if (drag.mode === 'tl') {
        // Resize handles: stitches must stay square, so a single cellSize is derived from
        // both axes of the drag (averaged) rather than letting width/height scale independently.
        const brX = start.bbox.x + start.bbox.width
        const brY = start.bbox.y + start.bbox.height
        const newX = Math.max(0, Math.min(x, brX - start.cellSize))
        const newY = Math.max(0, Math.min(y, brY - start.cellSize))
        const desiredWidth = brX - newX
        const desiredHeight = brY - newY
        const maxCellSize = Math.min(brX / start.cols, brY / start.rows)
        const cellSize = Math.min((desiredWidth / start.cols + desiredHeight / start.rows) / 2, maxCellSize)
        const width = start.cols * cellSize
        const height = start.rows * cellSize
        next = { ...start, bbox: { x: brX - width, y: brY - height, width, height }, cellSize }
      } else if (drag.mode === 'br') {
        // Keep the grid from being dragged past the image edge - cells
        // beyond it would sample garbage (see cellSampling.ts's clamping
        // for the rest of that defense).
        const maxWidth = imgW - start.bbox.x
        const maxHeight = imgH - start.bbox.y
        const desiredWidth = Math.max(start.cellSize, x - start.bbox.x)
        const desiredHeight = Math.max(start.cellSize, y - start.bbox.y)
        const maxCellSize = Math.min(maxWidth / start.cols, maxHeight / start.rows)
        const cellSize = Math.min((desiredWidth / start.cols + desiredHeight / start.rows) / 2, maxCellSize)
        const width = start.cols * cellSize
        const height = start.rows * cellSize
        next = { ...start, bbox: { ...start.bbox, width, height }, cellSize }
      } else {
        // Sample point: relative to the drag's start, not the cursor's absolute position - the
        // usable range (+/- half a cell) is tiny next to the cell itself, so 1:1 absolute
        // tracking let a barely-perceptible mouse move cover the whole range. Sensitivity scales
        // with cell size so a full sweep from one edge of the range to the other always takes
        // roughly the same physical mouse travel, whether the cell is a handful of source pixels
        // or a large one - zooming the panel in is what gives precision, not raw cursor speed.
        const maxOffset = start.cellSize / 2
        const sensitivity = maxOffset / SAMPLE_DRAG_TRAVEL_PX
        const dx = (x - drag.startX) * sensitivity
        const dy = (y - drag.startY) * sensitivity
        const sampleOffsetX = Math.max(-maxOffset, Math.min(maxOffset, (start.sampleOffsetX ?? 0) + dx))
        const sampleOffsetY = Math.max(-maxOffset, Math.min(maxOffset, (start.sampleOffsetY ?? 0) + dy))
        next = { ...start, sampleOffsetX, sampleOffsetY }
      }
      latestGridRef.current = next
      setPreviewGrid(next)
    },
    [],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    const finalGrid = latestGridRef.current
    latestGridRef.current = null
    setPreviewGrid(null)
    if (finalGrid) updateGrid(finalGrid)
  }, [handlePointerMove, updateGrid])

  const startDrag = useCallback(
    (mode: DragMode) => (e: ReactPointerEvent) => {
      // Left button only - the middle button pans the viewport instead (see startMiddleClickPan).
      if (e.button !== 0) return
      e.preventDefault()
      // Handles are nested inside the move-draggable container - stop the move drag from
      // also starting underneath a resize drag.
      e.stopPropagation()
      const container = containerRef.current
      const rect = container?.getBoundingClientRect()
      const x = rect ? (e.clientX - rect.left) / scaleRef.current : 0
      const y = rect ? (e.clientY - rect.top) / scaleRef.current : 0
      dragRef.current = { mode, startGrid: grid, startX: x, startY: y }
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    },
    [grid, handlePointerMove, handlePointerUp],
  )

  // Committing a wheel-driven cols/rows change re-samples every cell and rebuilds the palette,
  // same as a drag - but unlike a drag (which has a clear pointerup to commit on), a wheel
  // gesture is a stream of many small events with no discrete end. Doing that full rebuild on
  // every single tick is what made it feel laggy. Instead: update the (cheap) preview instantly
  // on every tick, same as a drag, and debounce the actual commit until the gesture pauses.
  const wheelCommitTimerRef = useRef<number | null>(null)
  const scheduleWheelCommit = useCallback(
    (next: DetectedGrid) => {
      latestGridRef.current = next
      setPreviewGrid(next)
      if (wheelCommitTimerRef.current !== null) window.clearTimeout(wheelCommitTimerRef.current)
      wheelCommitTimerRef.current = window.setTimeout(() => {
        wheelCommitTimerRef.current = null
        const finalGrid = latestGridRef.current
        latestGridRef.current = null
        setPreviewGrid(null)
        if (finalGrid) updateGrid(finalGrid)
      }, 180)
    },
    [updateGrid],
  )
  useEffect(() => {
    return () => {
      if (wheelCommitTimerRef.current !== null) window.clearTimeout(wheelCommitTimerRef.current)
    }
  }, [])

  // Ctrl/Cmd+scroll (and trackpad pinch) zooms the viewport - same trick as the crop panel. In
  // 'adjust' mode, Shift+scroll nudges the column count and Alt+scroll the row count, so the grid
  // can be sized without touching the number fields. A native listener is required since React's
  // onWheel is passive.
  const attachWheelHandlers = useCallback(
    (el: HTMLDivElement | null) => {
      scrollContainerRef.current = el
      if (!el) return
      function onWheel(e: globalThis.WheelEvent) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          setZoomFactor((z) => clampZoom(e.deltaY < 0 ? z * ZOOM_STEP_FACTOR : z / ZOOM_STEP_FACTOR))
          return
        }
        if (modeRef.current !== 'adjust') return
        if (!e.shiftKey && !e.altKey) return
        // Many browsers swap wheel axes when Shift is held (vertical wheel motion arrives as
        // deltaX instead of deltaY) - Alt doesn't have this quirk.
        const delta = e.shiftKey ? e.deltaX || e.deltaY : e.deltaY
        if (delta === 0) return
        e.preventDefault()
        const field = e.shiftKey ? 'cols' : 'rows'
        // Continue from the last not-yet-committed preview, not the last dispatched grid -
        // otherwise rapid ticks within one debounce window would all step from the same stale
        // starting count instead of accumulating.
        const base = latestGridRef.current ?? gridRef.current
        const value = Math.max(1, base[field] + (delta < 0 ? 1 : -1))
        const next = applyGridFieldPatch(base, imageSizeRef.current.width, imageSizeRef.current.height, {
          [field]: value,
        })
        if (next) scheduleWheelCommit(next)
      }
      el.addEventListener('wheel', onWheel, { passive: false })
      return () => el.removeEventListener('wheel', onWheel)
    },
    [scheduleWheelCommit],
  )

  // Escape cancels a pending first calibration click.
  useEffect(() => {
    if (mode !== 'calibrate') return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setCalibrationPoint(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode])

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

  function imagePointFromEvent(e: ReactPointerEvent | ReactMouseEvent): ImagePoint | null {
    const container = containerRef.current
    if (!container) return null
    const rect = container.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min((e.clientX - rect.left) / scale, imageData.width)),
      y: Math.max(0, Math.min((e.clientY - rect.top) / scale, imageData.height)),
    }
  }

  // Snaps a candidate second calibration point onto a perfect 45deg diagonal from the first -
  // whichever of the two diagonals (down-right/up-left vs down-left/up-right) the raw cursor is
  // nearer to. Two adjacent stitches are square, so their diagonal is exactly 45deg; forcing it
  // removes the measurement error a slightly-off-diagonal click would otherwise bake into the
  // resulting cell size.
  function snapToDiagonal(a: ImagePoint, raw: ImagePoint): ImagePoint {
    const dx = raw.x - a.x
    const dy = raw.y - a.y
    const mag = (Math.abs(dx) + Math.abs(dy)) / 2
    const sx = dx < 0 ? -1 : 1
    const sy = dy < 0 ? -1 : 1
    return { x: a.x + sx * mag, y: a.y + sy * mag }
  }

  // Tracks the cursor while calibrating, for the live diagonal guide line - once a first
  // calibration point is placed, the tracked point is snapped to the diagonal from it, so the
  // guide line and the eventual click agree on where it'll actually land.
  function handleHoverMove(e: ReactPointerEvent) {
    const point = imagePointFromEvent(e)
    if (point && calibrationPoint) {
      setCursorPoint(snapToDiagonal(calibrationPoint, point))
    } else {
      setCursorPoint(point)
    }
  }

  function handleCalibrateClick(e: ReactMouseEvent) {
    const raw = imagePointFromEvent(e)
    if (!raw) return
    if (!calibrationPoint) {
      setCalibrationPoint(raw)
      // Starting a fresh attempt (including a retry after reviewing a previous one) - hide the
      // grid again while aiming.
      setJustCalibrated(false)
      return
    }
    const point = snapToDiagonal(calibrationPoint, raw)
    const distance = Math.hypot(point.x - calibrationPoint.x, point.y - calibrationPoint.y)
    setCalibrationPoint(null)
    // Too close together to be a deliberate second point - keep waiting instead of committing a
    // near-zero cell size.
    if (distance < 2) return
    // The two points can be anywhere on the image (any pair of adjacent stitches, not necessarily
    // the grid's own corner), so the existing offset is left untouched rather than jumping to the
    // first click. But cols/rows are re-fit to the (new) cell size from that same offset out to
    // the image's far edge - otherwise a much smaller/larger cell size would leave the old
    // cols/rows extending well past the image, or short of it, instead of the grid re-covering it.
    const cols = Math.max(1, Math.round((imageData.width - grid.bbox.x) / distance))
    const rows = Math.max(1, Math.round((imageData.height - grid.bbox.y) / distance))
    const next = applyGridFieldPatch(grid, imageData.width, imageData.height, { cellSize: distance, cols, rows })
    if (next) updateGrid(next)
    // Mid-wizard, stays in calibrate mode instead of auto-advancing - calibration is exploratory
    // and the first attempt often isn't the one the user wants to keep, so only the explicit
    // "Next" button moves the wizard on. The grid reappears (see justCalibrated) so the result can
    // actually be judged before deciding to retry or continue. Outside the wizard, a calibration
    // is still a single-shot gesture that returns to the plain adjust mode right away.
    if (wizardStep === null) {
      switchMode('adjust')
    } else {
      setJustCalibrated(true)
    }
  }

  function retryCalibration() {
    setJustCalibrated(false)
  }

  const cursorClass =
    mode === 'adjust'
      ? 'cursor-grab active:cursor-grabbing'
      : mode === 'calibrate'
        ? 'cursor-crosshair'
        : 'cursor-crosshair active:cursor-grabbing'

  return (
    <div ref={attachWheelHandlers} className="flex h-full overflow-auto p-8" onPointerDown={startMiddleClickPan}>
      <div
        ref={containerRef}
        className={`relative m-auto shrink-0 touch-none select-none border border-neutral-700 bg-[repeating-conic-gradient(#3f3f46_0%_25%,#27272a_0%_50%)] bg-size-[16px_16px] shadow-lg ${cursorClass}`}
        style={{ width: displayWidth, height: displayHeight }}
        onPointerDown={mode === 'adjust' ? startDrag('move') : mode === 'sample' ? startDrag('sample') : undefined}
        onClick={mode === 'calibrate' ? handleCalibrateClick : undefined}
        onPointerMove={mode === 'calibrate' ? handleHoverMove : undefined}
        onPointerLeave={mode === 'calibrate' ? () => setCursorPoint(null) : undefined}
      >
        <img
          src={project.imageDataUrl!}
          alt={t('gridPanel.imageAlt')}
          className="pointer-events-none absolute inset-0 h-full w-full"
          // Scaling a tiny source image up would otherwise blur it via the browser's default
          // smoothing, hiding exactly the per-pixel detail this view exists to line a grid up
          // against - nearest-neighbor keeps it crisp instead.
          style={scale > 1 ? { imageRendering: 'pixelated' } : undefined}
          draggable={false}
        />
        {/* Hidden while actively aiming a calibration click - the grid lines and sample-point
            crosshairs clutter exactly the pixel-level detail it needs to land on precisely. Shown
            again right after a wizard calibration commits (justCalibrated) so the result can be
            reviewed before retrying or moving on. */}
        {(mode !== 'calibrate' || justCalibrated) && (
          <>
            <GridOverlay grid={displayGrid} scale={scale} />
            <SamplePointsOverlay grid={displayGrid} scale={scale} />
          </>
        )}

        {mode === 'adjust' && (
          <>
            <Handle
              style={{ left: displayGrid.bbox.x * scale, top: displayGrid.bbox.y * scale }}
              onPointerDown={startDrag('tl')}
            />
            <Handle
              style={{
                left: (displayGrid.bbox.x + displayGrid.bbox.width) * scale,
                top: (displayGrid.bbox.y + displayGrid.bbox.height) * scale,
              }}
              onPointerDown={startDrag('br')}
            />
          </>
        )}

        {mode === 'calibrate' && calibrationPoint && (
          <>
            <div
              className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500"
              style={{ left: calibrationPoint.x * scale, top: calibrationPoint.y * scale }}
            />
            {cursorPoint && (
              <svg className="pointer-events-none absolute inset-0" width={displayWidth} height={displayHeight}>
                <line
                  x1={calibrationPoint.x * scale}
                  y1={calibrationPoint.y * scale}
                  x2={cursorPoint.x * scale}
                  y2={cursorPoint.y * scale}
                  stroke="#ec4899"
                  strokeWidth={1}
                />
              </svg>
            )}
          </>
        )}

        {wizardStep === null && mode === 'calibrate' && (
          <div className="pointer-events-none absolute top-2 left-2 z-10 rounded-md bg-neutral-900/90 px-2 py-1 text-xs text-neutral-200 shadow">
            {calibrationPoint
              ? t('gridControls.calibrateHintStep2')
              : t('gridControls.calibrateHintStep1')}
          </div>
        )}

        {wizardStep === null && mode === 'sample' && (
          <div className="pointer-events-none absolute top-2 left-2 z-10 rounded-md bg-neutral-900/90 px-2 py-1 text-xs text-neutral-200 shadow">
            {t('gridControls.sampleHint')}
          </div>
        )}

      </div>

      {/* Anchored to the viewport, not the image (unlike the plain per-mode hints above) - the
          wizard auto-zooms and centers on step 1, which can easily scroll the image's own top-left
          corner (where those hints sit) out of view entirely. */}
      {wizardStep !== null && (
        <div className="absolute top-4 left-4 z-20 flex w-72 flex-col gap-2 rounded-md border border-indigo-500/50 bg-neutral-900/95 p-3 text-neutral-200 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold text-neutral-100">
              {t('gridControls.wizardStepCount', { step: wizardStep + 1 })}
            </span>
            <button
              type="button"
              onClick={exitWizard}
              title={t('gridControls.wizardExit')}
              className="shrink-0 text-neutral-400 hover:text-neutral-200"
            >
              ✕
            </button>
          </div>
          {/* Explains what this step is for, not just what to click - step 1 in particular does
              nothing self-evident: two clicks setting a "cell size" needs the why (it's the scale
              for the whole grid) spelled out, not just the mechanical steps. Step 1 has 3 distinct
              texts for its 3 sub-states (aiming point 1, aiming point 2, reviewing the result) -
              cramming them into one static sentence left it unclear what to do once the two clicks
              were done. */}
          <p className="text-xs text-neutral-300">
            {wizardStep === 0
              ? justCalibrated
                ? t('gridControls.wizardStep1Review')
                : calibrationPoint
                  ? t('gridControls.wizardStep1Point2')
                  : t('gridControls.wizardStep1Point1')
              : wizardStep === 1
                ? t('gridControls.wizardStep2Hint')
                : t('gridControls.wizardStep3Hint')}
          </p>
          <div className="flex justify-end gap-2 pt-1">
            {wizardStep === 0 && justCalibrated && (
              <button
                type="button"
                onClick={retryCalibration}
                className="rounded-md border border-neutral-600 px-2 py-1 text-xs text-neutral-100 hover:bg-neutral-800"
              >
                {t('gridControls.wizardRetry')}
              </button>
            )}
            {wizardStep > 0 && (
              <button
                type="button"
                onClick={wizardBack}
                className="rounded-md border border-neutral-600 px-2 py-1 text-xs text-neutral-100 hover:bg-neutral-800"
              >
                {t('gridControls.wizardBack')}
              </button>
            )}
            <button
              type="button"
              onClick={wizardNext}
              className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500"
            >
              {wizardStep === 2 ? t('gridControls.wizardFinish') : t('gridControls.wizardNext')}
            </button>
          </div>
        </div>
      )}

      {/* Positioned against the nearest ancestor that actually sets `position` - the shared
          relative wrapper in App.tsx around this whole viewport pane (same trick ZoomControls
          uses in the palette tab) - so it stays fixed in the corner regardless of how far the
          image itself is scrolled or zoomed inside this panel's own overflow-auto container. */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900/90 px-1 py-1 shadow-lg">
        <ModeButton
          active={mode === 'adjust'}
          disabled={wizardStep !== null}
          title={t('gridControls.modeAdjust')}
          onClick={() => switchMode('adjust')}
        >
          <Move className="h-4 w-4" />
        </ModeButton>
        <ModeButton
          active={mode === 'calibrate'}
          disabled={wizardStep !== null}
          title={t('gridControls.modeCalibrate')}
          onClick={() => switchMode('calibrate')}
        >
          <Ruler className="h-4 w-4" />
        </ModeButton>
        <ModeButton
          active={mode === 'sample'}
          disabled={wizardStep !== null}
          title={t('gridControls.modeSample')}
          onClick={() => switchMode('sample')}
        >
          <Crosshair className="h-4 w-4" />
        </ModeButton>
        <div className="mx-0.5 h-5 w-px bg-neutral-700" />
        <button
          type="button"
          onClick={onFlipHorizontal}
          title={t('gridControls.flipHorizontal')}
          className="flex h-7 w-7 items-center justify-center rounded text-neutral-200 hover:bg-neutral-800"
        >
          <FlipHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900/90 px-1 py-1 shadow-lg">
        <button
          type="button"
          onClick={() => setZoomFactor((z) => clampZoom(z / ZOOM_STEP_FACTOR))}
          title={t('zoomControls.zoomOut')}
          className="flex h-7 w-7 items-center justify-center rounded text-base text-neutral-200 hover:bg-neutral-800"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setZoomFactor(1)}
          title={t('zoomControls.resetZoom')}
          className="w-14 rounded py-1 text-center text-xs text-neutral-400 hover:bg-neutral-800"
        >
          {Math.round(zoomFactor * 100)}%
        </button>
        <button
          type="button"
          onClick={() => setZoomFactor((z) => clampZoom(z * ZOOM_STEP_FACTOR))}
          title={t('zoomControls.zoomIn')}
          className="flex h-7 w-7 items-center justify-center rounded text-base text-neutral-200 hover:bg-neutral-800"
        >
          +
        </button>
      </div>
    </div>
  )
}

function ModeButton({
  active,
  disabled = false,
  title,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  title: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`flex h-7 w-7 items-center justify-center rounded disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-indigo-600 text-white' : 'text-neutral-200 hover:bg-neutral-800'
      }`}
    >
      {children}
    </button>
  )
}

function GridOverlay({ grid, scale }: { grid: DetectedGrid; scale: number }) {
  const lines = []
  for (let c = 0; c <= grid.cols; c++) {
    lines.push(
      <div
        key={`v${c}`}
        className="absolute w-px bg-red-500/70"
        style={{
          left: (grid.bbox.x + c * grid.cellSize) * scale,
          top: grid.bbox.y * scale,
          height: grid.bbox.height * scale,
        }}
      />,
    )
  }
  for (let r = 0; r <= grid.rows; r++) {
    lines.push(
      <div
        key={`h${r}`}
        className="absolute h-px bg-red-500/70"
        style={{
          top: (grid.bbox.y + r * grid.cellSize) * scale,
          left: grid.bbox.x * scale,
          width: grid.bbox.width * scale,
        }}
      />,
    )
  }
  return <>{lines}</>
}

/**
 * One small crosshair per cell showing exactly where its color is actually sampled from (see
 * DetectedGrid.sampleOffsetX/Y) - a filled dot reads as a fuzzy blob with no clear "this exact
 * point", whereas two thin lines crossing have an unambiguous center. A single tiled SVG
 * background instead of one DOM node per cell, so it stays cheap even on a large grid.
 */
function SamplePointsOverlay({ grid, scale }: { grid: DetectedGrid; scale: number }) {
  const cellPx = grid.cellSize * scale
  const offsetXPx = (grid.sampleOffsetX ?? 0) * scale
  const offsetYPx = (grid.sampleOffsetY ?? 0) * scale
  const half = cellPx / 2
  const arm = Math.min(cellPx * 0.28, 5)
  // Cyan, not the pink used for calibration - it needs to read as clearly different from both the
  // red grid lines and the calibrate-mode markers, since all three can be on screen at once.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cellPx}" height="${cellPx}">` +
    `<line x1="${half - arm}" y1="${half}" x2="${half + arm}" y2="${half}" stroke="#22d3ee" stroke-width="1" />` +
    `<line x1="${half}" y1="${half - arm}" x2="${half}" y2="${half + arm}" stroke="#22d3ee" stroke-width="1" />` +
    `</svg>`
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: grid.bbox.x * scale,
        top: grid.bbox.y * scale,
        width: grid.bbox.width * scale,
        height: grid.bbox.height * scale,
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundSize: `${cellPx}px ${cellPx}px`,
        // The SVG tile already draws its crosshair at its own center, so the tile grid lands
        // each mark at its cell's center with no offset - only the extra sampleOffsetX/Y shift
        // needs to be added here (not another +cellPx/2, which would shift the whole tile grid
        // by half a cell and misalign every mark from its square).
        backgroundPosition: `${offsetXPx}px ${offsetYPx}px`,
      }}
    />
  )
}

function Handle({
  style,
  onPointerDown,
  className = 'bg-indigo-500',
  cursorClassName = 'cursor-nwse-resize',
}: {
  style: CSSProperties
  onPointerDown: (e: ReactPointerEvent) => void
  className?: string
  cursorClassName?: string
}) {
  return (
    <div
      className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-neutral-900 shadow ${cursorClassName} ${className}`}
      style={style}
      onPointerDown={onPointerDown}
    />
  )
}
