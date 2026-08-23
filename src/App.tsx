import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { initialProject, projectReducer } from './lib/projectReducer'
import { detectGrid, detectBackgroundColor } from './lib/gridDetection'
import {
  loadImageFile,
  decodeDataUrlToImageData,
  encodeImageDataToDataUrl,
  IMAGE_DECODE_ERROR,
  CANVAS_UNAVAILABLE_ERROR,
} from './lib/imageLoader'
import { flipImageHorizontal, cropImageToSquare, maskOutsideCircle } from './lib/imageTransform'
import { loadPersistedProject, savePersistedProject, loadSettings, saveSettings, DEFAULT_SETTINGS } from './lib/persistence'
import type { PersistedProject } from './lib/persistence'
import {
  serializeProjectFile,
  parseProjectFile,
  PROJECT_FILE_EXTENSION,
  INVALID_JSON_ERROR,
  INVALID_PROJECT_FILE_ERROR,
  MISSING_PROJECT_DATA_ERROR,
} from './lib/projectFile'
import { decodeSettings, SETTINGS_SHARE_PARAM } from './lib/settingsShare'
import { confirmDestructiveEdit } from './lib/confirmDestructive'
import type { SizeUnit } from './lib/physicalSize'
import type { PrintMode } from './lib/printLayout'
import type { PrintColorMode } from './lib/renderPattern'
import type { SymbolStyle } from './lib/types'
import { AppHeader } from './components/AppHeader'
import { TabBar } from './components/TabBar'
import { UploadDropzone } from './components/UploadDropzone'
import { GridPanel } from './components/GridPanel'
import { GridControls } from './components/GridControls'
import { CropPanel } from './components/CropPanel'
import type { CropSelection } from './components/CropPanel'
import { CropControls } from './components/CropControls'
import { PatternCanvas } from './components/PatternCanvas'
import { PalettePanel } from './components/PalettePanel'
import { DmcColorList } from './components/DmcColorList'
import { CellEditPopover } from './components/CellEditPopover'
import { ColorEditDialog } from './components/ColorEditDialog'
import { EyedropperDialog } from './components/EyedropperDialog'
import { ZoomControls } from './components/ZoomControls'
import { SettingsPage } from './components/SettingsPage'
import { PrintablePage } from './components/PrintablePage'

const DEFAULT_CELL_PX = 24
const MIN_CELL_PX = 6
const MAX_CELL_PX = 64
const ZOOM_STEP = 4

function clampCellPx(value: number): number {
  return Math.min(MAX_CELL_PX, Math.max(MIN_CELL_PX, value))
}

const ERROR_CODE_KEYS: Record<string, string> = {
  [IMAGE_DECODE_ERROR]: 'errors.imageDecodeFailed',
  [CANVAS_UNAVAILABLE_ERROR]: 'errors.canvasUnavailable',
  [INVALID_JSON_ERROR]: 'errors.invalidJson',
  [INVALID_PROJECT_FILE_ERROR]: 'errors.invalidProjectFile',
  [MISSING_PROJECT_DATA_ERROR]: 'errors.missingProjectData',
}

function App() {
  const { t } = useTranslation()
  const [project, dispatch] = useReducer(projectReducer, initialProject)
  const [isUploading, setIsUploading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [sourceFileName, setSourceFileName] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)
  const [selectedCellIndices, setSelectedCellIndices] = useState<number[]>([])
  // The last plain-clicked cell, i.e. one corner of a pending Shift+click range selection.
  const [rangeAnchor, setRangeAnchor] = useState<number | null>(null)
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [showEyedropper, setShowEyedropper] = useState(false)
  const [cellPx, setCellPx] = useState(DEFAULT_CELL_PX)
  const [previewMode, setPreviewMode] = useState(false)
  const [view, setView] = useState<'workspace' | 'settings'>('workspace')
  const [sharedSettingsNotice, setSharedSettingsNotice] = useState(false)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const dragCounterRef = useRef(0)
  const [cropShapeChoice, setCropShapeChoice] = useState<'square' | 'circle'>('square')
  // Drag adjustments override the centered default below; cleared whenever the underlying image
  // itself changes (new upload, or a crop just applied), so the default re-centers on it.
  const [cropOverride, setCropOverride] = useState<CropSelection | null>(null)
  useEffect(() => setCropOverride(null), [project.imageData])
  const cropDefaultSelection = useMemo<CropSelection | null>(() => {
    if (!project.imageData) return null
    const { width, height } = project.imageData
    const size = Math.round(Math.min(width, height) * 0.96)
    return { x: Math.round((width - size) / 2), y: Math.round((height - size) / 2), size }
  }, [project.imageData])
  const cropSelection = cropOverride ?? cropDefaultSelection
  const [cropBannerDismissed, setCropBannerDismissed] = useState(false)
  useEffect(() => setCropBannerDismissed(false), [project.preCropSnapshot])

  // Lib functions throw stable error codes (see ERROR_CODE_KEYS) rather than prose, since they
  // have no access to `t()` - this maps a caught error back to a translated, user-facing message.
  const describeError = useCallback(
    (e: unknown, fallbackKey: string) => {
      const code = e instanceof Error ? ERROR_CODE_KEYS[e.message] : undefined
      return t(code ?? fallbackKey)
    },
    [t],
  )

  const zoomIn = useCallback(() => setCellPx((z) => clampCellPx(z + ZOOM_STEP)), [])
  const zoomOut = useCallback(() => setCellPx((z) => clampCellPx(z - ZOOM_STEP)), [])
  const zoomReset = useCallback(() => setCellPx(DEFAULT_CELL_PX), [])

  // Ctrl/Cmd+scroll (and trackpad pinch, which browsers report as a wheel
  // event with ctrlKey set) zooms the pattern canvas instead of scrolling.
  // React's onWheel prop is attached as a passive listener, so
  // preventDefault() inside it is silently ignored - a native listener
  // with { passive: false } is required to actually stop page/browser
  // zoom from also firing alongside our own zoom.
  const attachWheelZoom = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    function onWheel(e: globalThis.WheelEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      setCellPx((z) => clampCellPx(z - Math.sign(e.deltaY) * ZOOM_STEP))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Restore whatever was last worked on, so a page refresh doesn't lose
  // anything - image, form settings, manual color edits, AND the global
  // owned-threads inventory / size unit preference (which live in a
  // separate store since they're not tied to any one project).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [savedSettings, savedProject] = await Promise.all([loadSettings(), loadPersistedProject()])
        if (cancelled) return

        // A shared-settings link (see SettingsPage's "Copy share link")
        // completely replaces the local owned-threads/size-unit settings -
        // that's the whole point, syncing them to a new device. The URL is
        // then cleaned up so refreshing doesn't keep re-applying it.
        const sharedToken = new URLSearchParams(window.location.search).get(SETTINGS_SHARE_PARAM)
        const sharedSettings = sharedToken ? decodeSettings(sharedToken) : null
        const effectiveSettings = sharedSettings ?? savedSettings
        if (sharedSettings) {
          void saveSettings(sharedSettings)
          const url = new URL(window.location.href)
          url.searchParams.delete(SETTINGS_SHARE_PARAM)
          window.history.replaceState(null, '', url)
          setSharedSettingsNotice(true)
        }
        setSettings(effectiveSettings)

        if (savedProject) {
          const imageData = await decodeDataUrlToImageData(savedProject.imageDataUrl)
          if (cancelled) return
          setSourceFileName(savedProject.fileName)
          dispatch({
            type: 'RESTORE',
            imageData,
            imageDataUrl: savedProject.imageDataUrl,
            grid: savedProject.grid,
            clusterThreshold: savedProject.clusterThreshold,
            fabricCount: savedProject.fabricCount,
            strands: savedProject.strands,
            paletteMode: savedProject.paletteMode,
            ownedThreadCodes: effectiveSettings.ownedThreadCodes,
            symbolStyle: effectiveSettings.symbolStyle,
            backgroundColor: savedProject.backgroundColor ?? null,
            ignoreBackground: savedProject.ignoreBackground ?? false,
            cropShape: savedProject.cropShape ?? null,
            activeTab: savedProject.activeTab,
            palette: savedProject.palette,
            cellAssignment: savedProject.cellAssignment,
          })
        } else {
          if (effectiveSettings.ownedThreadCodes.length > 0) {
            dispatch({ type: 'SET_OWNED_THREADS', codes: effectiveSettings.ownedThreadCodes })
          }
          if (effectiveSettings.symbolStyle !== 'letters') {
            dispatch({ type: 'SET_SYMBOL_STYLE', style: effectiveSettings.symbolStyle })
          }
        }
      } catch {
        // no usable saved state (first visit, corrupted record, etc.) - start fresh
      } finally {
        if (!cancelled) setIsRestoring(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Persist on every change relevant to reconstructing the project
  // (including manual color edits), debounced so dragging a grid handle
  // doesn't hammer IndexedDB on every pointermove.
  useEffect(() => {
    if (!project.imageDataUrl || !project.confirmedGrid || !project.palette || !project.cellAssignment) return
    const grid = project.confirmedGrid
    const palette = project.palette
    const cellAssignment = project.cellAssignment
    const handle = setTimeout(() => {
      void savePersistedProject({
        imageDataUrl: project.imageDataUrl!,
        fileName: sourceFileName,
        grid,
        clusterThreshold: project.clusterThreshold,
        fabricCount: project.fabricCount,
        strands: project.strands,
        paletteMode: project.paletteMode,
        backgroundColor: project.backgroundColor,
        ignoreBackground: project.ignoreBackground,
        cropShape: project.cropShape,
        activeTab: project.activeTab,
        palette,
        cellAssignment,
      })
    }, 300)
    return () => clearTimeout(handle)
  }, [
    project.imageDataUrl,
    project.cropShape,
    project.confirmedGrid,
    project.clusterThreshold,
    project.fabricCount,
    project.strands,
    project.paletteMode,
    project.backgroundColor,
    project.ignoreBackground,
    project.activeTab,
    project.palette,
    project.cellAssignment,
    sourceFileName,
  ])

  const handleFile = useCallback(
    async (file: File) => {
      // Only a "replace image" (an image is already loaded) can discard manual edits - the
      // initial upload has nothing to lose yet.
      if (project.imageData && !confirmDestructiveEdit(project.history.past.length)) return
      setUploadError(null)
      setIsUploading(true)
      try {
        const { imageData, dataUrl } = await loadImageFile(file)
        const detectedGrid = detectGrid(imageData)
        const backgroundColor = detectBackgroundColor(imageData)
        setSourceFileName(file.name)
        dispatch({ type: 'IMAGE_LOADED', imageData, imageDataUrl: dataUrl, detectedGrid, backgroundColor })
      } catch (e) {
        setUploadError(describeError(e, 'errors.imageLoadGeneric'))
      } finally {
        setIsUploading(false)
      }
    },
    [project.imageData, project.history.past.length, describeError],
  )

  const handleFlipHorizontal = useCallback(() => {
    if (!project.imageData) return
    if (!confirmDestructiveEdit(project.history.past.length)) return
    const flipped = flipImageHorizontal(project.imageData)
    dispatch({ type: 'FLIP_IMAGE_HORIZONTAL', imageData: flipped, imageDataUrl: encodeImageDataToDataUrl(flipped) })
  }, [project.imageData, project.history.past.length])

  const handleApplyCrop = useCallback(() => {
    if (!project.imageData || !cropSelection) return
    if (!confirmDestructiveEdit(project.history.past.length)) return
    const { width, height } = project.imageData
    const size = Math.max(1, Math.round(cropSelection.size))
    const x = Math.min(Math.max(0, Math.round(cropSelection.x)), Math.max(0, width - size))
    const y = Math.min(Math.max(0, Math.round(cropSelection.y)), Math.max(0, height - size))
    let cropped = cropImageToSquare(project.imageData, x, y, size)
    if (cropShapeChoice === 'circle') cropped = maskOutsideCircle(cropped)
    const detectedGrid = detectGrid(cropped)
    const backgroundColor = detectBackgroundColor(cropped)
    dispatch({
      type: 'APPLY_CROP',
      imageData: cropped,
      imageDataUrl: encodeImageDataToDataUrl(cropped),
      detectedGrid,
      backgroundColor,
      cropShape: cropShapeChoice,
    })
  }, [project.imageData, project.history.past.length, cropSelection, cropShapeChoice])

  const handleUndoCrop = useCallback(() => dispatch({ type: 'UNDO_CROP' }), [])

  const handleExport = useCallback(() => {
    if (!project.imageDataUrl || !project.confirmedGrid || !project.palette || !project.cellAssignment) return
    const persisted: PersistedProject = {
      imageDataUrl: project.imageDataUrl,
      fileName: sourceFileName,
      grid: project.confirmedGrid,
      clusterThreshold: project.clusterThreshold,
      fabricCount: project.fabricCount,
      strands: project.strands,
      paletteMode: project.paletteMode,
      backgroundColor: project.backgroundColor,
      ignoreBackground: project.ignoreBackground,
      cropShape: project.cropShape,
      activeTab: project.activeTab,
      palette: project.palette,
      cellAssignment: project.cellAssignment,
    }
    const blob = new Blob([serializeProjectFile(persisted)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const base = sourceFileName ? sourceFileName.replace(/\.[^./\\]+$/, '') : 'cross-stitch-pattern'
    const a = document.createElement('a')
    a.href = url
    a.download = `${base}${PROJECT_FILE_EXTENSION}`
    a.click()
    URL.revokeObjectURL(url)
  }, [project, sourceFileName])

  const handleImportFile = useCallback(
    async (file: File) => {
      setUploadError(null)
      setIsImporting(true)
      try {
        const persisted = parseProjectFile(await file.text())
        const imageData = await decodeDataUrlToImageData(persisted.imageDataUrl)
        setSourceFileName(persisted.fileName)
        dispatch({
          type: 'RESTORE',
          imageData,
          imageDataUrl: persisted.imageDataUrl,
          grid: persisted.grid,
          clusterThreshold: persisted.clusterThreshold,
          fabricCount: persisted.fabricCount,
          strands: persisted.strands,
          paletteMode: persisted.paletteMode,
          ownedThreadCodes: project.ownedThreadCodes,
          symbolStyle: project.symbolStyle,
          backgroundColor: persisted.backgroundColor,
          ignoreBackground: persisted.ignoreBackground,
          cropShape: persisted.cropShape,
          activeTab: persisted.activeTab,
          palette: persisted.palette,
          cellAssignment: persisted.cellAssignment,
        })
      } catch (e) {
        setUploadError(describeError(e, 'errors.importGeneric'))
      } finally {
        setIsImporting(false)
      }
    },
    [project.ownedThreadCodes, project.symbolStyle, describeError],
  )

  // The browser's "Save as PDF" dialog suggests `document.title` as the
  // default filename, so swap it in for the moment of printing and put it
  // back afterward (the page's own title stays what's in index.html).
  const handlePrint = useCallback(() => {
    const base = sourceFileName ? sourceFileName.replace(/\.[^./\\]+$/, '') : 'cross-stitch-pattern'
    const previousTitle = document.title
    document.title = `${base}-pattern`
    const restoreTitle = () => {
      document.title = previousTitle
      window.removeEventListener('afterprint', restoreTitle)
    }
    window.addEventListener('afterprint', restoreTitle)
    window.print()
  }, [sourceFileName])

  const handleToggleOwned = useCallback(
    (code: string) => {
      // Only 'ownedOnly' mode rebuilds the palette from scratch for this action - in 'best' mode
      // it just patches the owned flag in place, nothing to lose.
      if (project.paletteMode === 'ownedOnly' && !confirmDestructiveEdit(project.history.past.length)) return
      setSettings((prev) => {
        const isOwned = prev.ownedThreadCodes.includes(code)
        const ownedThreadCodes = isOwned
          ? prev.ownedThreadCodes.filter((c) => c !== code)
          : [...prev.ownedThreadCodes, code]
        const next = { ...prev, ownedThreadCodes }
        void saveSettings(next)
        dispatch({ type: 'SET_OWNED_THREADS', codes: ownedThreadCodes })
        return next
      })
    },
    [project.paletteMode, project.history.past.length],
  )

  const handleSetSizeUnit = useCallback((unit: SizeUnit) => {
    setSettings((prev) => {
      const next = { ...prev, sizeUnit: unit }
      void saveSettings(next)
      return next
    })
  }, [])

  const handleSetPrintMode = useCallback((mode: PrintMode) => {
    setSettings((prev) => {
      const next = { ...prev, printMode: mode }
      void saveSettings(next)
      return next
    })
  }, [])

  const handleSetPrintColorMode = useCallback((mode: PrintColorMode) => {
    setSettings((prev) => {
      const next = { ...prev, printColorMode: mode }
      void saveSettings(next)
      return next
    })
  }, [])

  const handleSetSymbolStyle = useCallback((style: SymbolStyle) => {
    setSettings((prev) => {
      const next = { ...prev, symbolStyle: style }
      void saveSettings(next)
      return next
    })
    dispatch({ type: 'SET_SYMBOL_STYLE', style })
  }, [])

  // Ctrl/Cmd+Z to undo, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z to redo - ignored
  // while typing in a form field so native text-undo still works there.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isEditableTarget =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      if (isEditableTarget) return
      const meta = e.ctrlKey || e.metaKey
      if (!meta) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        dispatch({ type: 'REDO' })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // A file can be dropped anywhere in the app at any time to replace the
  // current image, not just onto a dedicated dropzone.
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragCounterRef.current += 1
    if (e.dataTransfer.types.includes('Files')) setIsDraggingOver(true)
  }
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
    if (dragCounterRef.current === 0) setIsDraggingOver(false)
  }
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault()
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDraggingOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (file.name.endsWith(PROJECT_FILE_EXTENSION)) void handleImportFile(file)
    else void handleFile(file)
  }

  const hasImage = project.imageData !== null
  const editingEntry = editingCode ? (project.palette?.find((p) => p.dmc.code === editingCode) ?? null) : null

  // A plain click selects only that cell (and becomes the range anchor); Ctrl/Cmd+click toggles
  // it into (or out of) whatever's already selected, for a multi-cell recolor; Shift+click
  // selects every cell in the rectangle between the anchor and this cell - a single row or
  // column when the two happen to line up, since that's just a 1-row/1-col rectangle.
  function handleCellClick(cellIndex: number, additive: boolean, range: boolean) {
    if (range && rangeAnchor !== null && project.confirmedGrid) {
      const { cols } = project.confirmedGrid
      const anchorRow = Math.floor(rangeAnchor / cols)
      const anchorCol = rangeAnchor % cols
      const row = Math.floor(cellIndex / cols)
      const col = cellIndex % cols
      const minRow = Math.min(anchorRow, row)
      const maxRow = Math.max(anchorRow, row)
      const minCol = Math.min(anchorCol, col)
      const maxCol = Math.max(anchorCol, col)
      const indices: number[] = []
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) indices.push(r * cols + c)
      }
      setSelectedCellIndices(indices)
      return
    }
    if (!additive) {
      setRangeAnchor(cellIndex)
      setSelectedCellIndices([cellIndex])
      return
    }
    setSelectedCellIndices((prev) => (prev.includes(cellIndex) ? prev.filter((i) => i !== cellIndex) : [...prev, cellIndex]))
  }

  const selectedCurrentCode = (() => {
    if (selectedCellIndices.length === 0 || !project.cellAssignment) return null
    const codes = new Set(selectedCellIndices.map((i) => project.cellAssignment![i]))
    return codes.size === 1 ? [...codes][0] : null
  })()

  return (
    <div
      className="flex h-screen flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="screen-only flex h-full flex-col bg-neutral-950">
        {view === 'settings' ? (
          <SettingsPage
            ownedCodes={new Set(settings.ownedThreadCodes)}
            onToggleOwned={handleToggleOwned}
            sizeUnit={settings.sizeUnit}
            onSetSizeUnit={handleSetSizeUnit}
            printMode={settings.printMode}
            onSetPrintMode={handleSetPrintMode}
            printColorMode={settings.printColorMode}
            onSetPrintColorMode={handleSetPrintColorMode}
            symbolStyle={settings.symbolStyle}
            onSetSymbolStyle={handleSetSymbolStyle}
            onClose={() => setView('workspace')}
          />
        ) : (
          <>
            <AppHeader
              onFile={handleFile}
              isUploading={isUploading}
              canPrint={project.palette !== null}
              onPrint={handlePrint}
              canUndo={project.history.past.length > 0}
              canRedo={project.history.future.length > 0}
              onUndo={() => dispatch({ type: 'UNDO' })}
              onRedo={() => dispatch({ type: 'REDO' })}
              onSettings={() => setView('settings')}
              canExport={project.palette !== null}
              onExport={handleExport}
              onImportFile={handleImportFile}
              isImporting={isImporting}
            />
            {uploadError && (
              <div className="bg-red-950 px-4 py-2 text-center text-sm text-red-300">{uploadError}</div>
            )}
            {sharedSettingsNotice && (
              <div className="flex items-center justify-center gap-3 bg-indigo-950 px-4 py-2 text-center text-sm text-indigo-300">
                {t('app.sharedSettingsNotice')}
                <button
                  type="button"
                  onClick={() => setSharedSettingsNotice(false)}
                  className="text-indigo-400 underline hover:text-indigo-200"
                >
                  {t('common.dismiss')}
                </button>
              </div>
            )}
            {project.preCropSnapshot !== null && !cropBannerDismissed && (
              <div className="flex items-center justify-center gap-3 bg-indigo-950 px-4 py-2 text-center text-sm text-indigo-300">
                {t('app.cropAppliedBanner')}
                <button type="button" onClick={handleUndoCrop} className="text-indigo-400 underline hover:text-indigo-200">
                  {t('cropControls.undo')}
                </button>
                <button
                  type="button"
                  onClick={() => setCropBannerDismissed(true)}
                  className="text-indigo-400 underline hover:text-indigo-200"
                >
                  {t('common.dismiss')}
                </button>
              </div>
            )}

            <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
              <div className="order-2 w-full shrink-0 border-b border-neutral-800 bg-neutral-900 lg:order-1 lg:h-full lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-r">
                {hasImage && project.activeTab === 'grid' && (
                  <GridControls project={project} dispatch={dispatch} />
                )}
                {hasImage && project.activeTab === 'palette' && (
                  <PalettePanel project={project} dispatch={dispatch} sizeUnit={settings.sizeUnit} />
                )}
                {hasImage && project.activeTab === 'crop' && (
                  <CropControls
                    shape={cropShapeChoice}
                    onShapeChange={setCropShapeChoice}
                    onApply={handleApplyCrop}
                    canUndo={project.preCropSnapshot !== null}
                    onUndo={handleUndoCrop}
                  />
                )}
              </div>

              <div className="relative order-1 h-[55vh] w-full shrink-0 lg:order-2 lg:h-full lg:flex-1">
                {!hasImage && !isRestoring && (
                  <UploadDropzone
                    onFile={handleFile}
                    isUploading={isUploading}
                    error={uploadError}
                    isDraggingOver={isDraggingOver}
                  />
                )}
                {hasImage && project.activeTab === 'grid' && (
                  <GridPanel project={project} dispatch={dispatch} onFlipHorizontal={handleFlipHorizontal} />
                )}
                {hasImage && project.activeTab === 'crop' && project.imageData && cropSelection && (
                  <CropPanel
                    imageData={project.imageData}
                    imageDataUrl={project.imageDataUrl!}
                    selection={cropSelection}
                    onSelectionChange={setCropOverride}
                    shape={cropShapeChoice}
                  />
                )}
                {hasImage && project.activeTab === 'palette' && project.palette && (
                  <div className="h-full" ref={attachWheelZoom}>
                    {selectedCellIndices.length > 0 && (
                      <CellEditPopover
                        cellIndices={selectedCellIndices}
                        cols={project.confirmedGrid!.cols}
                        palette={project.palette}
                        currentCode={selectedCurrentCode}
                        onPick={(dmcCode) =>
                          dispatch({ type: 'RECOLOR_CELLS', cellIndices: selectedCellIndices, dmcCode })
                        }
                        onClose={() => {
                          setSelectedCellIndices([])
                          setRangeAnchor(null)
                        }}
                      />
                    )}
                    <PatternCanvas
                      cols={project.confirmedGrid!.cols}
                      rows={project.confirmedGrid!.rows}
                      cellAssignment={project.cellAssignment!}
                      palette={project.palette}
                      cellPx={cellPx}
                      selectedCellIndices={new Set(selectedCellIndices)}
                      highlightCode={hoveredCode}
                      previewMode={previewMode}
                      onCellClick={handleCellClick}
                      onCellHover={setHoveredCode}
                    />
                    <ZoomControls
                      cellPx={cellPx}
                      defaultCellPx={DEFAULT_CELL_PX}
                      previewMode={previewMode}
                      onZoomIn={zoomIn}
                      onZoomOut={zoomOut}
                      onReset={zoomReset}
                      onTogglePreview={() => setPreviewMode((p) => !p)}
                    />
                  </div>
                )}
              </div>

              <div className="order-3 max-h-[40vh] w-full shrink-0 overflow-y-auto border-t border-neutral-800 bg-neutral-900 lg:h-full lg:max-h-none lg:w-96 lg:border-t-0 lg:border-l">
                {project.palette && (
                  <DmcColorList
                    palette={project.palette}
                    showOwned={project.ownedThreadCodes.length > 0}
                    onEdit={setEditingCode}
                    onHoverCode={setHoveredCode}
                    highlightCode={hoveredCode}
                    ownedCodes={new Set(settings.ownedThreadCodes)}
                    onAddColor={(dmc) => dispatch({ type: 'ADD_COLOR', dmc })}
                    onOpenEyedropper={() => setShowEyedropper(true)}
                  />
                )}
              </div>
            </div>

            {hasImage && (
              <TabBar
                activeTab={project.activeTab}
                onSelect={(tab) => {
                  setSelectedCellIndices([])
                  setRangeAnchor(null)
                  dispatch({ type: 'SET_ACTIVE_TAB', tab })
                }}
              />
            )}
          </>
        )}
      </div>

      {editingEntry && project.palette && (
        <ColorEditDialog
          entry={editingEntry}
          otherEntries={project.palette.filter((p) => p.dmc.code !== editingEntry.dmc.code)}
          onMergeInto={(toCode) => {
            dispatch({ type: 'MERGE_COLOR_INTO', fromCode: editingEntry.dmc.code, toCode })
            setEditingCode(null)
          }}
          onRecolor={(newDmc) => {
            dispatch({ type: 'RECOLOR_PALETTE_ENTRY', code: editingEntry.dmc.code, newDmc })
            setEditingCode(null)
          }}
          onDelete={() => {
            dispatch({ type: 'DELETE_COLOR', code: editingEntry.dmc.code })
            setEditingCode(null)
          }}
          onClose={() => setEditingCode(null)}
          ownedCodes={new Set(settings.ownedThreadCodes)}
        />
      )}

      {showEyedropper && project.imageData && project.imageDataUrl && project.palette && (
        <EyedropperDialog
          imageData={project.imageData}
          imageDataUrl={project.imageDataUrl}
          existingCodes={new Set(project.palette.map((p) => p.dmc.code))}
          ownedCodes={new Set(settings.ownedThreadCodes)}
          onAdd={(dmc) => {
            dispatch({ type: 'ADD_COLOR', dmc })
            setShowEyedropper(false)
          }}
          onClose={() => setShowEyedropper(false)}
        />
      )}

      <PrintablePage
        project={project}
        sizeUnit={settings.sizeUnit}
        printMode={settings.printMode}
        printColorMode={settings.printColorMode}
      />
    </div>
  )
}

export default App
