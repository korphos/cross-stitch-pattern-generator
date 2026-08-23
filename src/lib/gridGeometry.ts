import type { DetectedGrid } from './types'

export interface GridFieldPatch {
  offsetX: number
  offsetY: number
  cellSize: number
  cols: number
  rows: number
}

/**
 * Applies a partial change to a grid's offset/cell size/cols/rows, clamping the result to stay
 * fully inside the source image - an offset or cell size that pushes the grid past the edge would
 * sample garbage for the cells that fall outside the image (see cellSampling.ts's clamping for
 * the rest of that defense). Also re-clamps sampleOffsetX/Y, since a shrunk cellSize can put it
 * outside the new +/- half-cell bound. Returns null for a non-finite or non-positive patch,
 * leaving the caller to no-op instead of applying a broken grid.
 */
export function applyGridFieldPatch(
  grid: DetectedGrid,
  imageWidth: number,
  imageHeight: number,
  patch: Partial<GridFieldPatch>,
): DetectedGrid | null {
  const offsetX = patch.offsetX ?? grid.bbox.x
  const offsetY = patch.offsetY ?? grid.bbox.y
  const cellSize = patch.cellSize ?? grid.cellSize
  const cols = patch.cols ?? grid.cols
  const rows = patch.rows ?? grid.rows
  if (![offsetX, offsetY, cellSize, cols, rows].every(Number.isFinite)) return null
  if (cellSize <= 0 || cols <= 0 || rows <= 0) return null

  const width = cols * cellSize
  const height = rows * cellSize
  const x = Math.min(Math.max(0, offsetX), Math.max(0, imageWidth - width))
  const y = Math.min(Math.max(0, offsetY), Math.max(0, imageHeight - height))
  const maxSampleOffset = cellSize / 2
  const sampleOffsetX = Math.max(-maxSampleOffset, Math.min(maxSampleOffset, grid.sampleOffsetX ?? 0))
  const sampleOffsetY = Math.max(-maxSampleOffset, Math.min(maxSampleOffset, grid.sampleOffsetY ?? 0))

  return {
    bbox: { x, y, width, height },
    cellSize,
    cols,
    rows,
    confidence: grid.confidence,
    sampleOffsetX,
    sampleOffsetY,
  }
}
