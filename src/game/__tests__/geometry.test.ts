import { describe, expect, it } from 'vitest'
import { hitArea } from '../HiddenScene'
import { project } from '../BibleMap'
import maps from '../../content/generated/maps.json'

describe('hidden object hit test', () => {
  const boxes = [{ area: 0, box: [10, 10, 50, 50] as [number, number, number, number] }, { area: 1, box: [20, 20, 5, 5] as [number, number, number, number] }]
  it('picks the smallest box when boxes overlap', () => { expect(hitArea(boxes, 22, 22)).toBe(1); expect(hitArea(boxes, 40, 40)).toBe(0) })
  it('allows a small tolerance and misses outside every box', () => { expect(hitArea(boxes, 9, 30)).toBe(0); expect(hitArea(boxes, 90, 90)).toBe(-1) })
})

describe('map projection', () => {
  it('matches the map size from build_maps.py and puts Jerusalem inside the land view', () => {
    const v = (maps as unknown as Record<string, { bbox: [number, number, number, number]; width: number; height: number }>).land
    const [w, s, e, n] = v.bbox
    const [x1, y1] = project(v as never, e, s)
    expect(Math.round(x1)).toBe(v.width); expect(Math.abs(y1 - v.height)).toBeLessThan(2)
    const [x, y] = project(v as never, 35.23, 31.78)
    expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(v.width); expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(v.height)
    expect(project(v as never, w, n)).toEqual([0, 0])
  })
})
