import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { initialProject, projectReducer } from './lib/projectReducer'
import { detectGrid } from './lib/gridDetection'
import { loadImageFile, decodeDataUrlToImageData } from './lib/imageLoader'
import { loadPersistedProject, savePersistedProject } from './lib/persistence'
import { AppHeader } from './components/AppHeader'
import { TabBar } from './components/TabBar'
import { UploadDropzone } from './components/UploadDropzone'
import { GridPanel } from './components/GridPanel'
import { GridControls } from './components/GridControls'
import { PatternCanvas } from './components/PatternCanvas'
import { PalettePanel } from './components/PalettePanel'
import { DmcColorList } from './components/DmcColorList'
import { CellEditPopover } from './components/CellEditPopover'
import { ColorEditDialog } from './components/ColorEditDialog'
import { PrintablePage } from './components/PrintablePage'

function App() {
  const [project, dispatch] = useReducer(projectReducer, initialProject)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [sourceFileName, setSourceFileName] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const dragCounterRef = useRef(0)

  // Restore whatever was last worked on, so a page refresh doesn't lose
  // anything - image, form settings, AND any manual color edits.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const saved = await loadPersistedProject()
        if (!saved || cancelled) return
        const imageData = await decodeDataUrlToImageData(saved.imageDataUrl)
        if (cancelled) return
        setSourceFileName(saved.fileName)
        dispatch({
          type: 'RESTORE',
          imageData,
          imageDataUrl: saved.imageDataUrl,
          grid: saved.grid,
          clusterThreshold: saved.clusterThreshold,
          fabricCount: saved.fabricCount,
          activeTab: saved.activeTab,
          palette: saved.palette,
          cellAssignment: saved.cellAssignment,
        })
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
        activeTab: project.activeTab,
        palette,
        cellAssignment,
      })
    }, 300)
    return () => clearTimeout(handle)
  }, [
    project.imageDataUrl,
    project.confirmedGrid,
    project.clusterThreshold,
    project.fabricCount,
    project.activeTab,
    project.palette,
    project.cellAssignment,
    sourceFileName,
  ])

  const handleFile = useCallback(async (file: File) => {
    setUploadError(null)
    setIsUploading(true)
    try {
      const { imageData, dataUrl } = await loadImageFile(file)
      const detectedGrid = detectGrid(imageData)
      setSourceFileName(file.name)
      dispatch({ type: 'IMAGE_LOADED', imageData, imageDataUrl: dataUrl, detectedGrid })
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Error while loading the image')
    } finally {
      setIsUploading(false)
    }
  }, [])

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
    if (file) void handleFile(file)
  }

  const hasImage = project.imageData !== null
  const editingEntry = editingCode ? (project.palette?.find((p) => p.dmc.code === editingCode) ?? null) : null

  return (
    <div
      className="flex h-screen flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="screen-only flex h-full flex-col bg-neutral-950">
        <AppHeader
          onFile={handleFile}
          isUploading={isUploading}
          canPrint={project.palette !== null}
          onPrint={handlePrint}
          canUndo={project.history.past.length > 0}
          canRedo={project.history.future.length > 0}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onRedo={() => dispatch({ type: 'REDO' })}
        />
        {uploadError && <div className="bg-red-950 px-4 py-2 text-center text-sm text-red-300">{uploadError}</div>}

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 shrink-0 border-r border-neutral-800 bg-neutral-900">
            {hasImage && project.activeTab === 'grid' && <GridControls project={project} dispatch={dispatch} />}
            {hasImage && project.activeTab === 'palette' && <PalettePanel project={project} dispatch={dispatch} />}
          </div>

          <div className="relative flex-1 overflow-hidden">
            {!hasImage && !isRestoring && (
              <UploadDropzone
                onFile={handleFile}
                isUploading={isUploading}
                error={uploadError}
                isDraggingOver={isDraggingOver}
              />
            )}
            {hasImage && project.activeTab === 'grid' && <GridPanel project={project} dispatch={dispatch} />}
            {hasImage && project.activeTab === 'palette' && project.palette && (
              <>
                {selectedCellIndex !== null && (
                  <CellEditPopover
                    cellIndex={selectedCellIndex}
                    cols={project.confirmedGrid!.cols}
                    palette={project.palette}
                    currentCode={project.cellAssignment![selectedCellIndex]}
                    onPick={(dmcCode) => dispatch({ type: 'RECOLOR_CELL', cellIndex: selectedCellIndex, dmcCode })}
                    onClose={() => setSelectedCellIndex(null)}
                  />
                )}
                <PatternCanvas
                  cols={project.confirmedGrid!.cols}
                  rows={project.confirmedGrid!.rows}
                  cellAssignment={project.cellAssignment!}
                  palette={project.palette}
                  selectedCellIndex={selectedCellIndex}
                  onCellClick={setSelectedCellIndex}
                />
              </>
            )}
          </div>

          <div className="w-64 shrink-0 border-l border-neutral-800 bg-neutral-900">
            {project.palette && <DmcColorList palette={project.palette} onEdit={setEditingCode} />}
          </div>
        </div>

        {hasImage && (
          <TabBar
            activeTab={project.activeTab}
            onSelect={(tab) => {
              setSelectedCellIndex(null)
              dispatch({ type: 'SET_ACTIVE_TAB', tab })
            }}
          />
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
          onClose={() => setEditingCode(null)}
        />
      )}

      <PrintablePage project={project} />
    </div>
  )
}

export default App
