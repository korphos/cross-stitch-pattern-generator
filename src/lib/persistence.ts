import type { DetectedGrid, ActiveTab, PaletteEntry } from './types'

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
  activeTab: ActiveTab
  palette: PaletteEntry[]
  cellAssignment: string[]
}

const DB_NAME = 'cross-stitch-pattern-generator'
const DB_VERSION = 1
const STORE_NAME = 'project'
const RECORD_KEY = 'current'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function savePersistedProject(project: PersistedProject): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(project, RECORD_KEY)
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
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(RECORD_KEY)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}
