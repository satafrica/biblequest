import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { Illustration, PageHeader } from '../components/ui'
import { MASTER_SIZE, countsFor, masterKey, testamentLabel } from '../engine/levels'
import { TestamentPicker } from '../components/TestamentPicker'
import { useTestament } from '../state/useTestament'

/** Same list as the server's start_session for 'master'. */
const MASTER_MODES = ['picture', 'whoami', 'scripture', 'sequence', 'wisdom', 'geography', 'mystery', 'hidden']

export function Master() {
  const { catalog, progress } = useApp()
  const [testament] = useTestament()
  const counts = countsFor(catalog, testament)
  const pool = MASTER_MODES.reduce((s, m) => s + (counts[m]?.[4] ?? 0), 0)
  const key = masterKey(testament)
  const pr = progress.find((p) => p.level_key === key)
  const img = catalog.assets['elijah_carmel']
  const where = testament === 'all' ? 'the whole Bible' : `the ${testamentLabel(testament)}`
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Bible Master Challenge" title="Master Challenge">
        {MASTER_SIZE} Expert questions drawn at random from every game: pictures, people, verses, story order, wisdom, maps, mysteries and hidden objects.
        Completing it earns the level bonus once per choice of Bible part{catalog.rewards.perfect_round ? `, and a perfect score adds ${catalog.rewards.perfect_round} gems once` : ''}.
      </PageHeader>
      {img && <Illustration path={img.path} alt={img.alt} className="mb-6 aspect-[16/6] w-full rounded-2xl object-cover" priority />}
      <TestamentPicker id="master-testament" />
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <Trophy className="h-8 w-8 text-accent" aria-hidden="true" />
        <div className="flex-1">
          <p className="font-display text-lg font-semibold">{pool} Expert questions from {where}</p>
          <p className="text-sm text-muted">{pr && pr.times_completed > 0 ? `Your best: ${pr.best_correct}/${pr.total_questions} · played ${pr.times_completed} time${pr.times_completed === 1 ? '' : 's'}` : 'Not played yet. Each round is a fresh random draw.'}</p>
        </div>
        {pool > 0
          ? <Link to={`/game/${encodeURIComponent(key)}`} className="btn-primary">{pr ? 'Play again' : 'Start'}</Link>
          : <span className="text-sm text-muted">No Expert questions from {where} yet.</span>}
      </div>
    </div>
  )
}
