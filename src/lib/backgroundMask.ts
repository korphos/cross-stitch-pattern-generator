import type { RGB } from './types'
import { colorDistance } from './colorMatch'

/**
 * A cell this close to the background color is a *candidate* background
 * cell - see `findBackgroundCells` for why color alone isn't enough.
 */
const BACKGROUND_DELTA_E = 8

/**
 * Background-colored cells that are reachable from the grid's outer edge
 * by walking through other background-colored cells (4-connected). Color
 * similarity alone isn't enough to call a cell "background": an interior
 * white highlight painted inside gray hair is just as pale as the actual
 * background, but it isn't background - it's only reachable by crossing
 * non-background-colored cells first, so the flood fill never reaches it.
 */
export function findBackgroundCells(cellColors: RGB[], cols: number, rows: number, backgroundColor: RGB): Set<number> {
  const isBackgroundColor = (index: number) => colorDistance(cellColors[index], backgroundColor) <= BACKGROUND_DELTA_E

  const visited = new Set<number>()
  const queue: number[] = []

  function seed(index: number) {
    if (isBackgroundColor(index) && !visited.has(index)) {
      visited.add(index)
      queue.push(index)
    }
  }

  for (let col = 0; col < cols; col++) {
    seed(col)
    seed((rows - 1) * cols + col)
  }
  for (let row = 0; row < rows; row++) {
    seed(row * cols)
    seed(row * cols + (cols - 1))
  }

  while (queue.length > 0) {
    const index = queue.pop()!
    const row = Math.floor(index / cols)
    const col = index % cols
    if (row > 0) seed(index - cols)
    if (row < rows - 1) seed(index + cols)
    if (col > 0) seed(index - 1)
    if (col < cols - 1) seed(index + 1)
  }

  return visited
}
