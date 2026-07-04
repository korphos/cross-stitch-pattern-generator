import type { Dispatch } from 'react'
import type { PatternProject } from '../lib/types'
import type { ProjectAction } from '../lib/projectReducer'
import { FABRIC_COUNTS, computePhysicalSize, formatPhysicalSize, type SizeUnit } from '../lib/physicalSize'
import { estimateThreadUsage } from '../lib/threadEstimate'

interface Props {
  project: PatternProject
  dispatch: Dispatch<ProjectAction>
  sizeUnit: SizeUnit
}

export function PalettePanel({ project, dispatch, sizeUnit }: Props) {
  const grid = project.confirmedGrid!
  const size = computePhysicalSize(grid.cols, grid.rows, project.fabricCount)
  const threadEstimates = project.palette ? estimateThreadUsage(project.palette, project.fabricCount, project.strands) : []
  const totalSkeins = threadEstimates.reduce((sum, e) => sum + e.skeins, 0)
  const hasInventory = project.ownedThreadCodes.length > 0
  const notOwnedCount = project.palette?.filter((p) => !p.owned).length ?? 0

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <h2 className="text-sm font-semibold text-neutral-100">Palette</h2>

      <label className="flex flex-col gap-1 text-sm text-neutral-300">
        Merge similar colors
        <input
          type="range"
          min={0}
          max={20}
          step={0.1}
          value={project.clusterThreshold}
          onChange={(e) => dispatch({ type: 'SET_CLUSTER_THRESHOLD', threshold: Number(e.target.value) })}
        />
      </label>

      {project.backgroundColor && (
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={project.ignoreBackground}
            onChange={(e) => dispatch({ type: 'SET_IGNORE_BACKGROUND', ignore: e.target.checked })}
            className="h-4 w-4 accent-indigo-500"
          />
          <span
            className="h-4 w-4 shrink-0 rounded-sm border border-black/20"
            style={{
              backgroundColor: `rgb(${project.backgroundColor.r}, ${project.backgroundColor.g}, ${project.backgroundColor.b})`,
            }}
          />
          Ignore background color
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm text-neutral-300">
        Colors to use
        <select
          value={project.paletteMode}
          onChange={(e) => dispatch({ type: 'SET_PALETTE_MODE', mode: e.target.value as 'best' | 'ownedOnly' })}
          className="rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-100"
        >
          <option value="best">Best possible match</option>
          <option value="ownedOnly">Only my threads</option>
        </select>
        {project.paletteMode === 'ownedOnly' && !hasInventory && (
          <span className="text-xs text-amber-400">
            No threads marked as owned yet - add some in Settings, otherwise this behaves like "Best possible match".
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-300">
        Fabric count
        <select
          value={project.fabricCount}
          onChange={(e) => dispatch({ type: 'SET_FABRIC_COUNT', stitchesPerInch: Number(e.target.value) })}
          className="rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-100"
        >
          {FABRIC_COUNTS.map((fc) => (
            <option key={fc.stitchesPerInch} value={fc.stitchesPerInch}>
              {fc.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-300">
        Strands
        <select
          value={project.strands}
          onChange={(e) => dispatch({ type: 'SET_STRANDS', strands: Number(e.target.value) })}
          className="rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-100"
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n} strand{n > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="border-t border-neutral-800 pt-4">
        <h3 className="mb-2 text-sm font-semibold text-neutral-100">Stats</h3>
        <dl className="flex flex-col gap-1.5 text-sm text-neutral-300">
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">Dimensions</dt>
            <dd>
              {grid.cols} × {grid.rows} stitches
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">Approx. size</dt>
            <dd>{formatPhysicalSize(size, sizeUnit)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">Colors</dt>
            <dd>{threadEstimates.length}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">Thread needed</dt>
            <dd>{totalSkeins} skeins</dd>
          </div>
          {hasInventory && (
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-500">Need to buy</dt>
              <dd>{notOwnedCount} colors</dd>
            </div>
          )}
        </dl>
        <p className="mt-2 text-xs text-neutral-500">Thread estimate is approximate - buy a bit extra of each color.</p>
      </div>
    </div>
  )
}
