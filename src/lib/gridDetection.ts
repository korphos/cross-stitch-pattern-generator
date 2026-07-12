import type { PixelBuffer, RGBA, BBox, DetectedGrid } from './types'

function getPixel(img: PixelBuffer, x: number, y: number): RGBA {
  const i = (y * img.width + x) * 4
  return { r: img.data[i], g: img.data[i + 1], b: img.data[i + 2], a: img.data[i + 3] }
}

function colorDelta(a: RGBA, b: RGBA): number {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) + Math.abs(a.a - b.a)
}

function modeColor(samples: RGBA[]): RGBA {
  const counts = new Map<string, { color: RGBA; count: number }>()
  for (const s of samples) {
    const key = `${s.r},${s.g},${s.b},${s.a}`
    const entry = counts.get(key)
    if (entry) entry.count++
    else counts.set(key, { color: s, count: 1 })
  }
  let best: { color: RGBA; count: number } | null = null
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry
  }
  return best!.color
}

/** Modal color of the image's outer border ring, used as the "page" color to trim. */
export function detectBackgroundColor(img: PixelBuffer): RGBA {
  const { width, height } = img
  const ringDepth = Math.max(1, Math.min(3, Math.floor(Math.min(width, height) * 0.02)))
  const samples: RGBA[] = []
  for (let y = 0; y < height; y++) {
    const onBorderRow = y < ringDepth || y >= height - ringDepth
    for (let x = 0; x < width; x++) {
      if (onBorderRow || x < ringDepth || x >= width - ringDepth) {
        samples.push(getPixel(img, x, y))
      }
    }
  }
  return modeColor(samples)
}

/** Tight bounding box of pixels that differ from `bg` by more than `tolerance`. */
export function detectBoundingBox(img: PixelBuffer, bg: RGBA, tolerance = 24): BBox {
  const { width, height } = img
  let minX = width
  let maxX = -1
  let minY = height
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (colorDelta(getPixel(img, x, y), bg) > tolerance) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    // Nothing differs from the background - treat the whole image as content.
    return { x: 0, y: 0, width, height }
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

function computeChangeSignal(img: PixelBuffer, bbox: BBox): { colSignal: number[]; rowSignal: number[] } {
  const { x: bx, y: by, width: bw, height: bh } = bbox
  const colSignal = new Array<number>(bw).fill(0)
  const rowSignal = new Array<number>(bh).fill(0)

  for (let y = 0; y < bh; y++) {
    let prev = getPixel(img, bx, by + y)
    for (let x = 1; x < bw; x++) {
      const cur = getPixel(img, bx + x, by + y)
      colSignal[x] += colorDelta(cur, prev)
      prev = cur
    }
  }
  for (let x = 0; x < bw; x++) {
    let prev = getPixel(img, bx + x, by)
    for (let y = 1; y < bh; y++) {
      const cur = getPixel(img, bx + x, by + y)
      rowSignal[y] += colorDelta(cur, prev)
      prev = cur
    }
  }
  return { colSignal, rowSignal }
}

/**
 * Local maxima above an adaptive threshold (mean + k*stdev), with
 * non-max suppression so a 2-3px-wide anti-aliased edge doesn't produce
 * two neighboring peaks.
 */
function findPeaks(signal: number[], k = 1.5, minGap = 3): number[] {
  const n = signal.length
  if (n === 0) return []
  const mean = signal.reduce((a, b) => a + b, 0) / n
  const variance = signal.reduce((a, b) => a + (b - mean) ** 2, 0) / n
  const threshold = mean + k * Math.sqrt(variance)

  const candidates: number[] = []
  for (let i = 1; i < n - 1; i++) {
    if (signal[i] > threshold && signal[i] >= signal[i - 1] && signal[i] >= signal[i + 1]) {
      candidates.push(i)
    }
  }

  const peaks: number[] = []
  let i = 0
  while (i < candidates.length) {
    let j = i
    let tallest = candidates[i]
    while (j + 1 < candidates.length && candidates[j + 1] - candidates[j] <= minGap) {
      j++
      if (signal[candidates[j]] > signal[tallest]) tallest = candidates[j]
    }
    peaks.push(tallest)
    i = j + 1
  }
  return peaks
}

/** Most frequent gap between consecutive sorted positions (robust to a few missed/extra peaks). */
function modalSpacing(positions: number[]): { spacing: number; confidence: number } {
  const sorted = [...positions].sort((a, b) => a - b)
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.round(sorted[i] - sorted[i - 1])
    if (gap > 0) gaps.push(gap)
  }
  if (gaps.length === 0) return { spacing: 0, confidence: 0 }

  const histogram = new Map<number, number>()
  for (const g of gaps) histogram.set(g, (histogram.get(g) ?? 0) + 1)

  let bestGap = gaps[0]
  let bestCount = 0
  for (const [gap, count] of histogram) {
    if (count > bestCount) {
      bestCount = count
      bestGap = gap
    }
  }
  return { spacing: bestGap, confidence: bestCount / gaps.length }
}

/** Stitches are always square: the column/row spacings are detected independently, then
 * blended into one size, weighted by each axis's own confidence (a noisy axis shouldn't
 * pull the estimate as much as a clean one). */
export function detectCellSize(img: PixelBuffer, bbox: BBox): { cellSize: number; confidence: number } {
  const { colSignal, rowSignal } = computeChangeSignal(img, bbox)
  const colBoundaries = [0, ...findPeaks(colSignal), bbox.width - 1]
  const rowBoundaries = [0, ...findPeaks(rowSignal), bbox.height - 1]

  const col = modalSpacing(colBoundaries)
  const row = modalSpacing(rowBoundaries)
  const colSize = col.spacing || bbox.width
  const rowSize = row.spacing || bbox.height
  const totalConfidence = col.confidence + row.confidence

  return {
    cellSize: totalConfidence > 0 ? (colSize * col.confidence + rowSize * row.confidence) / totalConfidence : (colSize + rowSize) / 2,
    confidence: Math.min(col.confidence, row.confidence),
  }
}

export interface DetectGridOptions {
  /** Euclidean-ish (sum of abs channel diffs) tolerance for what counts as "background". */
  backgroundTolerance?: number
}

export function detectGrid(img: PixelBuffer, options: DetectGridOptions = {}): DetectedGrid {
  const bg = detectBackgroundColor(img)
  const bbox = detectBoundingBox(img, bg, options.backgroundTolerance ?? 24)
  const { cellSize, confidence } = detectCellSize(img, bbox)

  const cols = Math.max(1, Math.round(bbox.width / cellSize))
  const rows = Math.max(1, Math.round(bbox.height / cellSize))

  return { bbox, cellSize, cols, rows, confidence, sampleOffsetX: 0, sampleOffsetY: 0 }
}

/**
 * Accepts either the current DetectedGrid shape or the pre-square-cells shape (separate
 * cellWidth/cellHeight, from a project saved/exported before stitches were forced square) -
 * averages the two into one cellSize so old localStorage/.xstitch data still loads instead
 * of producing NaN geometry.
 */
export function migrateLegacyGrid(raw: Record<string, unknown>): DetectedGrid {
  const cellSize =
    typeof raw.cellSize === 'number'
      ? raw.cellSize
      : ((raw.cellWidth as number) + (raw.cellHeight as number)) / 2
  return {
    bbox: raw.bbox as BBox,
    cellSize,
    cols: raw.cols as number,
    rows: raw.rows as number,
    confidence: raw.confidence as number,
    sampleOffsetX: typeof raw.sampleOffsetX === 'number' ? raw.sampleOffsetX : 0,
    sampleOffsetY: typeof raw.sampleOffsetY === 'number' ? raw.sampleOffsetY : 0,
  }
}
