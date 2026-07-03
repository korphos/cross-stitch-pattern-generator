/**
 * Structural subset of the DOM's ImageData, kept separate so the algorithm
 * layer in src/lib has zero DOM dependency and can be unit-tested with
 * plain synthetic objects under Vitest's node environment.
 */
export interface PixelBuffer {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface RGB {
  r: number
  g: number
  b: number
}

export interface RGBA extends RGB {
  a: number
}

export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

export interface DetectedGrid {
  bbox: BBox
  cellWidth: number
  cellHeight: number
  cols: number
  rows: number
  /** 0-1, fraction of boundary gaps that matched the modal spacing */
  confidence: number
}

export interface DmcColor {
  code: string
  name: string
  r: number
  g: number
  b: number
  /** absent = standard 6-strand cotton floss; set for specialty threads (Light Effects metallics, Satin) */
  finish?: 'metallic' | 'satin'
}

/** A cluster of near-identical sampled cell colors, before DMC matching. */
export interface ClusterEntry {
  id: number
  color: RGB
  count: number
}

export interface PaletteEntry {
  /** the matched DMC thread's RGB - what's actually rendered as the cell fill */
  color: RGB
  dmc: DmcColor
  deltaE: number
  symbol: string
  /** glyph color to draw on top of this cell's fill for print legibility */
  textColor: 'black' | 'white'
  count: number
  /** true if this DMC code is in the user's owned-threads list (see Settings) */
  owned: boolean
  /**
   * A specialty thread (metallic/satin) close enough to this entry's own
   * finish=standard color to offer as a switchable alternative, or - when
   * this entry itself already is a specialty thread - the nearest standard
   * floss, so the user can switch back. Undefined when nothing is close.
   */
  finishAlternative?: { dmc: DmcColor; deltaE: number }
}

export type ActiveTab = 'grid' | 'palette'

/**
 * 'best' matches every color to the closest DMC thread regardless of what
 * the user owns. 'ownedOnly' prefers a thread from the user's inventory
 * when one is close enough, falling back to the single best overall match
 * (flagged as not-owned) when nothing owned is close enough.
 */
export type PaletteMode = 'best' | 'ownedOnly'

/**
 * Sentinel `cellAssignment` value meaning "no stitch" - a blank square
 * with no fill/symbol, e.g. for a background color the user doesn't want
 * to actually stitch. No real DMC code is ever an empty string.
 */
export const EMPTY_CELL = ''

/** A snapshot of the user-editable result, for undo/redo. */
export interface EditSnapshot {
  palette: PaletteEntry[]
  cellAssignment: string[]
}

export interface PatternProject {
  activeTab: ActiveTab
  imageData: PixelBuffer | null
  imageDataUrl: string | null
  detectedGrid: DetectedGrid | null
  /** grid as confirmed/adjusted by the user; drives cell sampling */
  confirmedGrid: DetectedGrid | null
  /** raw sampled color per cell, row-major, length = cols*rows once sampled */
  cellColors: RGB[] | null
  clusterThreshold: number
  palette: PaletteEntry[] | null
  /** DMC code (matches a `palette` entry's `dmc.code`) per cell, row-major */
  cellAssignment: string[] | null
  /** stitches per inch of the fabric the user intends to use */
  fabricCount: number
  /** number of floss strands the user intends to stitch with, for the thread-usage estimate */
  strands: number
  paletteMode: PaletteMode
  /** mirrors the global Settings inventory, kept in sync so buildPalette can use it synchronously */
  ownedThreadCodes: string[]
  /** undo/redo stacks for manual color edits; reset whenever the grid/threshold regenerates the palette from scratch */
  history: { past: EditSnapshot[]; future: EditSnapshot[] }
}
