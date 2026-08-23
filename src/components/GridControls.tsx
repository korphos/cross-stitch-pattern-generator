import { useState } from 'react'
import type { Dispatch } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import type { PatternProject } from '../lib/types'
import type { ProjectAction } from '../lib/projectReducer'
import { detectGrid } from '../lib/gridDetection'
import { confirmDestructiveEdit } from '../lib/confirmDestructive'

interface Props {
  project: PatternProject
  dispatch: Dispatch<ProjectAction>
}

export function GridControls({ project, dispatch }: Props) {
  const { t } = useTranslation()
  const grid = project.confirmedGrid!
  const imageData = project.imageData!
  // A fixed 0.1 step took forever to reach a meaningful offset on a large cell (needing the
  // full +/- cellSize/2 range) - scale it with cell size instead, roughly 40 steps corner to corner.
  const sampleOffsetStep = Math.max(0.05, Math.round((grid.cellSize / 20) * 100) / 100)
  const [pixelsPerStitch, setPixelsPerStitch] = useState(() => Math.max(1, Math.round(grid.cellSize)))

  function updateGrid(next: typeof grid) {
    if (!confirmDestructiveEdit(project.history.past.length)) return
    dispatch({ type: 'UPDATE_GRID', grid: next })
  }

  function setField(patch: Partial<{ offsetX: number; offsetY: number; cellSize: number; cols: number; rows: number }>) {
    const offsetX = patch.offsetX ?? grid.bbox.x
    const offsetY = patch.offsetY ?? grid.bbox.y
    const cellSize = patch.cellSize ?? grid.cellSize
    const cols = patch.cols ?? grid.cols
    const rows = patch.rows ?? grid.rows
    if (![offsetX, offsetY, cellSize, cols, rows].every(Number.isFinite)) return
    if (cellSize <= 0 || cols <= 0 || rows <= 0) return

    // Keep the grid fully inside the source image - an offset or cell size
    // that pushes it past the edge would sample garbage for the cells that
    // fall outside the image (see cellSampling.ts's clamping for the rest
    // of that defense).
    const width = cols * cellSize
    const height = rows * cellSize
    const x = Math.min(Math.max(0, offsetX), Math.max(0, imageData.width - width))
    const y = Math.min(Math.max(0, offsetY), Math.max(0, imageData.height - height))
    // Re-clamp the sample offset too - a shrunk cellSize can put it outside +/- the new half-cell bound.
    const maxSampleOffset = cellSize / 2
    const sampleOffsetX = Math.max(-maxSampleOffset, Math.min(maxSampleOffset, grid.sampleOffsetX ?? 0))
    const sampleOffsetY = Math.max(-maxSampleOffset, Math.min(maxSampleOffset, grid.sampleOffsetY ?? 0))

    updateGrid({
      bbox: { x, y, width, height },
      cellSize,
      cols,
      rows,
      confidence: grid.confidence,
      sampleOffsetX,
      sampleOffsetY,
    })
  }

  function setSampleOffset(patch: Partial<{ sampleOffsetX: number; sampleOffsetY: number }>) {
    const maxOffset = grid.cellSize / 2
    const clamp = (v: number) => Math.max(-maxOffset, Math.min(maxOffset, v))
    const sampleOffsetX = clamp(patch.sampleOffsetX ?? grid.sampleOffsetX ?? 0)
    const sampleOffsetY = clamp(patch.sampleOffsetY ?? grid.sampleOffsetY ?? 0)
    if (!Number.isFinite(sampleOffsetX) || !Number.isFinite(sampleOffsetY)) return
    updateGrid({ ...grid, sampleOffsetX, sampleOffsetY })
  }

  // For an already-pixelated source image (e.g. a small pre-made sprite/chart) where every
  // stitch is a known, fixed block of source pixels - bypasses the edge-detection heuristic
  // entirely, which has nothing to lock onto when there's no visible "interior" between cells
  // (see gridDetection.ts's own 1px/stitch fallback for the automatic-detection side of this).
  function applyPixelGrid() {
    const n = Math.max(1, Math.round(pixelsPerStitch))
    const cols = Math.max(1, Math.floor(imageData.width / n))
    const rows = Math.max(1, Math.floor(imageData.height / n))
    updateGrid({
      bbox: { x: 0, y: 0, width: cols * n, height: rows * n },
      cellSize: n,
      cols,
      rows,
      confidence: 1,
      sampleOffsetX: 0,
      sampleOffsetY: 0,
    })
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <h2 className="text-sm font-semibold text-neutral-100">{t('gridControls.title')}</h2>
      <p className="text-xs text-neutral-400">{t('gridControls.helper')}</p>

      <div className="grid grid-cols-2 gap-3">
        <NumberField label={t('gridControls.offsetX')} value={grid.bbox.x} onChange={(v) => setField({ offsetX: v })} />
        <NumberField label={t('gridControls.offsetY')} value={grid.bbox.y} onChange={(v) => setField({ offsetY: v })} />
      </div>
      <NumberField
        label={t('gridControls.cellSize')}
        value={grid.cellSize}
        step={0.1}
        onChange={(v) => setField({ cellSize: v })}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={t('gridControls.columns')} value={grid.cols} onChange={(v) => setField({ cols: Math.round(v) })} />
        <NumberField label={t('gridControls.rows')} value={grid.rows} onChange={(v) => setField({ rows: Math.round(v) })} />
      </div>

      <div className="border-t border-neutral-800 pt-3">
        <div className="mb-2 flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-neutral-100">{t('gridControls.samplePointOffset')}</h3>
          <span title={t('gridControls.samplePointInfo')} className="cursor-help text-neutral-500">
            <Info className="h-3.5 w-3.5 shrink-0" />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label={t('gridControls.sampleOffsetX')}
            value={grid.sampleOffsetX ?? 0}
            step={sampleOffsetStep}
            onChange={(v) => setSampleOffset({ sampleOffsetX: v })}
          />
          <NumberField
            label={t('gridControls.sampleOffsetY')}
            value={grid.sampleOffsetY ?? 0}
            step={sampleOffsetStep}
            onChange={(v) => setSampleOffset({ sampleOffsetY: v })}
          />
        </div>
      </div>

      <p className="text-xs text-neutral-500">{t('gridControls.confidence', { percent: Math.round(grid.confidence * 100) })}</p>

      <button
        type="button"
        className="mt-2 rounded-md border border-neutral-600 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
        onClick={() => updateGrid(detectGrid(imageData))}
      >
        {t('gridControls.redetect')}
      </button>

      <div className="border-t border-neutral-800 pt-3">
        <div className="mb-2 flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-neutral-100">{t('gridControls.pixelGridTitle')}</h3>
          <span title={t('gridControls.pixelGridHelp')} className="cursor-help text-neutral-500">
            <Info className="h-3.5 w-3.5 shrink-0" />
          </span>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <NumberField
              label={t('gridControls.pixelsPerStitch')}
              value={pixelsPerStitch}
              step={1}
              onChange={(v) => setPixelsPerStitch(Math.max(1, Math.round(v)))}
            />
          </div>
          <button
            type="button"
            onClick={applyPixelGrid}
            className="shrink-0 rounded-md border border-neutral-600 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-800"
          >
            {t('gridControls.applyPixelGrid')}
          </button>
        </div>
      </div>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-neutral-300">
      {label}
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-100"
      />
    </label>
  )
}
