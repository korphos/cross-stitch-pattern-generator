import type { Dispatch } from 'react'
import type { PatternProject } from '../lib/types'
import type { ProjectAction } from '../lib/projectReducer'
import { FABRIC_COUNTS, computePhysicalSize, formatPhysicalSize } from '../lib/physicalSize'

interface Props {
  project: PatternProject
  dispatch: Dispatch<ProjectAction>
}

export function PalettePanel({ project, dispatch }: Props) {
  const grid = project.confirmedGrid!
  const size = computePhysicalSize(grid.cols, grid.rows, project.fabricCount)

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <h2 className="text-sm font-semibold text-neutral-100">Palette</h2>

      <label className="flex flex-col gap-1 text-sm text-neutral-300">
        Merge similar colors
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={project.clusterThreshold}
          onChange={(e) => dispatch({ type: 'SET_CLUSTER_THRESHOLD', threshold: Number(e.target.value) })}
        />
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

      <p className="text-sm text-neutral-300">
        This cross-stitch will measure approximately{' '}
        <strong className="text-neutral-100">{formatPhysicalSize(size)}</strong>
      </p>
    </div>
  )
}
