import type {
  PatternProject,
  DetectedGrid,
  PixelBuffer,
  ActiveTab,
  PaletteEntry,
  DmcColor,
  EditSnapshot,
  PaletteMode,
  CropShape,
  RGB,
  RGBA,
} from './types'
import { EMPTY_CELL } from './types'
import { sampleGridColors, sampleGridAlpha } from './cellSampling'
import { buildPalette } from './buildPalette'
import { findBackgroundCells } from './backgroundMask'
import { mirrorRowMajorHorizontal } from './imageTransform'
import { assignSymbols, contrastTextColor } from './symbolAssignment'
import { findFinishAlternative } from './colorMatch'
import { FABRIC_COUNTS } from './physicalSize'

export type ProjectAction =
  | { type: 'IMAGE_LOADED'; imageData: PixelBuffer; imageDataUrl: string; detectedGrid: DetectedGrid; backgroundColor: RGBA }
  | { type: 'UPDATE_GRID'; grid: DetectedGrid }
  | { type: 'FLIP_IMAGE_HORIZONTAL'; imageData: PixelBuffer; imageDataUrl: string }
  | { type: 'SET_CLUSTER_THRESHOLD'; threshold: number }
  | { type: 'SET_FABRIC_COUNT'; stitchesPerInch: number }
  | { type: 'SET_STRANDS'; strands: number }
  | { type: 'SET_PALETTE_MODE'; mode: PaletteMode }
  | { type: 'SET_OWNED_THREADS'; codes: string[] }
  | { type: 'SET_IGNORE_BACKGROUND'; ignore: boolean }
  | { type: 'SET_ACTIVE_TAB'; tab: ActiveTab }
  | {
      type: 'APPLY_CROP'
      imageData: PixelBuffer
      imageDataUrl: string
      detectedGrid: DetectedGrid
      backgroundColor: RGBA
      cropShape: CropShape
    }
  | { type: 'UNDO_CROP' }
  | { type: 'RECOLOR_CELLS'; cellIndices: number[]; dmcCode: string }
  | { type: 'MERGE_COLOR_INTO'; fromCode: string; toCode: string }
  | { type: 'RECOLOR_PALETTE_ENTRY'; code: string; newDmc: DmcColor }
  | { type: 'DELETE_COLOR'; code: string }
  | { type: 'ADD_COLOR'; dmc: DmcColor }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | {
      type: 'RESTORE'
      imageData: PixelBuffer
      imageDataUrl: string
      grid: DetectedGrid
      clusterThreshold: number
      fabricCount: number
      strands: number
      paletteMode: PaletteMode
      ownedThreadCodes: string[]
      backgroundColor: RGBA | null
      ignoreBackground: boolean
      activeTab: ActiveTab
      palette: PaletteEntry[]
      cellAssignment: string[]
      cropShape: CropShape
    }
  | { type: 'RESET' }

export const DEFAULT_CLUSTER_THRESHOLD = 2.3
export const DEFAULT_FABRIC_COUNT = 14
const MAX_HISTORY = 50

const emptyHistory = (): PatternProject['history'] => ({ past: [], future: [] })

function defaultStrandsFor(stitchesPerInch: number): number {
  return FABRIC_COUNTS.find((f) => f.stitchesPerInch === stitchesPerInch)?.defaultStrands ?? 2
}

export const initialProject: PatternProject = {
  activeTab: 'palette',
  imageData: null,
  imageDataUrl: null,
  detectedGrid: null,
  confirmedGrid: null,
  cellColors: null,
  cellAlpha: null,
  clusterThreshold: DEFAULT_CLUSTER_THRESHOLD,
  palette: null,
  cellAssignment: null,
  fabricCount: DEFAULT_FABRIC_COUNT,
  strands: defaultStrandsFor(DEFAULT_FABRIC_COUNT),
  paletteMode: 'best',
  ownedThreadCodes: [],
  backgroundColor: null,
  ignoreBackground: true,
  cropShape: null,
  preCropSnapshot: null,
  history: emptyHistory(),
}

/**
 * Cells outside the ellipse inscribed in the grid's bbox - what a 'circle' crop leaves outside
 * the round selection. Worked out geometrically from cols/rows rather than reusing the
 * transparent-corner pixels the crop itself painted in, so it keeps masking those same corners
 * on every future resample (grid tweaks, threshold changes, etc.) regardless of the
 * ignore-background toggle, which the user is free to turn off independently.
 */
function circleMaskCellIndices(grid: DetectedGrid): Set<number> {
  const { cols, rows } = grid
  const indices = new Set<number>()
  for (let row = 0; row < rows; row++) {
    const ny = (row + 0.5 - rows / 2) / (rows / 2)
    for (let col = 0; col < cols; col++) {
      const nx = (col + 0.5 - cols / 2) / (cols / 2)
      if (nx * nx + ny * ny > 1) indices.add(row * cols + col)
    }
  }
  return indices
}

/**
 * Indices of `cellColors` to leave blank: the union of whatever the
 * ignore-background toggle excludes (a flood fill from the grid's border,
 * see `findBackgroundCells`, so an interior highlight that merely shares
 * the background's color isn't swept away with it) and, for a 'circle'
 * crop, the cells outside the round selection.
 */
function backgroundCellIndicesFor(
  cellColors: RGB[],
  cellAlpha: number[] | null,
  grid: DetectedGrid,
  backgroundColor: RGBA | null,
  ignoreBackground: boolean,
  cropShape: CropShape,
): Set<number> | undefined {
  const background =
    ignoreBackground && backgroundColor
      ? findBackgroundCells(cellColors, grid.cols, grid.rows, backgroundColor, cellAlpha ?? undefined)
      : undefined
  const cropMask = cropShape === 'circle' ? circleMaskCellIndices(grid) : undefined
  if (!background) return cropMask
  if (!cropMask) return background
  return new Set([...background, ...cropMask])
}

/**
 * Re-samples cell colors from the image for `grid` and rebuilds the palette
 * from scratch - there's no separate "confirm" step, grid/threshold edits
 * apply live. This discards any manual color edits (they no longer apply
 * to a re-clustered palette), so the undo history is reset too.
 */
function resample(project: PatternProject, grid: DetectedGrid): PatternProject {
  if (!project.imageData) return { ...project, confirmedGrid: grid }
  const cellColors = sampleGridColors(project.imageData, grid)
  const cellAlpha = sampleGridAlpha(project.imageData, grid)
  const { palette, cellAssignment } = buildPalette(cellColors, project.clusterThreshold, {
    mode: project.paletteMode,
    ownedCodes: new Set(project.ownedThreadCodes),
    backgroundCellIndices: backgroundCellIndicesFor(
      cellColors,
      cellAlpha,
      grid,
      project.backgroundColor,
      project.ignoreBackground,
      project.cropShape,
    ),
  })
  return { ...project, confirmedGrid: grid, cellColors, cellAlpha, palette, cellAssignment, history: emptyHistory() }
}

function recomputeCounts(palette: PaletteEntry[], cellAssignment: string[]): PaletteEntry[] {
  const counts = new Map<string, number>()
  for (const code of cellAssignment) counts.set(code, (counts.get(code) ?? 0) + 1)
  return palette.map((entry) => ({ ...entry, count: counts.get(entry.dmc.code) ?? 0 }))
}

/** Snapshots the current editable result onto the undo stack, clearing redo. */
function pushHistory(project: PatternProject): PatternProject['history'] {
  const snapshot: EditSnapshot = { palette: project.palette!, cellAssignment: project.cellAssignment! }
  return { past: [...project.history.past, snapshot].slice(-MAX_HISTORY), future: [] }
}

export function projectReducer(project: PatternProject, action: ProjectAction): PatternProject {
  switch (action.type) {
    case 'IMAGE_LOADED':
      // Trust the auto-detection by default and land straight on the
      // palette view; the grid tab remains one click away for correction.
      // Owned-threads inventory, palette mode, and the ignore-background
      // toggle are user-level preferences, not per-image, so they carry
      // over to the new image - only the detected background color itself
      // is always fresh, since it depends on this specific image.
      return resample(
        {
          ...initialProject,
          ownedThreadCodes: project.ownedThreadCodes,
          paletteMode: project.paletteMode,
          ignoreBackground: project.ignoreBackground,
          backgroundColor: action.backgroundColor,
          imageData: action.imageData,
          imageDataUrl: action.imageDataUrl,
          detectedGrid: action.detectedGrid,
          activeTab: 'palette',
        },
        action.detectedGrid,
      )

    case 'UPDATE_GRID':
      return resample(project, action.grid)

    case 'FLIP_IMAGE_HORIZONTAL': {
      // A horizontal flip is a permutation, not a re-sample: cellColors/cellAssignment are
      // row-major cols*rows arrays, so mirroring each row's column order keeps every manual
      // edit (recolors, merges) attached to its correct cell in the new orientation - the
      // palette itself (which colors are used, and how many cells each has) doesn't change at
      // all. Only the undo/redo history is reset, since past snapshots were captured in the
      // pre-flip orientation and would no longer line up.
      if (!project.confirmedGrid || !project.cellColors || !project.cellAssignment || !project.palette) {
        return { ...project, imageData: action.imageData, imageDataUrl: action.imageDataUrl }
      }
      const grid = project.confirmedGrid
      const flippedGrid: DetectedGrid = {
        ...grid,
        bbox: { ...grid.bbox, x: action.imageData.width - grid.bbox.x - grid.bbox.width },
      }
      return {
        ...project,
        imageData: action.imageData,
        imageDataUrl: action.imageDataUrl,
        detectedGrid: flippedGrid,
        confirmedGrid: flippedGrid,
        cellColors: mirrorRowMajorHorizontal(project.cellColors, grid.cols, grid.rows),
        cellAlpha: project.cellAlpha ? mirrorRowMajorHorizontal(project.cellAlpha, grid.cols, grid.rows) : null,
        cellAssignment: mirrorRowMajorHorizontal(project.cellAssignment, grid.cols, grid.rows),
        history: emptyHistory(),
      }
    }

    case 'SET_CLUSTER_THRESHOLD': {
      if (!project.cellColors) return { ...project, clusterThreshold: action.threshold }
      const { palette, cellAssignment } = buildPalette(project.cellColors, action.threshold, {
        mode: project.paletteMode,
        ownedCodes: new Set(project.ownedThreadCodes),
        backgroundCellIndices: backgroundCellIndicesFor(
          project.cellColors,
          project.cellAlpha,
          project.confirmedGrid!,
          project.backgroundColor,
          project.ignoreBackground,
          project.cropShape,
        ),
      })
      return { ...project, clusterThreshold: action.threshold, palette, cellAssignment, history: emptyHistory() }
    }

    case 'SET_FABRIC_COUNT':
      // Switching fabric resets strands to that count's typical usage;
      // the user can still override it afterward via SET_STRANDS.
      return { ...project, fabricCount: action.stitchesPerInch, strands: defaultStrandsFor(action.stitchesPerInch) }

    case 'SET_STRANDS':
      return { ...project, strands: action.strands }

    case 'SET_PALETTE_MODE': {
      if (!project.cellColors) return { ...project, paletteMode: action.mode }
      const { palette, cellAssignment } = buildPalette(project.cellColors, project.clusterThreshold, {
        mode: action.mode,
        ownedCodes: new Set(project.ownedThreadCodes),
        backgroundCellIndices: backgroundCellIndicesFor(
          project.cellColors,
          project.cellAlpha,
          project.confirmedGrid!,
          project.backgroundColor,
          project.ignoreBackground,
          project.cropShape,
        ),
      })
      return { ...project, paletteMode: action.mode, palette, cellAssignment, history: emptyHistory() }
    }

    case 'SET_OWNED_THREADS': {
      const ownedThreadCodes = action.codes
      if (!project.cellColors || !project.palette) return { ...project, ownedThreadCodes }
      if (project.paletteMode === 'ownedOnly') {
        // Which threads get used at all can change, so this is a full
        // regenerate, same as changing the merge threshold.
        const { palette, cellAssignment } = buildPalette(project.cellColors, project.clusterThreshold, {
          mode: project.paletteMode,
          ownedCodes: new Set(ownedThreadCodes),
          backgroundCellIndices: backgroundCellIndicesFor(
            project.cellColors,
            project.cellAlpha,
            project.confirmedGrid!,
            project.backgroundColor,
            project.ignoreBackground,
            project.cropShape,
          ),
        })
        return { ...project, ownedThreadCodes, palette, cellAssignment, history: emptyHistory() }
      }
      // In 'best' mode, ownership doesn't affect color matching, only the
      // informational "owned" flag - patch it in place without discarding
      // any manual edits or undo history.
      const ownedSet = new Set(ownedThreadCodes)
      const palette = project.palette.map((entry) => ({ ...entry, owned: ownedSet.has(entry.dmc.code) }))
      return { ...project, ownedThreadCodes, palette }
    }

    case 'SET_IGNORE_BACKGROUND': {
      if (!project.cellColors || !project.palette) return { ...project, ignoreBackground: action.ignore }
      const { palette, cellAssignment } = buildPalette(project.cellColors, project.clusterThreshold, {
        mode: project.paletteMode,
        ownedCodes: new Set(project.ownedThreadCodes),
        backgroundCellIndices: backgroundCellIndicesFor(
          project.cellColors,
          project.cellAlpha,
          project.confirmedGrid!,
          project.backgroundColor,
          action.ignore,
          project.cropShape,
        ),
      })
      return { ...project, ignoreBackground: action.ignore, palette, cellAssignment, history: emptyHistory() }
    }

    case 'SET_ACTIVE_TAB':
      return { ...project, activeTab: action.tab }

    case 'APPLY_CROP': {
      // Same shape as IMAGE_LOADED (a full re-sample discards manual edits, caller is
      // responsible for confirming that via confirmDestructiveEdit first) but keeps every
      // user-level preference as-is, and lands back on the palette view to show the result.
      // Snapshots the full pre-crop state first (see PatternProject.preCropSnapshot) so a
      // single UNDO_CROP can put it all back - dropping any snapshot the current project was
      // itself carrying, so this stays a one-level undo instead of an unbounded chain.
      const { preCropSnapshot: _discardedPrevSnapshot, ...preCropSnapshot } = project
      return resample(
        {
          ...project,
          imageData: action.imageData,
          imageDataUrl: action.imageDataUrl,
          detectedGrid: action.detectedGrid,
          backgroundColor: action.backgroundColor,
          cropShape: action.cropShape,
          activeTab: 'palette',
          preCropSnapshot,
        },
        action.detectedGrid,
      )
    }

    case 'UNDO_CROP':
      return project.preCropSnapshot ? { ...project.preCropSnapshot, preCropSnapshot: null } : project

    case 'RECOLOR_CELLS': {
      if (!project.cellAssignment || !project.palette || action.cellIndices.length === 0) return project
      const history = pushHistory(project)
      const cellAssignment = [...project.cellAssignment]
      for (const index of action.cellIndices) cellAssignment[index] = action.dmcCode
      return { ...project, history, cellAssignment, palette: recomputeCounts(project.palette, cellAssignment) }
    }

    case 'MERGE_COLOR_INTO': {
      if (!project.cellAssignment || !project.palette) return project
      const history = pushHistory(project)
      const cellAssignment = project.cellAssignment.map((code) => (code === action.fromCode ? action.toCode : code))
      const palette = recomputeCounts(
        project.palette.filter((entry) => entry.dmc.code !== action.fromCode),
        cellAssignment,
      )
      return { ...project, history, cellAssignment, palette }
    }

    case 'RECOLOR_PALETTE_ENTRY': {
      if (!project.cellAssignment || !project.palette) return project
      const { code, newDmc } = action
      if (code === newDmc.code) return project

      const history = pushHistory(project)
      const collidesWithExisting = project.palette.some((entry) => entry.dmc.code === newDmc.code)
      const cellAssignment = project.cellAssignment.map((c) => (c === code ? newDmc.code : c))
      const owned = project.ownedThreadCodes.includes(newDmc.code)

      // If the newly chosen DMC color already exists elsewhere in the
      // palette, the two entries are now identical - merge them instead
      // of keeping two rows for the same thread color.
      const palette = collidesWithExisting
        ? project.palette.filter((entry) => entry.dmc.code !== code)
        : project.palette.map((entry) =>
            entry.dmc.code === code
              ? {
                  ...entry,
                  dmc: newDmc,
                  color: { r: newDmc.r, g: newDmc.g, b: newDmc.b },
                  textColor: contrastTextColor(newDmc),
                  owned,
                  finishAlternative: findFinishAlternative(newDmc),
                }
              : entry,
          )

      return { ...project, history, cellAssignment, palette: recomputeCounts(palette, cellAssignment) }
    }

    case 'DELETE_COLOR': {
      if (!project.cellAssignment || !project.palette) return project
      const history = pushHistory(project)
      const cellAssignment = project.cellAssignment.map((code) => (code === action.code ? EMPTY_CELL : code))
      const palette = recomputeCounts(
        project.palette.filter((entry) => entry.dmc.code !== action.code),
        cellAssignment,
      )
      return { ...project, history, cellAssignment, palette }
    }

    case 'ADD_COLOR': {
      if (!project.cellAssignment || !project.palette) return project
      // Already in the palette - nothing to add, just let the user pick it
      // from the existing list instead of creating a duplicate row.
      if (project.palette.some((entry) => entry.dmc.code === action.dmc.code)) return project

      const history = pushHistory(project)
      const newEntry: PaletteEntry = {
        color: { r: action.dmc.r, g: action.dmc.g, b: action.dmc.b },
        dmc: action.dmc,
        deltaE: 0,
        symbol: '',
        textColor: contrastTextColor(action.dmc),
        count: 0,
        owned: project.ownedThreadCodes.includes(action.dmc.code),
        finishAlternative: findFinishAlternative(action.dmc),
      }
      // Re-running symbol assignment (rather than just picking the next
      // free glyph) keeps every entry's symbol consistent with its count
      // rank; since the new entry starts at count 0 it sorts last and
      // doesn't disturb any existing entry's symbol.
      const palette = assignSymbols([...project.palette, newEntry])
      return { ...project, history, palette }
    }

    case 'UNDO': {
      const previous = project.history.past.at(-1)
      if (!previous || !project.palette || !project.cellAssignment) return project
      const current: EditSnapshot = { palette: project.palette, cellAssignment: project.cellAssignment }
      return {
        ...project,
        palette: previous.palette,
        cellAssignment: previous.cellAssignment,
        history: { past: project.history.past.slice(0, -1), future: [...project.history.future, current] },
      }
    }

    case 'REDO': {
      const next = project.history.future.at(-1)
      if (!next || !project.palette || !project.cellAssignment) return project
      const current: EditSnapshot = { palette: project.palette, cellAssignment: project.cellAssignment }
      return {
        ...project,
        palette: next.palette,
        cellAssignment: next.cellAssignment,
        history: { past: [...project.history.past, current], future: project.history.future.slice(0, -1) },
      }
    }

    case 'RESTORE': {
      // Unlike IMAGE_LOADED, this uses the palette/cellAssignment as saved
      // (not a fresh buildPalette from cellColors) so manual edits survive.
      // The `owned` flag baked into each saved/imported entry can be stale
      // though (e.g. a .xstitch file imported from another device/session,
      // or ownership changed after the last autosave) - always re-derive it
      // from the ownedThreadCodes that are actually in effect now.
      const ownedSet = new Set(action.ownedThreadCodes)
      const palette = action.palette.map((entry) => ({ ...entry, owned: ownedSet.has(entry.dmc.code) }))
      return {
        ...initialProject,
        imageData: action.imageData,
        imageDataUrl: action.imageDataUrl,
        detectedGrid: action.grid,
        confirmedGrid: action.grid,
        cellColors: sampleGridColors(action.imageData, action.grid),
        cellAlpha: sampleGridAlpha(action.imageData, action.grid),
        clusterThreshold: action.clusterThreshold,
        fabricCount: action.fabricCount,
        strands: action.strands,
        paletteMode: action.paletteMode,
        ownedThreadCodes: action.ownedThreadCodes,
        backgroundColor: action.backgroundColor,
        ignoreBackground: action.ignoreBackground,
        cropShape: action.cropShape,
        activeTab: action.activeTab,
        palette,
        cellAssignment: action.cellAssignment,
      }
    }

    case 'RESET':
      return initialProject

    default:
      return project
  }
}
