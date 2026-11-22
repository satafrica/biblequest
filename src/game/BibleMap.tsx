import { useMemo } from 'react'
import mapsJson from '../content/generated/maps.json'
import type { MapMarker, QuestionExtra } from '../engine'

interface MapView { title: string; bbox: [number, number, number, number]; width: number; height: number; land: string; lakes: string; rivers: string }
const MAPS = mapsJson as unknown as Record<'land' | 'east' | 'med', MapView>

/** Same projection as scripts/build_maps.py: equirectangular, scaled by the cosine of the middle latitude. */
export function project(view: MapView, lon: number, lat: number): [number, number] {
  const [w, s, e, n] = view.bbox
  const c = Math.cos(((s + n) / 2) * Math.PI / 180)
  const k = 1000 / ((e - w) * c)
  return [(lon - w) * c * k, (n - lat) * k]
}

// Reference labels for orientation (seas and regions). A label is hidden when its name appears in the
// question or options, so it never gives an answer away.
const LABELS: Record<string, { text: string; lon: number; lat: number; size?: number; water?: boolean; keys?: string[] }[]> = {
  land: [
    { text: 'Great Sea (Mediterranean)', lon: 34.25, lat: 32.55, water: true, keys: ['great sea', 'mediterranean'] },
    { text: 'Sea of Galilee', lon: 35.78, lat: 32.98, water: true, size: 22, keys: ['galilee', 'chinnereth', 'gennesaret', 'tiberias'] },
    { text: 'Salt Sea (Dead Sea)', lon: 35.58, lat: 31.12, water: true, size: 22, keys: ['salt sea', 'dead sea'] },
    { text: 'Jordan', lon: 35.62, lat: 32.25, water: true, size: 22 },
  ],
  east: [
    { text: 'Mediterranean Sea', lon: 28.2, lat: 34.0, water: true, keys: ['mediterranean', 'great sea'] },
    { text: 'Red Sea', lon: 37.3, lat: 24.6, water: true },
    { text: 'Persian Gulf', lon: 48.6, lat: 28.4, water: true, size: 20 },
    { text: 'Egypt', lon: 29.5, lat: 26.5 },
    { text: 'Arabia', lon: 43.5, lat: 25.5 },
    { text: 'Asia Minor', lon: 32.5, lat: 39.2 },
  ],
  med: [
    { text: 'Mediterranean Sea', lon: 18.5, lat: 34.3, water: true, keys: ['mediterranean', 'great sea'] },
    { text: 'Italy', lon: 15.6, lat: 41.3 },
    { text: 'Macedonia', lon: 22.6, lat: 41.2, size: 20 },
    { text: 'Asia Minor', lon: 32.5, lat: 39.4 },
    { text: 'Egypt', lon: 29.0, lat: 30.6 },
  ],
}

export type MarkerState = 'idle' | 'correct' | 'wrong'

/**
 * A reviewed outline map (Natural Earth, public domain) with question markers placed from the
 * OpenBible.info Bible Geocoding Data (CC BY 4.0). Markers carry letters for "which marker" questions.
 */
export function BibleMap({ map, hideText, states, revealLabel }: {
  map: NonNullable<QuestionExtra['map']>
  /** Question text and options; reference labels whose names appear here are not drawn. */
  hideText: string
  /** Per-marker state after answering (locate questions). */
  states?: MarkerState[]
  /** Name to print beside the single marker after answering (identify questions). */
  revealLabel?: string
}) {
  const view = MAPS[map.view]
  const pts = useMemo(() => map.markers.map((m) => project(view, m.lon, m.lat)), [map, view])
  // Zoom to the markers on the tall Holy Land map; the wider maps are shown whole.
  const vb = useMemo(() => {
    if (map.view !== 'land') return [0, 0, view.width, view.height]
    const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1])
    let x0 = Math.min(...xs) - 110, x1 = Math.max(...xs) + 110, y0 = Math.min(...ys) - 110, y1 = Math.max(...ys) + 110
    const minW = 760, minH = 640
    if (x1 - x0 < minW) { const c = (x0 + x1) / 2; x0 = c - minW / 2; x1 = c + minW / 2 }
    if (y1 - y0 < minH) { const c = (y0 + y1) / 2; y0 = c - minH / 2; y1 = c + minH / 2 }
    const clamp = (a: number, b: number, max: number): [number, number] => { const w = b - a; if (w >= max) return [0, max]; if (a < 0) return [0, w]; if (b > max) return [max - w, max]; return [a, b] }
    ;[x0, x1] = clamp(x0, x1, view.width); [y0, y1] = clamp(y0, y1, view.height)
    return [x0, y0, x1 - x0, y1 - y0]
  }, [map.view, pts, view])
  const scale = vb[2] / 1000
  const lower = hideText.toLowerCase()
  const labels = (LABELS[map.view] ?? []).filter((l) => !(l.keys ?? [l.text.toLowerCase()]).some((k) => lower.includes(k)))
  // Markers and labels are sized against the visible area so they stay readable on a phone.
  const r = 27 * scale
  const textW = (t: string, size: number) => t.length * size * 0.52
  const left = vb[0] + 6 * scale, right = vb[0] + vb[2] - 6 * scale
  const describe = map.kind === 'locate'
    ? `Map of ${view.title} with ${map.markers.length} lettered markers: ${map.markers.map((m) => m.label).join(', ')}.`
    : `Map of ${view.title} with one marked place.`

  return (
    <figure className="mb-5 overflow-hidden rounded-2xl border border-line/70 bg-[#dfe9ee] dark:bg-[#1d2f3c]" data-testid="bible-map">
      <svg viewBox={vb.join(' ')} className="block max-h-[50vh] w-full" role="img" aria-label={describe}>
        <rect x={0} y={0} width={view.width} height={view.height} className="fill-[#cfe0ea] dark:fill-[#17303f]" />
        <path d={view.land} className="fill-[#efe6cf] stroke-[#b9a98a] dark:fill-[#3a3a33] dark:stroke-[#6d6656]" strokeWidth={1.2 * scale} />
        {view.lakes && <path d={view.lakes} className="fill-[#a9c9dc] stroke-[#7fa6bd] dark:fill-[#25526b]" strokeWidth={1 * scale} />}
        {view.rivers && <path d={view.rivers} fill="none" className="stroke-[#5f93b3] dark:stroke-[#4f8fb5]" strokeWidth={2.4 * scale} strokeLinecap="round" strokeLinejoin="round" />}
        {labels.map((l) => {
          const [px, y] = project(view, l.lon, l.lat)
          const size = (l.size ?? 26) * 1.35 * scale
          const half = textW(l.text, size) / 2
          if (y < vb[1] + size || y > vb[1] + vb[3] - 4 || half * 2 > right - left) return null
          const x = Math.min(Math.max(px, left + half), right - half)
          return (
            <text key={l.text} x={x} y={y} textAnchor="middle" fontSize={size} fontStyle={l.water ? 'italic' : undefined}
              className={l.water ? 'fill-[#3f6f8c] dark:fill-[#9cc3db]' : 'fill-[#7a6a4b] dark:fill-[#c8b88f]'} style={{ letterSpacing: l.water ? 0.5 : 2 }} aria-hidden="true">{l.text}</text>
          )
        })}
        {pts.map(([x, y], i) => {
          const m: MapMarker = map.markers[i]
          const st = states?.[i] ?? 'idle'
          const fill = st === 'correct' ? '#1f8a5b' : st === 'wrong' ? '#b3402e' : map.kind === 'identify' ? '#b3402e' : '#142B40'
          return (
            <g key={i} data-marker={m.label ?? 'place'} data-state={st}>
              {map.kind === 'identify' && st === 'idle' && <circle cx={x} cy={y} r={r * 1.9} fill="none" stroke="#b3402e" strokeWidth={3 * scale} opacity={0.5} className="map-pulse" />}
              <circle cx={x} cy={y} r={m.label ? r : r * 0.6} fill={fill} stroke="#fff" strokeWidth={3 * scale} />
              {m.label && <text x={x} y={y + 11 * scale} textAnchor="middle" fontSize={31 * scale} fontWeight={700} fill="#fff" aria-hidden="true">{m.label}</text>}
              {revealLabel && i === 0 && (
                <text x={x + r * 1.2 + textW(revealLabel, 34 * scale) > right ? x - r * 1.2 : x + r * 1.2} textAnchor={x + r * 1.2 + textW(revealLabel, 34 * scale) > right ? 'end' : 'start'}
                  y={y - r * 0.9 < vb[1] + 34 * scale ? y + r * 2.2 : y - r * 0.9} fontSize={34 * scale} fontWeight={700} className="fill-[#142B40] dark:fill-white" paintOrder="stroke" stroke="rgba(255,255,255,.85)" strokeWidth={5 * scale}>{revealLabel}</text>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption className="flex flex-wrap justify-between gap-x-3 px-3 py-1.5 text-[11px] text-muted">
        <span>{view.title}</span>
        <span>Places: OpenBible.info (CC BY 4.0) · Map: Natural Earth. Some ancient sites are uncertain.</span>
      </figcaption>
    </figure>
  )
}
