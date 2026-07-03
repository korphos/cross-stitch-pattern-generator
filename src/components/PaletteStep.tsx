import type { Dispatch } from 'react'
import type { PatternProject } from '../lib/types'
import type { ProjectAction } from '../lib/projectReducer'
import { PatternCanvas } from './PatternCanvas'
import { Legend } from './Legend'
import { FABRIC_COUNTS, computePhysicalSize, formatPhysicalSize } from '../lib/physicalSize'

interface Props {
  project: PatternProject
  dispatch: Dispatch<ProjectAction>
}

export function PaletteStep({ project, dispatch }: Props) {
  const grid = project.confirmedGrid!
  const palette = project.palette!
  const cellAssignment = project.cellAssignment!
  const size = computePhysicalSize(grid.cols, grid.rows, project.fabricCount)

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-4 text-lg font-medium text-gray-900">Palette and symbols</h2>

      <div className="mb-6 flex flex-wrap items-end gap-6 rounded-md border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Merge similar colors (deltaE threshold: {project.clusterThreshold.toFixed(1)})
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={project.clusterThreshold}
            onChange={(e) => dispatch({ type: 'SET_CLUSTER_THRESHOLD', threshold: Number(e.target.value) })}
            className="w-56"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Fabric count
          <select
            value={project.fabricCount}
            onChange={(e) => dispatch({ type: 'SET_FABRIC_COUNT', stitchesPerInch: Number(e.target.value) })}
            className="rounded-md border border-gray-300 px-2 py-1"
          >
            {FABRIC_COUNTS.map((fc) => (
              <option key={fc.stitchesPerInch} value={fc.stitchesPerInch}>
                {fc.label}
              </option>
            ))}
          </select>
        </label>

        <p className="text-sm text-gray-700">
          This cross-stitch will measure approximately <strong>{formatPhysicalSize(size)}</strong>
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <PatternCanvas cols={grid.cols} rows={grid.rows} cellAssignment={cellAssignment} palette={palette} />
        <Legend palette={palette} cols={grid.cols} rows={grid.rows} className="lg:w-80 lg:shrink-0" />
      </div>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          onClick={() => dispatch({ type: 'GO_TO_STEP', step: 'adjust' })}
        >
          Back
        </button>
        <button
          type="button"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          onClick={() => dispatch({ type: 'GO_TO_STEP', step: 'print' })}
        >
          Continue to print
        </button>
      </div>
    </div>
  )
}
