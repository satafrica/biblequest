import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Check, Lock, Sparkles } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { MODES, modeInfo } from '../game/modes'
import { DIFFICULTY_LABELS, LEVEL_SIZE, type Difficulty } from '../engine'
import { levelCount, levelKey, recommendDifficulty } from '../engine/levels'
import { Illustration, PageHeader } from '../components/ui'

export function PlayHub() {
  const { catalog } = useApp()
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Play" title="Choose a game">Guests can play every live game. Each answer shows its Scripture reference and a short explanation.</PageHeader>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m) => m.live ? (
          <li key={m.id}>
            <Link to={m.to!} className="card group flex h-full flex-col overflow-hidden hover:border-accent">
              {m.image && catalog.assets[m.image] && <Illustration path={catalog.assets[m.image].path} alt="" className="aspect-[16/9] w-full object-cover" sizes="(min-width:1024px) 33vw, 50vw" />}
              <div className="p-4"><h2 className="flex items-center gap-2 text-lg font-semibold"><m.Icon className="h-5 w-5 text-accent" aria-hidden="true" />{m.name}</h2><p className="mt-1 text-sm text-muted">{m.blurb}</p></div>
            </Link>
          </li>
        ) : (
          <li key={m.id} className="card flex h-full items-start gap-3 p-4 border-dashed shadow-none">
            <m.Icon className="mt-0.5 h-5 w-5 text-muted" aria-hidden="true" />
            <div><h2 className="font-semibold">{m.name}</h2><p className="text-sm text-muted">{m.blurb}</p><p className="mt-2 chip"><Lock className="h-3 w-3" aria-hidden="true" />In development — not yet playable</p></div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PlayMode() {
  const { mode = '' } = useParams()
  const { catalog, progress } = useApp()
  const info = modeInfo(mode)
  const recommended = recommendDifficulty(progress, mode)
  const [diff, setDiff] = useState<Difficulty>(recommended)
  if (!info || !['picture', 'whoami', 'scripture', 'sequence'].includes(mode)) return <Navigate to="/play" replace />
  const n = levelCount(catalog.levelCounts, mode, diff)
  const qCount = catalog.levelCounts[mode]?.[diff] ?? 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Play" title={info.name}>{info.blurb}</PageHeader>
      <div role="radiogroup" aria-label="Difficulty" className="mb-6 flex flex-wrap gap-2">
        {([1, 2, 3, 4] as Difficulty[]).map((d) => {
          const has = (catalog.levelCounts[mode]?.[d] ?? 0) > 0
          return (
            <button key={d} role="radio" aria-checked={diff === d} disabled={!has} onClick={() => setDiff(d)}
              className={`btn-sm btn ${diff === d ? 'bg-ink text-bg' : 'border border-line bg-raised'}`}>
              {DIFFICULTY_LABELS[d]}{d === recommended && <span className="inline-flex items-center gap-1 text-xs opacity-80"><Sparkles className="h-3 w-3" aria-hidden="true" />Suggested</span>}
            </button>
          )
        })}
      </div>
      <p className="mb-4 text-sm text-muted">
        {qCount} questions at this level · up to {LEVEL_SIZE} per level. The suggestion adapts to your recent accuracy; you can always choose.
      </p>
      {n === 0 ? <p className="card p-6 text-muted">No questions are published at this difficulty yet.</p> : (
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: n }, (_, i) => i + 1).map((s) => {
            const key = levelKey(mode, diff, s)
            const pr = progress.find((p) => p.level_key === key)
            const done = pr && pr.times_completed > 0
            return (
              <li key={s}>
                <Link to={`/game/${encodeURIComponent(key)}`} className={`card flex h-full flex-col p-4 hover:border-accent ${done ? 'border-good/50' : ''}`}>
                  <span className="eyebrow">{DIFFICULTY_LABELS[diff]}</span>
                  <span className="font-display text-xl font-semibold">Level {s}</span>
                  <span className="mt-2 text-sm text-muted">{done ? <span className="inline-flex items-center gap-1 text-good"><Check className="h-4 w-4" aria-hidden="true" />Best {pr!.best_correct}/{pr!.total_questions}</span> : 'Not played yet'}</span>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
