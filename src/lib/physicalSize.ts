export interface FabricCount {
  label: string
  stitchesPerInch: number
}

/** Standard Aida fabric counts (stitches per inch). */
export const FABRIC_COUNTS: FabricCount[] = [
  { label: 'Aida 11 count', stitchesPerInch: 11 },
  { label: 'Aida 14 count', stitchesPerInch: 14 },
  { label: 'Aida 16 count', stitchesPerInch: 16 },
  { label: 'Aida 18 count', stitchesPerInch: 18 },
  { label: 'Aida 22 count', stitchesPerInch: 22 },
]

const CM_PER_INCH = 2.54

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

export function formatPhysicalSize(size: PhysicalSize): string {
  return `${size.widthCm.toFixed(1)} cm x ${size.heightCm.toFixed(1)} cm`
}
