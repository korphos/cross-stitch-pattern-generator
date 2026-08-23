export interface FabricCount {
  /** key into the `fabricCounts` translation namespace, e.g. t(`fabricCounts.${labelKey}`) */
  labelKey: string
  stitchesPerInch: number
  /** typical number of strands used for full cross stitch at this count */
  defaultStrands: number
}

/** Standard Aida fabric counts (stitches per inch). */
export const FABRIC_COUNTS: FabricCount[] = [
  { labelKey: 'aida6', stitchesPerInch: 6, defaultStrands: 6 },
  { labelKey: 'aida8', stitchesPerInch: 8, defaultStrands: 4 },
  { labelKey: 'aida11', stitchesPerInch: 11, defaultStrands: 3 },
  { labelKey: 'aida14', stitchesPerInch: 14, defaultStrands: 2 },
  { labelKey: 'aida16', stitchesPerInch: 16, defaultStrands: 2 },
  { labelKey: 'aida18', stitchesPerInch: 18, defaultStrands: 1 },
  { labelKey: 'aida20', stitchesPerInch: 20, defaultStrands: 1 },
  { labelKey: 'aida22', stitchesPerInch: 22, defaultStrands: 1 },
  { labelKey: 'aida28', stitchesPerInch: 28, defaultStrands: 1 },
]

const CM_PER_INCH = 2.54

export type SizeUnit = 'cm' | 'in'

export interface PhysicalSize {
  widthCm: number
  heightCm: number
}

export function computePhysicalSize(cols: number, rows: number, stitchesPerInch: number): PhysicalSize {
  return {
    widthCm: (cols / stitchesPerInch) * CM_PER_INCH,
    heightCm: (rows / stitchesPerInch) * CM_PER_INCH,
  }
}

export function formatPhysicalSize(size: PhysicalSize, unit: SizeUnit = 'cm'): string {
  if (unit === 'in') {
    return `${(size.widthCm / CM_PER_INCH).toFixed(1)} in x ${(size.heightCm / CM_PER_INCH).toFixed(1)} in`
  }
  return `${size.widthCm.toFixed(1)} cm x ${size.heightCm.toFixed(1)} cm`
}
