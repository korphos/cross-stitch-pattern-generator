import type { PatternProject, DetectedGrid, PixelBuffer, WizardStep } from './types'
import { sampleGridColors } from './cellSampling'
import { buildPalette } from './buildPalette'

export type ProjectAction =
  | { type: 'IMAGE_LOADED'; imageData: PixelBuffer; imageDataUrl: string; detectedGrid: DetectedGrid }
  | { type: 'UPDATE_GRID'; grid: DetectedGrid }
  | { type: 'CONFIRM_GRID' }
  | { type: 'SET_CLUSTER_THRESHOLD'; threshold: number }
  | { type: 'SET_FABRIC_COUNT'; stitchesPerInch: number }
  | { type: 'GO_TO_STEP'; step: WizardStep }
  | { type: 'RESET' }

export const DEFAULT_CLUSTER_THRESHOLD = 2.3
export const DEFAULT_FABRIC_COUNT = 14

export const initialProject: PatternProject = {
  step: 'upload',
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

function recomputePalette(project: PatternProject, threshold: number): PatternProject {
  if (!project.cellColors) return { ...project, clusterThreshold: threshold }
  const { palette, cellAssignment } = buildPalette(project.cellColors, threshold)
  return { ...project, clusterThreshold: threshold, palette, cellAssignment }
}

export function projectReducer(project: PatternProject, action: ProjectAction): PatternProject {
  switch (action.type) {
    case 'IMAGE_LOADED':
      return {
        ...initialProject,
        imageData: action.imageData,
        imageDataUrl: action.imageDataUrl,
        detectedGrid: action.detectedGrid,
        confirmedGrid: action.detectedGrid,
        step: 'adjust',
      }

    case 'UPDATE_GRID':
      return { ...project, confirmedGrid: action.grid }

    case 'CONFIRM_GRID': {
      if (!project.imageData || !project.confirmedGrid) return project
      const cellColors = sampleGridColors(project.imageData, project.confirmedGrid)
      return recomputePalette({ ...project, cellColors, step: 'palette' }, project.clusterThreshold)
    }

    case 'SET_CLUSTER_THRESHOLD':
      return recomputePalette(project, action.threshold)

    case 'SET_FABRIC_COUNT':
      return { ...project, fabricCount: action.stitchesPerInch }

    case 'GO_TO_STEP':
      return { ...project, step: action.step }

    case 'RESET':
      return initialProject

    default:
      return project
  }
}
