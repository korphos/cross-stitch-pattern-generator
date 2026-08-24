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

interface UniqueColor {
  color: RGB
  lab: Lab
  count: number
  indices: number[]
}

export interface PreparedColors {
  sampleCount: number
  /** distinct colors, most-frequent first, with their Lab conversion already computed */
  uniques: UniqueColor[]
}

/**
 * Deduplicates `samples` into distinct colors (most-frequent first) and
 * converts each to Lab once - the part of `clusterColors` that doesn't
 * depend on `deltaEThreshold` at all. Split out so a caller that needs the
 * clustering result at several different thresholds for the *same* samples
 * (see `buildPaletteForTargetCount`'s search) can do this once and feed it
 * to `clusterPreparedColors` repeatedly, instead of re-deduplicating and
 * re-converting tens of thousands of colors to Lab on every threshold tried.
 */
export function prepareColors(samples: RGB[]): PreparedColors {
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
  const uniques = [...uniqueByKey.values()]
    .sort((a, b) => b.count - a.count)
    .map((u) => ({ ...u, lab: rgbToLab(u.color) }))
  return { sampleCount: samples.length, uniques }
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
 *
 * The nearest-cluster search below is bucketed on a spatial hash over Lab
 * space instead of scanning every cluster: for a real (non-pixelated) photo,
 * the number of distinct sampled colors can run into the tens of thousands
 * and clusters into the hundreds, and a full scan (unique colors * clusters)
 * measured 20+ seconds on a real ~800x1000 photo, freezing the tab. Only
 * clusters within one bucket-radius of the query can be within
 * `deltaEThreshold` of it, cutting candidates from "every cluster formed so
 * far" down to a handful.
 */
export function clusterPreparedColors(prepared: PreparedColors, deltaEThreshold = 2.3): ClusterResult {
  interface Working {
    id: number
    centroidLab: Lab
    totalCount: number
    bucketKey: string
  }

  const { sampleCount, uniques } = prepared

  // Bucket cells are sized to the threshold, and the search below checks a 5x5x5 neighborhood
  // (+/-2 cells per axis) - twice the +/-1 cell that plain Euclidean-in-Lab distance would
  // require, since CIEDE2000's chroma/hue weighting can put two colors within
  // `deltaEThreshold` of each other even when their raw Lab Euclidean distance runs somewhat
  // higher (e.g. saturated colors, where CIEDE2000 discounts chroma differences more than
  // lightness ones). A bucket too small just means a few more (cheap) neighbor cells to check,
  // not a correctness problem - only a bucket too large would risk missing a real match.
  const bucketSize = Math.max(deltaEThreshold, 0.1)
  const NEIGHBOR_RADIUS = 3
  const buckets = new Map<string, Working[]>()

  const bucketCoord = (v: number) => Math.floor((v ?? 0) / bucketSize)
  const bucketKeyFor = (lab: Lab) => `${bucketCoord(lab.l)},${bucketCoord(lab.a)},${bucketCoord(lab.b)}`

  function neighborCandidates(lab: Lab): Working[] {
    const bl = bucketCoord(lab.l)
    const ba = bucketCoord(lab.a)
    const bb = bucketCoord(lab.b)
    const candidates: Working[] = []
    for (let dl = -NEIGHBOR_RADIUS; dl <= NEIGHBOR_RADIUS; dl++) {
      for (let da = -NEIGHBOR_RADIUS; da <= NEIGHBOR_RADIUS; da++) {
        for (let db = -NEIGHBOR_RADIUS; db <= NEIGHBOR_RADIUS; db++) {
          const bucket = buckets.get(`${bl + dl},${ba + da},${bb + db}`)
          if (bucket) candidates.push(...bucket)
        }
      }
    }
    return candidates
  }

  function placeInBucket(c: Working) {
    const key = bucketKeyFor(c.centroidLab)
    c.bucketKey = key
    const list = buckets.get(key)
    if (list) list.push(c)
    else buckets.set(key, [c])
  }

  // A merge shifts the centroid, which can move it into a different bucket - re-file it so
  // future lookups still find it.
  function relocateIfBucketChanged(c: Working) {
    const newKey = bucketKeyFor(c.centroidLab)
    if (newKey === c.bucketKey) return
    const oldList = buckets.get(c.bucketKey)
    if (oldList) {
      const i = oldList.indexOf(c)
      if (i !== -1) oldList.splice(i, 1)
    }
    placeInBucket(c)
  }

  const clusters: Working[] = []
  const sampleToCluster = new Array<number>(sampleCount).fill(-1)

  for (const u of uniques) {
    const lab = u.lab

    let bestCluster: Working | null = null
    let bestDist = Infinity
    for (const c of neighborCandidates(lab)) {
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
      relocateIfBucketChanged(bestCluster)
    } else {
      const id = clusters.length
      const working: Working = { id, centroidLab: lab, totalCount: u.count, bucketKey: '' }
      clusters.push(working)
      placeInBucket(working)
      for (const idx of u.indices) sampleToCluster[idx] = id
    }
  }

  return {
    clusters: clusters.map((c) => ({ id: c.id, color: labToRgb(c.centroidLab), count: c.totalCount })),
    sampleToCluster,
  }
}

/** Convenience wrapper over `prepareColors` + `clusterPreparedColors` for a one-off clustering pass. */
export function clusterColors(samples: RGB[], deltaEThreshold = 2.3): ClusterResult {
  return clusterPreparedColors(prepareColors(samples), deltaEThreshold)
}
