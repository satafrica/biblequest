import { useRef, useState } from 'react'
import { Illustration } from '../components/ui'
import type { QuestionExtra } from '../engine'

type Box = NonNullable<QuestionExtra['boxes']>[number]

/**
 * Which tap area a point falls in. Points are percentages of the picture. When boxes overlap, the
 * smallest one wins (so a small object inside a large one can still be found). A small tolerance
 * helps on phones. Returns -1 when the tap is outside every area.
 */
export function hitArea(boxes: Box[], x: number, y: number, tolerance = 2): number {
  let best = -1; let bestSize = Infinity
  for (const { area, box: [bx, by, bw, bh] } of boxes) {
    if (x >= bx - tolerance && x <= bx + bw + tolerance && y >= by - tolerance && y <= by + bh + tolerance) {
      const size = bw * bh
      if (size < bestSize) { best = area; bestSize = size }
    }
  }
  return best
}

/**
 * Hidden Object: the player taps the object in the picture. The tap is turned into one of the
 * neutral "Area n" choices and checked by the server like any other answer, so the answer is never
 * in the page. Keyboard users can move between areas with Tab (those buttons ignore
 * pointer taps, so a tap always goes through the smallest-box test).
 */
export function HiddenScene({ path, alt, boxes, areaCount, locked, chosen, correct, disabled, onPick }: {
  path: string; alt: string; boxes: Box[]; areaCount: number; locked: boolean
  chosen: number | null; correct?: number; disabled: boolean; onPick: (area: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [miss, setMiss] = useState<{ x: number; y: number; n: number } | null>(null)
  const [tap, setTap] = useState<{ x: number; y: number } | null>(null)
  const onClick = (e: React.MouseEvent) => {
    if (locked || disabled || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100; const y = ((e.clientY - r.top) / r.height) * 100
    const a = hitArea(boxes, x, y)
    setTap({ x, y })
    if (a < 0) { setMiss((m) => ({ x, y, n: (m?.n ?? 0) + 1 })); return }
    setMiss(null); onPick(a)
  }
  const firstBox = (a: number) => boxes.find((b) => b.area === a)?.box
  const outline = (a: number, tone: 'good' | 'bad') => boxes.filter((b) => b.area === a).map((b, i) => (
    <span key={`${a}-${i}`} className={`hidden-hit pointer-events-none absolute rounded-lg border-[3px] ${tone === 'good' ? 'border-good bg-good/15' : 'border-bad bg-bad/10'}`}
      style={{ left: `${b.box[0]}%`, top: `${b.box[1]}%`, width: `${b.box[2]}%`, height: `${b.box[3]}%` }} data-testid={tone === 'good' ? 'hidden-answer' : 'hidden-wrong'} />
  ))
  return (
    <div className="mb-5">
      <div ref={ref} className={`relative overflow-hidden rounded-2xl border border-line/70 bg-surface ${locked ? '' : 'cursor-crosshair'}`} onClick={onClick} data-testid="hidden-scene" data-boxes={JSON.stringify(boxes.map((b) => b.box))}>
        <Illustration path={path} alt={alt} className="block aspect-[4/3] w-full select-none object-fill" sizes="(min-width: 768px) 720px, 100vw" priority />
        {!locked && Array.from({ length: areaCount }, (_, a) => {
          const b = firstBox(a)
          if (!b) return null
          return (
            <button key={a} type="button" aria-label={`Area ${a + 1} of ${areaCount}`} disabled={disabled}
              className="pointer-events-none absolute rounded-lg opacity-0 outline-none focus-visible:opacity-100 focus-visible:ring-4 focus-visible:ring-accent"
              style={{ left: `${b[0]}%`, top: `${b[1]}%`, width: `${b[2]}%`, height: `${b[3]}%` }}
              onClick={(e) => { e.stopPropagation(); setMiss(null); onPick(a) }} data-area={a} />
          )
        })}
        {locked && correct !== undefined && outline(correct, 'good')}
        {locked && chosen !== null && chosen >= 0 && chosen !== correct && outline(chosen, 'bad')}
        {tap && (locked || miss) && (
          <span className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-ink/70 shadow" style={{ left: `${tap.x}%`, top: `${tap.y}%` }} aria-hidden="true" />
        )}
      </div>
      <p className="mt-2 min-h-5 text-sm text-muted" role="status" aria-live="polite">
        {locked ? '' : miss ? `Nothing to find there. Keep looking${miss.n > 2 ? ' — a hint power-up can help' : ''}.` : 'Tap the object in the picture.'}
      </p>
    </div>
  )
}
