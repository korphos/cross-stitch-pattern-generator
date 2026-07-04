import type { PersistedProject } from './persistence'

/** Extension used for exported project files. */
export const PROJECT_FILE_EXTENSION = '.xstitch'

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
    throw new Error('This file is not a valid project file (invalid JSON).')
  }
  if (!isRecord(raw)) throw new Error('This file is not a valid project file.')

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
    throw new Error('This file is missing data expected in a cross-stitch project file.')
  }

  return {
    imageDataUrl,
    fileName: typeof fileName === 'string' ? fileName : null,
    grid: grid as PersistedProject['grid'],
    clusterThreshold,
    fabricCount,
    strands,
    paletteMode: paletteMode === 'ownedOnly' ? 'ownedOnly' : 'best',
    // Older exported files predate background exclusion - default to "off"
    // rather than silently blanking cells the exporter never intended to.
    backgroundColor: isRecord(backgroundColor) ? (backgroundColor as PersistedProject['backgroundColor']) : null,
    ignoreBackground: ignoreBackground === true,
    activeTab: activeTab === 'grid' ? 'grid' : 'palette',
    palette: palette as PersistedProject['palette'],
    cellAssignment: cellAssignment as PersistedProject['cellAssignment'],
  }
}
