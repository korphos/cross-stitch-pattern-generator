export interface FabricCount {
  label: string
  stitchesPerInch: number
  /** typical number of strands used for full cross stitch at this count */
  defaultStrands: number
}

/** Standard Aida fabric counts (stitches per inch). */
export const FABRIC_COUNTS: FabricCount[] = [
  { label: 'Aida 11 count', stitchesPerInch: 11, defaultStrands: 3 },
  { label: 'Aida 14 count', stitchesPerInch: 14, defaultStrands: 2 },
  { label: 'Aida 16 count', stitchesPerInch: 16, defaultStrands: 2 },
  { label: 'Aida 18 count', stitchesPerInch: 18, defaultStrands: 1 },
  { label: 'Aida 22 count', stitchesPerInch: 22, defaultStrands: 1 },
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
