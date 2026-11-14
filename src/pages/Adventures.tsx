import { Link, Navigate, useParams } from 'react-router-dom'
import { Check, Lock } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { Illustration, PageHeader } from '../components/ui'

export function AdventureList() {
  const { catalog, progress } = useApp()
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Bible Adventure Journey" title="Adventures">Travel through Scripture chapter by chapter. Each chapter unlocks the next; finishing every chapter of a journey earns {catalog.rewards.adventure_complete ?? 250} gems once.</PageHeader>
      <ul className="grid gap-5 md:grid-cols-2">
        {catalog.adventures.map((a) => {
          const done = a.chapters.filter((c) => progress.some((p) => p.level_key === `adv:${c.id}` && p.times_completed > 0)).length
          const img = a.image_id ? catalog.assets[a.image_id] : undefined
          return (
            <li key={a.id}>
              <Link to={`/adventures/${a.id}`} className="card group block overflow-hidden hover:border-accent">
                {img && <Illustration path={img.path} alt="" className="aspect-[16/9] w-full object-cover" sizes="(min-width:768px) 50vw, 100vw" />}
                <div className="p-5">
                  <p className="eyebrow">{a.testament === 'OT' ? 'Old Testament' : a.testament === 'NT' ? 'New Testament' : 'Whole Bible'} · {a.chapters.length} chapters</p>
                  <h2 className="text-xl font-semibold">{a.title}</h2>
                  <p className="mt-1 text-sm text-muted">{a.summary}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                    <div className="h-1.5 flex-1 rounded-full bg-line/60"><div className="h-full rounded-full bg-good" style={{ width: `${(done / a.chapters.length) * 100}%` }} /></div>{done}/{a.chapters.length}
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
      {catalog.adventures.length === 0 && <p className="card p-6 text-muted">No adventures are published yet.</p>}
    </div>
  )
}

export function AdventureDetail() {
  const { id } = useParams()
  const { catalog, progress } = useApp()
  const a = catalog.adventures.find((x) => x.id === id)
  if (!a) return <Navigate to="/adventures" replace />
  const isDone = (cid: string) => progress.some((p) => p.level_key === `adv:${cid}` && p.times_completed > 0)
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Adventure" title={a.title}>{a.summary}</PageHeader>
      <ol className="relative space-y-4 border-l-2 border-line pl-6">
        {[...a.chapters].sort((x, y) => x.position - y.position).map((c, i, arr) => {
          const done = isDone(c.id)
          const unlocked = i === 0 || isDone(arr[i - 1].id)
          const img = c.image_id ? catalog.assets[c.image_id] : undefined
          const pr = progress.find((p) => p.level_key === `adv:${c.id}`)
          return (
            <li key={c.id} className="relative">
              <span className={`absolute -left-[35px] top-5 grid h-6 w-6 place-items-center rounded-full border-2 ${done ? 'border-good bg-good text-bg' : unlocked ? 'border-accent bg-bg' : 'border-line bg-bg'}`} aria-hidden="true">
                {done ? <Check className="h-3.5 w-3.5" /> : !unlocked ? <Lock className="h-3 w-3 text-muted" /> : null}
              </span>
              <div className={`card grid overflow-hidden sm:grid-cols-[160px_1fr] ${!unlocked ? 'opacity-70' : ''}`}>
                {img && <Illustration path={img.path} alt={img.alt} className="h-36 w-full object-cover sm:h-full" sizes="160px" />}
                <div className="p-4">
                  <p className="eyebrow">Chapter {c.position} · {c.reference_label}</p>
                  <h2 className="text-lg font-semibold">{c.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{c.narrative}</p>
                  <div className="mt-3 flex items-center gap-3">
                    {unlocked ? <Link to={`/game/${encodeURIComponent(`adv:${c.id}`)}`} className={done ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}>{done ? 'Replay chapter' : 'Play chapter'}</Link>
                      : <span className="text-sm text-muted">Complete chapter {c.position - 1} to unlock</span>}
                    {pr && pr.times_completed > 0 && <span className="text-sm text-muted">Best {pr.best_correct}/{pr.total_questions}</span>}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
