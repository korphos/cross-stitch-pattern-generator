import type { DetectedGrid, ActiveTab, PaletteEntry, PaletteMode, RGB } from './types'
import type { SizeUnit } from './physicalSize'

/**
 * Everything needed to fully reconstruct the app on reload. The raw pixel
 * buffer and per-cell sampled colors are NOT stored - they're recomputed
 * from `imageDataUrl` + `grid` on load. `palette`/`cellAssignment` ARE
 * stored as-is (not regenerated from `grid`/`clusterThreshold`) because
 * manual color edits (recolor/merge) can diverge from what a fresh
 * clustering pass would produce; regenerating them would silently discard
 * those edits on every reload.
 */
export interface PersistedProject {
  imageDataUrl: string
  fileName: string | null
  grid: DetectedGrid
  clusterThreshold: number
  fabricCount: number
  strands: number
  paletteMode: PaletteMode
  backgroundColor: RGB | null
  ignoreBackground: boolean
  activeTab: ActiveTab
  palette: PaletteEntry[]
  cellAssignment: string[]
}

/** App-wide settings (not tied to any one pattern project). */
export interface AppSettings {
  /** DMC codes the user has told us they already own a skein of. */
  ownedThreadCodes: string[]
  sizeUnit: SizeUnit
}

export const DEFAULT_SETTINGS: AppSettings = { ownedThreadCodes: [], sizeUnit: 'cm' }

const DB_NAME = 'cross-stitch-pattern-generator'
const DB_VERSION = 2
const PROJECT_STORE_NAME = 'project'
const PROJECT_RECORD_KEY = 'current'
const SETTINGS_STORE_NAME = 'settings'
const SETTINGS_RECORD_KEY = 'app'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PROJECT_STORE_NAME)) db.createObjectStore(PROJECT_STORE_NAME)
      if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) db.createObjectStore(SETTINGS_STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function savePersistedProject(project: PersistedProject): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PROJECT_STORE_NAME, 'readwrite')
      tx.objectStore(PROJECT_STORE_NAME).put(project, PROJECT_RECORD_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function loadPersistedProject(): Promise<PersistedProject | null> {
  const db = await openDb()
  try {
    return await new Promise<PersistedProject | null>((resolve, reject) => {
      const tx = db.transaction(PROJECT_STORE_NAME, 'readonly')
      const request = tx.objectStore(PROJECT_STORE_NAME).get(PROJECT_RECORD_KEY)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SETTINGS_STORE_NAME, 'readwrite')
      tx.objectStore(SETTINGS_STORE_NAME).put(settings, SETTINGS_RECORD_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function loadSettings(): Promise<AppSettings> {
  const db = await openDb()
  try {
    const stored = await new Promise<Partial<AppSettings> | null>((resolve, reject) => {
      const tx = db.transaction(SETTINGS_STORE_NAME, 'readonly')
      const request = tx.objectStore(SETTINGS_STORE_NAME).get(SETTINGS_RECORD_KEY)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
    return { ...DEFAULT_SETTINGS, ...stored }
  } finally {
    db.close()
  }
}
