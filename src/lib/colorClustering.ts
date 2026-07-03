import { converter, differenceCiede2000, type Lab } from 'culori'
import type { RGB, ClusterEntry } from './types'

const toLab = converter('lab')
const toRgb = converter('rgb')
const deltaE = differenceCiede2000()

function rgbToLab(rgb: RGB): Lab {
  return toLab({ mode: 'rgb', r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 })
}

function clamp01(v: number | undefined): number {
  return Math.min(1, Math.max(0, v ?? 0))
}

function labToRgb(lab: Lab): RGB {
  const rgb = toRgb(lab)
  return {
    r: Math.round(clamp01(rgb.r) * 255),
    g: Math.round(clamp01(rgb.g) * 255),
    b: Math.round(clamp01(rgb.b) * 255),
  }
}

export interface ClusterResult {
  clusters: ClusterEntry[]
  /** index into `clusters` for each input sample, same order/length as the input array */
  sampleToCluster: number[]
}

/**
 * Merges near-identical sampled colors into clusters, so anti-aliasing /
 * compression noise doesn't produce spuriously distinct DMC matches for
 * what should visually be a single color.
 *
 * Greedy agglomeration: unique colors are processed most-frequent first;
 * each merges into the closest existing cluster centroid (CIEDE2000) if
 * within `deltaEThreshold`, otherwise it starts a new cluster. Centroids
 * are frequency-weighted averages in Lab space.
 */
export function clusterColors(samples: RGB[], deltaEThreshold = 2.3): ClusterResult {
  interface Working {
    id: number
    centroidLab: Lab
    totalCount: number
  }

  const uniqueByKey = new Map<string, { color: RGB; count: number; indices: number[] }>()
  samples.forEach((color, idx) => {
    const key = `${color.r},${color.g},${color.b}`
    const entry = uniqueByKey.get(key)
    if (entry) {
      entry.count++
      entry.indices.push(idx)
    } else {
      uniqueByKey.set(key, { color, count: 1, indices: [idx] })
    }
  })
  const uniques = [...uniqueByKey.values()].sort((a, b) => b.count - a.count)

  const clusters: Working[] = []
  const sampleToCluster = new Array<number>(samples.length).fill(-1)

  for (const u of uniques) {
    const lab = rgbToLab(u.color)

    let bestCluster: Working | null = null
    let bestDist = Infinity
    for (const c of clusters) {
      const d = deltaE(lab, c.centroidLab)
      if (d < bestDist) {
        bestDist = d
        bestCluster = c
      }
    }

    if (bestCluster && bestDist <= deltaEThreshold) {
      const newTotal = bestCluster.totalCount + u.count
      bestCluster.centroidLab = {
        mode: 'lab',
        l: ((bestCluster.centroidLab.l ?? 0) * bestCluster.totalCount + (lab.l ?? 0) * u.count) / newTotal,
        a: ((bestCluster.centroidLab.a ?? 0) * bestCluster.totalCount + (lab.a ?? 0) * u.count) / newTotal,
        b: ((bestCluster.centroidLab.b ?? 0) * bestCluster.totalCount + (lab.b ?? 0) * u.count) / newTotal,
      }
      bestCluster.totalCount = newTotal
      for (const idx of u.indices) sampleToCluster[idx] = bestCluster.id
    } else {
      const id = clusters.length
      clusters.push({ id, centroidLab: lab, totalCount: u.count })
      for (const idx of u.indices) sampleToCluster[idx] = id
    }
  }

  return {
    clusters: clusters.map((c) => ({ id: c.id, color: labToRgb(c.centroidLab), count: c.totalCount })),
    sampleToCluster,
  }
}
