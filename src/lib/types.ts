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
  /** stitches are always square - one size for both axes */
  cellSize: number
  cols: number
  rows: number
  /** 0-1, fraction of boundary gaps that matched the modal spacing */
  confidence: number
  /**
   * Shifts the point every cell samples its color from, away from the cell's center - e.g. to
   * read a bead pattern photo's ring color instead of a center highlight/reflection. Applies
   * uniformly to every cell, clamped to +/- half the cell size so it can't cross into a
   * neighboring cell. Optional/defaults to 0 (dead center) - undefined on grids detected or
   * saved before this existed.
   */
  sampleOffsetX?: number
  sampleOffsetY?: number
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

export type ActiveTab = 'grid' | 'palette' | 'crop'

/** Shape the image was last cropped to - 'circle' keeps masking the corners (outside the
 * inscribed ellipse) as no-stitch on every resample, since cropping itself only trims the
 * image down to the selection's square bounding box. Null before any crop is applied. */
export type CropShape = 'square' | 'rectangle' | 'circle' | 'oval' | null

/**
 * 'best' matches every color to the closest DMC thread regardless of what
 * the user owns. 'ownedOnly' prefers a thread from the user's inventory
 * when one is close enough, falling back to the single best overall match
 * (flagged as not-owned) when nothing owned is close enough.
 */
export type PaletteMode = 'best' | 'ownedOnly'

/** 'letters' (default) assigns A, B, C... glyphs; 'icons' assigns distinct Unicode shapes
 * (circles, squares, stars...) for users who find same-shaped letters harder to tell apart on a
 * printed grid - see symbolAssignment.ts. */
export type SymbolStyle = 'letters' | 'icons'

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
  /** average alpha (0-255) per cell, same indexing as cellColors - lets background detection tell an actually-transparent cell (a PNG cutout's empty margin) apart from an opaque one that merely shares its RGB */
  cellAlpha: number[] | null
  /** desired final palette size; buildPaletteForTargetCount searches for a merge threshold that lands as close as possible to it. null means "auto" - let buildPaletteAdaptive's default merge threshold decide, which is also what a fresh image/crop/grid resample resets this to. */
  targetColorCount: number | null
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
  /** mirrors the global Settings symbol style, kept in sync so buildPalette/assignSymbols can use it synchronously */
  symbolStyle: SymbolStyle
  /**
   * Modal color of the image's outer border, detected once at load time - the best guess at
   * "background". Includes alpha: a low `.a` means the border is actually transparent (a PNG
   * cutout), in which case background detection switches to alpha-only matching instead of
   * RGB - see backgroundMask.ts.
   */
  backgroundColor: RGBA | null
  /** when true, cells close to `backgroundColor` are left blank (no stitch) instead of matched to a DMC thread */
  ignoreBackground: boolean
  /** see `CropShape` - set by the Crop tab's Apply action, cleared on a fresh image upload */
  cropShape: CropShape
  /**
   * Full project state right before the most recently applied crop, so a single UNDO_CROP can
   * restore it - a crop is a full re-sample (like a grid/threshold change), which normally isn't
   * reversible the way palette edits are via `history`. Session-only: never persisted (autosave,
   * export) and cleared by the next crop or a fresh image upload, so it's a one-level "undo my
   * last crop", not a real stack.
   */
  preCropSnapshot: Omit<PatternProject, 'preCropSnapshot'> | null
  /** undo/redo stacks for manual color edits; reset whenever the grid/threshold regenerates the palette from scratch */
  history: { past: EditSnapshot[]; future: EditSnapshot[] }
}
