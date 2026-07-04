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
