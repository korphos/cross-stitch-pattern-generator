import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PatternProject, PaletteEntry, DetectedGrid } from '../lib/types'
import { computeCanvasSize, renderPattern, renderPageMapOverlay, setupCanvasForDpr } from '../lib/renderPattern'
import { Legend } from './Legend'
import { FABRIC_COUNTS, computePhysicalSize, formatPhysicalSize, type SizeUnit } from '../lib/physicalSize'
import { estimateThreadUsage } from '../lib/threadEstimate'
import { computePrintLayout, PAGE_USABLE_WIDTH_PX, PAGE_USABLE_HEIGHT_PX, type PrintMode, type PageTile } from '../lib/printLayout'

interface Props {
  project: PatternProject
  sizeUnit: SizeUnit
  printMode: PrintMode
}

/**
 * Always mounted (so the browser's native print dialog / Ctrl+P works from
 * anywhere in the app), but invisible on screen - only shown via the
 * `.print-only` / `@media print` rules in index.css. There's no in-app
 * "print preview" screen: the OS print dialog already provides one.
 *
 * `computePrintLayout` decides between one shrink-to-fit sheet (small/medium patterns) and
 * several fixed-cell-size sheets tiling the grid (large patterns, where shrinking to fit one
 * page would make the stitches illegible) - see printLayout.ts.
 */
export function PrintablePage({ project, sizeUnit, printMode }: Props) {
  const { t } = useTranslation()
  const grid = project.confirmedGrid
  const palette = project.palette
  const cellAssignment = project.cellAssignment

  const layout = useMemo(
    () => (grid && cellAssignment ? computePrintLayout(grid.cols, grid.rows, printMode, cellAssignment) : null),
    [grid, cellAssignment, printMode],
  )

  const size = grid ? computePhysicalSize(grid.cols, grid.rows, project.fabricCount) : null
  const fabricLabelKey = FABRIC_COUNTS.find((f) => f.stitchesPerInch === project.fabricCount)?.labelKey
  const fabricLabel = fabricLabelKey ? t(`fabricCounts.${fabricLabelKey}`) : undefined
  const threadEstimates = palette ? estimateThreadUsage(palette, project.fabricCount, project.strands) : []
  const totalSkeins = threadEstimates.reduce((sum, e) => sum + e.skeins, 0)

  if (!grid || !palette || !cellAssignment || !size || !layout) return null

  const summaryText = (
    <>
      {t('printablePage.dimensionsFabric', { cols: grid.cols, rows: grid.rows, size: formatPhysicalSize(size, sizeUnit), fabric: fabricLabel })}
      {' — '}
      {t('printablePage.skeinsTotal', { count: totalSkeins })} {t('printablePage.strandsParen', { count: project.strands })}
    </>
  )

  return (
    <div className="print-only">
      {layout.mode === 'single' ? (
        <SinglePageSheet
          grid={grid}
          palette={palette}
          cellAssignment={cellAssignment}
          cellPx={layout.cellPx}
          summaryText={summaryText}
        />
      ) : (
        <>
          <ColorsSheet
            grid={grid}
            palette={palette}
            cellAssignment={cellAssignment}
            tiles={layout.tiles}
            summaryText={summaryText}
          />
          {layout.tiles.map((tile) => (
            <TileSheet
              key={tile.index}
              grid={grid}
              palette={palette}
              cellAssignment={cellAssignment}
              tile={tile}
              totalPages={layout.tiles.length}
              cellPx={layout.cellPx}
              isLast={tile.index === layout.tiles.length - 1}
            />
          ))}
        </>
      )}
    </div>
  )
}

interface SheetGridProps {
  grid: DetectedGrid
  palette: PaletteEntry[]
  cellAssignment: string[]
}

/** The original single-sheet layout: shrinks the whole pattern + legend to fit one page. */
function SinglePageSheet({
  grid,
  palette,
  cellAssignment,
  cellPx,
  summaryText,
}: SheetGridProps & { cellPx: number; summaryText: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ scale: 1, naturalHeight: 0 })

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const content = contentRef.current
    if (!canvas || !content) return
    const { width, height } = computeCanvasSize(grid.cols, grid.rows, cellPx)
    const ctx = setupCanvasForDpr(canvas, width, height)
    renderPattern(ctx, { cols: grid.cols, rows: grid.rows, cellAssignment, palette }, { cellPx })

    // `transform: scale` doesn't affect layout metrics, so this reads the
    // block's natural (unscaled) height regardless of the previous scale.
    const naturalHeight = content.scrollHeight
    setFit({ naturalHeight, scale: Math.min(1, PAGE_USABLE_HEIGHT_PX / naturalHeight) })
  }, [grid, cellAssignment, palette, cellPx])

  return (
    <div
      className="mx-auto overflow-hidden bg-white"
      style={{
        // `@page { margin: 0.5in }` already insets the printable area,
        // so this box must match that *usable* size, not the raw paper
        // size - sizing it to the full 8.5in would overflow past the
        // printable area on the right/bottom.
        width: PAGE_USABLE_WIDTH_PX,
        height: fit.naturalHeight ? `${fit.naturalHeight * fit.scale}px` : undefined,
      }}
    >
      <div
        ref={contentRef}
        className="mx-auto flex flex-col items-center gap-4"
        style={{ width: PAGE_USABLE_WIDTH_PX, transform: `scale(${fit.scale})`, transformOrigin: 'top center' }}
      >
        <div className="w-full text-center text-sm text-gray-600">{summaryText}</div>
        <canvas ref={canvasRef} />
        <Legend palette={palette} cols={grid.cols} rows={grid.rows} className="w-full" />
      </div>
    </div>
  )
}

/** One tile of a multi-page pattern - fixed, always-legible cell size, ruler numbers in global
 * grid coordinates (see renderPattern.ts) so pages line up by their printed row/col numbers. */
function TileSheet({
  grid,
  palette,
  cellAssignment,
  tile,
  totalPages,
  cellPx,
  isLast,
}: SheetGridProps & { tile: PageTile; totalPages: number; cellPx: number; isLast: boolean }) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const tileWindow = { colStart: tile.colStart, colEnd: tile.colEnd, rowStart: tile.rowStart, rowEnd: tile.rowEnd }
    const { width, height } = computeCanvasSize(grid.cols, grid.rows, cellPx, true, tileWindow)
    const ctx = setupCanvasForDpr(canvas, width, height)
    renderPattern(ctx, { cols: grid.cols, rows: grid.rows, cellAssignment, palette }, { cellPx, window: tileWindow })
  }, [grid, cellAssignment, palette, cellPx, tile])

  return (
    <div
      className="mx-auto flex flex-col items-center gap-2 bg-white"
      style={{ width: PAGE_USABLE_WIDTH_PX, breakAfter: isLast ? undefined : 'page', pageBreakAfter: isLast ? undefined : 'always' }}
    >
      <div className="w-full text-center text-xs text-gray-600">
        {t('printablePage.pageOfTotal', { page: tile.index + 1, total: totalPages })}
      </div>
      <canvas ref={canvasRef} />
    </div>
  )
}

/** First sheet of a multi-page pattern: summary, a shrunk thumbnail of the whole pattern with
 * the page boundaries/numbers overlaid (so sheets can be assembled without a separate map page),
 * and the color legend. */
function ColorsSheet({
  grid,
  palette,
  cellAssignment,
  tiles,
  summaryText,
}: SheetGridProps & { tiles: PageTile[]; summaryText: ReactNode }) {
  const { t } = useTranslation()
  const thumbCanvasRef = useRef<HTMLCanvasElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ scale: 1, naturalHeight: 0 })

  // Generously sized - most of the usable page width, since this is the one place a stitcher can
  // see the whole pattern (and how its sheets tile together) at a glance. `fit.scale` below still
  // shrinks everything proportionally if the legend is long enough to overflow one page.
  const THUMB_MAX_WIDTH_PX = PAGE_USABLE_WIDTH_PX * 0.7
  const THUMB_MAX_HEIGHT_PX = 500
  const thumbCellPx = Math.max(0.3, Math.min(10, Math.min(THUMB_MAX_WIDTH_PX / grid.cols, THUMB_MAX_HEIGHT_PX / grid.rows)))

  useLayoutEffect(() => {
    const canvas = thumbCanvasRef.current
    const content = contentRef.current
    if (!canvas || !content) return
    const { width, height } = computeCanvasSize(grid.cols, grid.rows, thumbCellPx, false)
    const ctx = setupCanvasForDpr(canvas, width, height)
    renderPattern(
      ctx,
      { cols: grid.cols, rows: grid.rows, cellAssignment, palette },
      { cellPx: thumbCellPx, showSymbols: false, showGridLines: false, showRulers: false },
    )
    renderPageMapOverlay(ctx, tiles, thumbCellPx)

    const naturalHeight = content.scrollHeight
    setFit({ naturalHeight, scale: Math.min(1, PAGE_USABLE_HEIGHT_PX / naturalHeight) })
  }, [grid, cellAssignment, palette, tiles, thumbCellPx])

  return (
    <div
      className="mx-auto overflow-hidden bg-white"
      style={{ width: PAGE_USABLE_WIDTH_PX, height: fit.naturalHeight ? `${fit.naturalHeight * fit.scale}px` : undefined, breakAfter: 'page', pageBreakAfter: 'always' }}
    >
      <div
        ref={contentRef}
        className="mx-auto flex flex-col items-center gap-4"
        style={{ width: PAGE_USABLE_WIDTH_PX, transform: `scale(${fit.scale})`, transformOrigin: 'top center' }}
      >
        <div className="w-full text-center text-sm text-gray-600">{summaryText}</div>
        <div className="w-full text-center text-xs text-gray-500">
          {t('printablePage.multiPageNote', { count: tiles.length })}
        </div>
        <canvas ref={thumbCanvasRef} className="border border-gray-300" />
        <Legend palette={palette} cols={grid.cols} rows={grid.rows} className="w-full" />
      </div>
    </div>
  )
}
