import type { PersistedProject } from './persistence'
import type { ActiveTab } from './types'
import { migrateLegacyGrid } from './gridDetection'

/** Extension used for exported project files. */
export const PROJECT_FILE_EXTENSION = '.xstitch'

/**
 * Stable error message identifiers (not user-facing prose) - the UI layer maps these to a
 * translated string via i18next's `errors.*` keys, since this lib has no access to `t()`.
 */
export const INVALID_JSON_ERROR = 'INVALID_JSON_ERROR'
export const INVALID_PROJECT_FILE_ERROR = 'INVALID_PROJECT_FILE_ERROR'
export const MISSING_PROJECT_DATA_ERROR = 'MISSING_PROJECT_DATA_ERROR'

const PROJECT_FILE_VERSION = 1

interface ProjectFile extends PersistedProject {
  version: number
}

/**
 * Everything needed to recreate the pattern elsewhere: the original image,
 * grid, and every manual edit (recolors, merges, deletions) already baked
 * into `palette`/`cellAssignment`. Deliberately excludes app-wide settings
 * (owned-threads inventory, size unit) - those belong to the person using
 * the app, not to the pattern itself.
 */
export function serializeProjectFile(project: PersistedProject): string {
  const file: ProjectFile = { version: PROJECT_FILE_VERSION, ...project }
  return JSON.stringify(file)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Parses and validates an exported project file. Throws with a user-facing message if the file isn't a recognizable project. */
export function parseProjectFile(text: string): PersistedProject {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error(INVALID_JSON_ERROR)
  }
  if (!isRecord(raw)) throw new Error(INVALID_PROJECT_FILE_ERROR)

  const {
    imageDataUrl,
    grid,
    palette,
    cellAssignment,
    fabricCount,
    strands,
    clusterThreshold,
    paletteMode,
    activeTab,
    fileName,
    backgroundColor,
    ignoreBackground,
    cropShape,
  } = raw as Partial<ProjectFile>

  if (
    typeof imageDataUrl !== 'string' ||
    !isRecord(grid) ||
    !Array.isArray(palette) ||
    !Array.isArray(cellAssignment) ||
    typeof fabricCount !== 'number' ||
    typeof strands !== 'number' ||
    typeof clusterThreshold !== 'number'
  ) {
    throw new Error(MISSING_PROJECT_DATA_ERROR)
  }

  return {
    imageDataUrl,
    fileName: typeof fileName === 'string' ? fileName : null,
    // Older exported files may predate square-only stitches (separate cellWidth/cellHeight) - migrate.
    grid: migrateLegacyGrid(grid),
    clusterThreshold,
    fabricCount,
    strands,
    paletteMode: paletteMode === 'ownedOnly' ? 'ownedOnly' : 'best',
    // Older exported files predate background exclusion - default to "off"
    // rather than silently blanking cells the exporter never intended to.
    backgroundColor: isRecord(backgroundColor) ? (backgroundColor as PersistedProject['backgroundColor']) : null,
    ignoreBackground: ignoreBackground === true,
    // Older exported files predate cropping entirely - default to no mask.
    cropShape: cropShape === 'circle' || cropShape === 'square' ? cropShape : null,
    activeTab: (['grid', 'crop'] as ActiveTab[]).includes(activeTab as ActiveTab) ? (activeTab as ActiveTab) : 'palette',
    palette: palette as PersistedProject['palette'],
    cellAssignment: cellAssignment as PersistedProject['cellAssignment'],
  }
}
