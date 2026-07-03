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
}

export type WizardStep = 'upload' | 'adjust' | 'palette' | 'print'

export interface PatternProject {
  step: WizardStep
  imageData: PixelBuffer | null
  imageDataUrl: string | null
  detectedGrid: DetectedGrid | null
  /** grid as confirmed/adjusted by the user; drives cell sampling */
  confirmedGrid: DetectedGrid | null
  /** raw sampled color per cell, row-major, length = cols*rows once sampled */
  cellColors: RGB[] | null
  clusterThreshold: number
  palette: PaletteEntry[] | null
  /** index into `palette` per cell, row-major */
  cellAssignment: number[] | null
  /** stitches per inch of the fabric the user intends to use */
  fabricCount: number
}
