import { describe, expect, it } from 'vitest'
import { projectReducer, initialProject } from './projectReducer'
import type { PatternProject, PaletteEntry, DmcColor } from './types'

function makeEntry(code: string, count: number): PaletteEntry {
  return {
    color: { r: 10, g: 20, b: 30 },
    dmc: { code, name: code, r: 10, g: 20, b: 30 },
    deltaE: 0,
    symbol: 'A',
    textColor: 'black',
    count,
    owned: false,
  }
}

function makeProject(overrides: Partial<PatternProject> = {}): PatternProject {
  return {
    ...initialProject,
    palette: [makeEntry('310', 4)],
    cellAssignment: ['310', '310', '310', '310'],
    ...overrides,
  }
}

const newDmc: DmcColor = { code: '666', name: 'Bright Red', r: 227, g: 29, b: 66 }

describe('projectReducer ADD_COLOR', () => {
  it('adds a new palette entry with zero count and no cells assigned', () => {
    const project = makeProject()
    const next = projectReducer(project, { type: 'ADD_COLOR', dmc: newDmc })
    const added = next.palette?.find((p) => p.dmc.code === '666')
    expect(added).toBeDefined()
    expect(added?.count).toBe(0)
    expect(next.cellAssignment).toEqual(project.cellAssignment)
  })

  it('does not disturb the symbol of existing entries', () => {
    const project = makeProject()
    const next = projectReducer(project, { type: 'ADD_COLOR', dmc: newDmc })
    const existing = next.palette?.find((p) => p.dmc.code === '310')
    expect(existing?.symbol).toBe(project.palette![0].symbol)
  })

  it('is a no-op if the color is already in the palette', () => {
    const project = makeProject()
    const next = projectReducer(project, { type: 'ADD_COLOR', dmc: { code: '310', name: 'x', r: 0, g: 0, b: 0 } })
    expect(next.palette).toEqual(project.palette)
    expect(next.history.past).toHaveLength(0)
  })

  it('flags the new entry as owned when its code is in the inventory', () => {
    const project = makeProject({ ownedThreadCodes: ['666'] })
    const next = projectReducer(project, { type: 'ADD_COLOR', dmc: newDmc })
    expect(next.palette?.find((p) => p.dmc.code === '666')?.owned).toBe(true)
  })

  it('is undoable', () => {
    const project = makeProject()
    const added = projectReducer(project, { type: 'ADD_COLOR', dmc: newDmc })
    const undone = projectReducer(added, { type: 'UNDO' })
    expect(undone.palette).toEqual(project.palette)
  })
})

describe('projectReducer RECOLOR_CELLS', () => {
  it('recolors every listed cell to the same code in one step', () => {
    const project = makeProject({
      palette: [makeEntry('310', 3), makeEntry('666', 1)],
      cellAssignment: ['310', '310', '310', '666'],
    })
    const next = projectReducer(project, { type: 'RECOLOR_CELLS', cellIndices: [0, 2], dmcCode: '666' })
    expect(next.cellAssignment).toEqual(['666', '310', '666', '666'])
  })

  it('recomputes counts for every affected color', () => {
    const project = makeProject({
      palette: [makeEntry('310', 3), makeEntry('666', 1)],
      cellAssignment: ['310', '310', '310', '666'],
    })
    const next = projectReducer(project, { type: 'RECOLOR_CELLS', cellIndices: [0, 2], dmcCode: '666' })
    expect(next.palette?.find((p) => p.dmc.code === '310')?.count).toBe(1)
    expect(next.palette?.find((p) => p.dmc.code === '666')?.count).toBe(3)
  })

  it('undoes the whole batch in a single step', () => {
    const project = makeProject({
      palette: [makeEntry('310', 3), makeEntry('666', 1)],
      cellAssignment: ['310', '310', '310', '666'],
    })
    const next = projectReducer(project, { type: 'RECOLOR_CELLS', cellIndices: [0, 1, 2], dmcCode: '666' })
    const undone = projectReducer(next, { type: 'UNDO' })
    expect(undone.cellAssignment).toEqual(project.cellAssignment)
  })

  it('is a no-op for an empty selection', () => {
    const project = makeProject()
    const next = projectReducer(project, { type: 'RECOLOR_CELLS', cellIndices: [], dmcCode: '666' })
    expect(next).toBe(project)
  })
})

describe('projectReducer SET_SYMBOL_STYLE', () => {
  it('re-glyphs every entry from the icon pool, keeping cellAssignment/history/counts untouched', () => {
    const project = makeProject({
      palette: [
        { ...makeEntry('310', 4), symbol: 'A' },
        { ...makeEntry('666', 2), symbol: 'B' },
      ],
    })
    const next = projectReducer(project, { type: 'SET_SYMBOL_STYLE', style: 'icons' })
    expect(next.symbolStyle).toBe('icons')
    expect(next.palette?.[0].symbol).toBe('●')
    expect(next.palette?.[1].symbol).toBe('■')
    expect(next.palette?.map((p) => p.dmc.code)).toEqual(['310', '666'])
    expect(next.palette?.map((p) => p.count)).toEqual([4, 2])
    expect(next.cellAssignment).toEqual(project.cellAssignment)
    expect(next.history).toBe(project.history)
  })

  it('does not re-sort by count - a stale order from a manual recolor is preserved', () => {
    const project = makeProject({
      palette: [
        { ...makeEntry('310', 2), symbol: 'A' },
        { ...makeEntry('666', 40), symbol: 'B' },
      ],
    })
    const next = projectReducer(project, { type: 'SET_SYMBOL_STYLE', style: 'icons' })
    expect(next.palette?.map((p) => p.dmc.code)).toEqual(['310', '666'])
  })

  it('just sets the field when no palette exists yet', () => {
    const next = projectReducer(initialProject, { type: 'SET_SYMBOL_STYLE', style: 'icons' })
    expect(next.symbolStyle).toBe('icons')
    expect(next.palette).toBeNull()
  })
})

describe('projectReducer SET_TARGET_COLOR_COUNT', () => {
  it('just sets the field when no cellColors exist yet', () => {
    const next = projectReducer(initialProject, { type: 'SET_TARGET_COLOR_COUNT', targetColorCount: 12 })
    expect(next.targetColorCount).toBe(12)
    expect(next.palette).toBeNull()
  })
})

describe('projectReducer resample resets a pinned target color count back to "auto"', () => {
  // A pinned target reflects a specific prior image's palette - carrying it over onto fresh
  // content (a new upload, an edited grid, a new crop) would force that unrelated number onto
  // colors it was never chosen for, so every resample path drops back to "auto" (null).
  const imageData = { data: new Uint8ClampedArray([255, 255, 255, 255]), width: 1, height: 1 }
  const grid = { bbox: { x: 0, y: 0, width: 1, height: 1 }, cellSize: 1, cols: 1, rows: 1, confidence: 1 }
  const backgroundColor = { r: 255, g: 255, b: 255, a: 255 }

  it('IMAGE_LOADED resets to auto', () => {
    const project = makeProject({ targetColorCount: 12 })
    const next = projectReducer(project, {
      type: 'IMAGE_LOADED',
      imageData,
      imageDataUrl: 'data:image/png;base64,x',
      detectedGrid: grid,
      backgroundColor,
    })
    expect(next.targetColorCount).toBeNull()
  })

  it('UPDATE_GRID resets to auto', () => {
    const project = makeProject({ targetColorCount: 12, imageData, confirmedGrid: grid })
    const next = projectReducer(project, { type: 'UPDATE_GRID', grid })
    expect(next.targetColorCount).toBeNull()
  })

  it('APPLY_CROP resets to auto', () => {
    const project = makeProject({ targetColorCount: 12, imageData, confirmedGrid: grid })
    const next = projectReducer(project, {
      type: 'APPLY_CROP',
      imageData,
      imageDataUrl: 'data:image/png;base64,cropped',
      detectedGrid: grid,
      backgroundColor,
      cropShape: 'square',
    })
    expect(next.targetColorCount).toBeNull()
  })
})

describe('projectReducer FLIP_IMAGE_HORIZONTAL', () => {
  function makeFlippableProject(): PatternProject {
    return makeProject({
      imageData: { data: new Uint8ClampedArray(40 * 20 * 4), width: 40, height: 20 },
      confirmedGrid: { bbox: { x: 5, y: 0, width: 20, height: 20 }, cellSize: 10, cols: 2, rows: 2, confidence: 1 },
      cellColors: [
        { r: 1, g: 0, b: 0 },
        { r: 2, g: 0, b: 0 },
        { r: 3, g: 0, b: 0 },
        { r: 4, g: 0, b: 0 },
      ],
      cellAssignment: ['A', 'B', 'C', 'D'],
      palette: [makeEntry('A', 1), makeEntry('B', 1), makeEntry('C', 1), makeEntry('D', 1)],
    })
  }

  it('reverses column order within each row, preserving manual edits by position', () => {
    const project = makeFlippableProject()
    const flippedImageData = { data: new Uint8ClampedArray(40 * 20 * 4), width: 40, height: 20 }
    const next = projectReducer(project, {
      type: 'FLIP_IMAGE_HORIZONTAL',
      imageData: flippedImageData,
      imageDataUrl: 'data:image/png;base64,flipped',
    })
    expect(next.cellAssignment).toEqual(['B', 'A', 'D', 'C'])
    expect(next.cellColors).toEqual([
      { r: 2, g: 0, b: 0 },
      { r: 1, g: 0, b: 0 },
      { r: 4, g: 0, b: 0 },
      { r: 3, g: 0, b: 0 },
    ])
  })

  it('recomputes bbox.x to point at the same visual region, keeping the same cell size', () => {
    const project = makeFlippableProject()
    const next = projectReducer(project, {
      type: 'FLIP_IMAGE_HORIZONTAL',
      imageData: { data: new Uint8ClampedArray(40 * 20 * 4), width: 40, height: 20 },
      imageDataUrl: 'data:image/png;base64,flipped',
    })
    // imageWidth(40) - bbox.x(5) - bbox.width(20) = 15
    expect(next.confirmedGrid?.bbox).toEqual({ x: 15, y: 0, width: 20, height: 20 })
    expect(next.confirmedGrid?.cellSize).toBe(10)
    expect(next.confirmedGrid?.cols).toBe(2)
  })

  it('leaves the palette (colors and counts) untouched', () => {
    const project = makeFlippableProject()
    const next = projectReducer(project, {
      type: 'FLIP_IMAGE_HORIZONTAL',
      imageData: { data: new Uint8ClampedArray(40 * 20 * 4), width: 40, height: 20 },
      imageDataUrl: 'data:image/png;base64,flipped',
    })
    expect(next.palette).toEqual(project.palette)
  })

  it('resets the undo/redo history', () => {
    const project = makeFlippableProject()
    const withHistory = projectReducer(project, { type: 'RECOLOR_CELLS', cellIndices: [0], dmcCode: 'D' })
    expect(withHistory.history.past.length).toBeGreaterThan(0)
    const next = projectReducer(withHistory, {
      type: 'FLIP_IMAGE_HORIZONTAL',
      imageData: { data: new Uint8ClampedArray(40 * 20 * 4), width: 40, height: 20 },
      imageDataUrl: 'data:image/png;base64,flipped',
    })
    expect(next.history.past).toHaveLength(0)
    expect(next.history.future).toHaveLength(0)
  })
})

describe('projectReducer RESTORE', () => {
  const restoreArgs = {
    imageData: { data: new Uint8ClampedArray(4), width: 1, height: 1 },
    imageDataUrl: 'data:image/png;base64,x',
    grid: { bbox: { x: 0, y: 0, width: 1, height: 1 }, cellSize: 1, cols: 1, rows: 1, confidence: 1 },
    targetColorCount: 30,
    fabricCount: 14,
    strands: 2,
    paletteMode: 'best' as const,
    symbolStyle: 'letters' as const,
    backgroundColor: null,
    ignoreBackground: false,
    cropShape: null,
    activeTab: 'palette' as const,
    cellAssignment: ['310'],
  }

  it('re-derives owned from the currently effective ownedThreadCodes, not whatever was baked into the saved/imported palette', () => {
    // Simulates importing a .xstitch file (or restoring a stale autosave) where the
    // palette entry's own `owned` flag disagrees with this device's current inventory -
    // e.g. exported from another session before 310 was marked owned locally.
    const staleEntry = { ...makeEntry('310', 1), owned: false }
    const next = projectReducer(initialProject, {
      type: 'RESTORE',
      ...restoreArgs,
      ownedThreadCodes: ['310'],
      palette: [staleEntry],
    })
    expect(next.palette?.[0].owned).toBe(true)
  })

  it('marks entries not in ownedThreadCodes as not owned, even if the saved palette said otherwise', () => {
    const staleEntry = { ...makeEntry('310', 1), owned: true }
    const next = projectReducer(initialProject, {
      type: 'RESTORE',
      ...restoreArgs,
      ownedThreadCodes: [],
      palette: [staleEntry],
    })
    expect(next.palette?.[0].owned).toBe(false)
  })
})
