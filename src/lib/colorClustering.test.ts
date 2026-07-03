import { describe, expect, it } from 'vitest'
import { clusterColors } from './colorClustering'
import type { RGB } from './types'

describe('clusterColors', () => {
  it('merges near-identical colors into a single cluster', () => {
    const samples: RGB[] = [
      { r: 200, g: 50, b: 50 },
      { r: 202, g: 51, b: 49 },
      { r: 198, g: 49, b: 51 },
      { r: 201, g: 50, b: 50 },
    ]
    const { clusters, sampleToCluster } = clusterColors(samples, 2.3)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].count).toBe(4)
    expect(new Set(sampleToCluster).size).toBe(1)
  })

  it('keeps clearly distinct colors in separate clusters', () => {
    const samples: RGB[] = [
      { r: 10, g: 10, b: 10 },
      { r: 245, g: 245, b: 245 },
      { r: 20, g: 160, b: 20 },
    ]
    const { clusters } = clusterColors(samples, 2.3)
    expect(clusters).toHaveLength(3)
  })

  it('maps every sample to a valid cluster index', () => {
    const samples: RGB[] = [
      { r: 10, g: 10, b: 10 },
      { r: 245, g: 245, b: 245 },
      { r: 12, g: 11, b: 9 },
    ]
    const { clusters, sampleToCluster } = clusterColors(samples, 2.3)
    for (const clusterId of sampleToCluster) {
      expect(clusters.some((c) => c.id === clusterId)).toBe(true)
    }
  })

  it('a looser threshold merges more aggressively than a tighter one', () => {
    const samples: RGB[] = [
      { r: 200, g: 50, b: 50 },
      { r: 215, g: 55, b: 55 },
    ]
    const tight = clusterColors(samples, 0.5)
    const loose = clusterColors(samples, 20)
    expect(tight.clusters.length).toBeGreaterThanOrEqual(loose.clusters.length)
    expect(loose.clusters).toHaveLength(1)
  })
})
