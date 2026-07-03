import type { PatternProject, DetectedGrid, PixelBuffer, ActiveTab } from './types'
import { sampleGridColors } from './cellSampling'
import { buildPalette } from './buildPalette'

export type ProjectAction =
  | { type: 'IMAGE_LOADED'; imageData: PixelBuffer; imageDataUrl: string; detectedGrid: DetectedGrid }
  | { type: 'UPDATE_GRID'; grid: DetectedGrid }
  | { type: 'SET_CLUSTER_THRESHOLD'; threshold: number }
  | { type: 'SET_FABRIC_COUNT'; stitchesPerInch: number }
  | { type: 'SET_ACTIVE_TAB'; tab: ActiveTab }
  | {
      type: 'RESTORE'
      imageData: PixelBuffer
      imageDataUrl: string
      grid: DetectedGrid
      clusterThreshold: number
      fabricCount: number
      activeTab: ActiveTab
    }
  | { type: 'RESET' }

export const DEFAULT_CLUSTER_THRESHOLD = 2.3
export const DEFAULT_FABRIC_COUNT = 14

export const initialProject: PatternProject = {
  activeTab: 'palette',
  imageData: null,
  imageDataUrl: null,
  detectedGrid: null,
  confirmedGrid: null,
  cellColors: null,
  clusterThreshold: DEFAULT_CLUSTER_THRESHOLD,
  palette: null,
  cellAssignment: null,
  fabricCount: DEFAULT_FABRIC_COUNT,
}

/** Re-samples cell colors from the image for `grid` and rebuilds the palette - there's no separate "confirm" step, grid edits apply live. */
function resample(project: PatternProject, grid: DetectedGrid): PatternProject {
  if (!project.imageData) return { ...project, confirmedGrid: grid }
  const cellColors = sampleGridColors(project.imageData, grid)
  const { palette, cellAssignment } = buildPalette(cellColors, project.clusterThreshold)
  return { ...project, confirmedGrid: grid, cellColors, palette, cellAssignment }
}

export function projectReducer(project: PatternProject, action: ProjectAction): PatternProject {
  switch (action.type) {
    case 'IMAGE_LOADED':
      // Trust the auto-detection by default and land straight on the
      // palette view; the grid tab remains one click away for correction.
      return resample(
        {
          ...initialProject,
          imageData: action.imageData,
          imageDataUrl: action.imageDataUrl,
          detectedGrid: action.detectedGrid,
          activeTab: 'palette',
        },
        action.detectedGrid,
      )

    case 'UPDATE_GRID':
      return resample(project, action.grid)

    case 'SET_CLUSTER_THRESHOLD': {
      if (!project.cellColors) return { ...project, clusterThreshold: action.threshold }
      const { palette, cellAssignment } = buildPalette(project.cellColors, action.threshold)
      return { ...project, clusterThreshold: action.threshold, palette, cellAssignment }
    }

    case 'SET_FABRIC_COUNT':
      return { ...project, fabricCount: action.stitchesPerInch }

    case 'SET_ACTIVE_TAB':
      return { ...project, activeTab: action.tab }

    case 'RESTORE':
      return resample(
        {
          ...initialProject,
          imageData: action.imageData,
          imageDataUrl: action.imageDataUrl,
          detectedGrid: action.grid,
          clusterThreshold: action.clusterThreshold,
          fabricCount: action.fabricCount,
          activeTab: action.activeTab,
        },
        action.grid,
      )

    case 'RESET':
      return initialProject

    default:
      return project
  }
}
