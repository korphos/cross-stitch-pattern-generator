import { describe, expect, it } from 'vitest'
import { serializeProjectFile, parseProjectFile } from './projectFile'
import type { PersistedProject } from './persistence'
import type { PaletteEntry } from './types'

function makeEntry(code: string): PaletteEntry {
  return {
    color: { r: 10, g: 20, b: 30 },
    dmc: { code, name: code, r: 10, g: 20, b: 30 },
    deltaE: 0,
    symbol: 'A',
    textColor: 'black',
    count: 5,
    owned: false,
  }
}

function makeProject(): PersistedProject {
  return {
    imageDataUrl: 'data:image/png;base64,abc123',
    fileName: 'cat.png',
    grid: { bbox: { x: 0, y: 0, width: 10, height: 10 }, cellSize: 1, cols: 10, rows: 10, confidence: 1 },
    clusterThreshold: 2.3,
    fabricCount: 14,
    strands: 2,
    paletteMode: 'best',
    backgroundColor: { r: 255, g: 255, b: 255 },
    ignoreBackground: true,
    activeTab: 'palette',
    palette: [makeEntry('310')],
    cellAssignment: Array(100).fill('310'),
  }
}

describe('projectFile', () => {
  it('round-trips a project through serialize + parse', () => {
    const project = makeProject()
    const parsed = parseProjectFile(serializeProjectFile(project))
    expect(parsed).toEqual(project)
  })

  it('defaults a missing fileName to null', () => {
    const project = { ...makeProject(), fileName: null }
    const parsed = parseProjectFile(serializeProjectFile(project))
    expect(parsed.fileName).toBeNull()
  })

  it('rejects invalid JSON', () => {
    expect(() => parseProjectFile('not json')).toThrow()
  })

  it('rejects JSON missing required project fields', () => {
    expect(() => parseProjectFile(JSON.stringify({ foo: 'bar' }))).toThrow()
  })

  it('rejects a plain array', () => {
    expect(() => parseProjectFile(JSON.stringify([1, 2, 3]))).toThrow()
  })

  it('defaults background exclusion to off for a file exported before that feature existed', () => {
    const { backgroundColor: _bg, ignoreBackground: _ig, ...legacyProject } = makeProject()
    const parsed = parseProjectFile(JSON.stringify({ version: 1, ...legacyProject }))
    expect(parsed.backgroundColor).toBeNull()
    expect(parsed.ignoreBackground).toBe(false)
  })

  it('migrates a file exported before stitches were forced square (separate cellWidth/cellHeight)', () => {
    const legacyProject = {
      ...makeProject(),
      grid: { bbox: { x: 0, y: 0, width: 10, height: 12 }, cellWidth: 1, cellHeight: 1.4, cols: 10, rows: 10, confidence: 1 },
    }
    const parsed = parseProjectFile(JSON.stringify({ version: 1, ...legacyProject }))
    expect(parsed.grid).toEqual({ bbox: { x: 0, y: 0, width: 10, height: 12 }, cellSize: 1.2, cols: 10, rows: 10, confidence: 1 })
  })
})
