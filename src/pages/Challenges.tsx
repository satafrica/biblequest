import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { DIFFICULTY_LABELS, ARENA_SIZE, DAILY_SIZE, friendlyError, type Difficulty, type LeaderRow } from '../engine'
import { Illustration, PageHeader } from '../components/ui'
import { todayUTC } from '../lib/ids'

export function Daily() {
  const { catalog, progress } = useApp()
  const today = todayUTC()
  const pr = progress.find((p) => p.level_key === `daily:${today}`)
  const img = catalog.assets['abraham_stars']
  const history = progress.filter((p) => p.level_key.startsWith('daily:')).sort((a, b) => b.level_key.localeCompare(a.level_key)).slice(0, 14)
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Daily Bible Challenge" title={`Today · ${today}`}>{DAILY_SIZE} questions drawn fresh each day (midnight UTC). Complete them for a {catalog.rewards.daily_challenge ?? 25}-gem bonus, once per day.</PageHeader>
      <div className="card overflow-hidden">
        {img && <Illustration path={img.path} alt={img.alt} className="aspect-[16/7] w-full object-cover" priority />}
        <div className="flex flex-wrap items-center gap-4 p-5">
          <p className="flex-1">{pr && pr.times_completed > 0 ? `You scored ${pr.best_correct}/${pr.total_questions} today. You can replay for practice.` : 'You have not played today\u2019s challenge yet.'}</p>
          <Link to={`/game/${encodeURIComponent(`daily:${today}`)}`} className="btn-primary">{pr ? 'Play again' : 'Start'}</Link>
        </div>
      </div>
      {history.length > 0 && (
        <section className="mt-8"><h2 className="mb-3 text-lg font-semibold">Recent days</h2>
          <ul className="card divide-y divide-line">{history.map((h) => <li key={h.level_key} className="flex justify-between px-4 py-3 text-sm"><span>{h.level_key.slice(6)}</span><span className="tabular-nums">{h.best_correct}/{h.total_questions}</span></li>)}</ul>
        </section>
      )}
    </div>
  )
}

export function Arena() {
  const { owns, prefs, catalog } = useApp()
  const img = catalog.assets['david_goliath']
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Bible Challenge Arena" title="Arena">
        {ARENA_SIZE} questions drawn at random up to the difficulty you choose{prefs.timers ? ', 20 seconds each' : ''}. Arena rounds earn gems only for questions you have never answered correctly before.
        {' '}{prefs.timers ? <>Timers can be turned off in <Link className="link" to="/settings">Settings</Link>.</> : <>Timers are off (see <Link className="link" to="/settings">Settings</Link>).</>}
      </PageHeader>
      {img && <Illustration path={img.path} alt={img.alt} className="mb-6 aspect-[16/6] w-full rounded-2xl object-cover" priority />}
      <ul className="grid gap-3 sm:grid-cols-2">
        {([1, 2, 3, 4] as Difficulty[]).map((d) => {
          const locked = d === 4 && owns('bonus_expert') < 1
          return (
            <li key={d} className="card flex items-center gap-4 p-4">
              <div className="flex-1"><p className="font-display text-lg font-semibold">{DIFFICULTY_LABELS[d]}</p><p className="text-sm text-muted">{d === 1 ? 'Beginner questions only' : `Mixed questions up to ${DIFFICULTY_LABELS[d]}`}</p></div>
              {locked ? <Link to="/store" className="btn-secondary btn-sm"><Lock className="h-4 w-4" aria-hidden="true" />Unlock in store</Link>
                : <Link to={`/game/${encodeURIComponent(`arena:${d}`)}`} className="btn-primary btn-sm">Enter</Link>}
            </li>
          )
        })}
      </ul>
      <p className="mt-6 text-sm"><Link to="/leaderboard" className="link">Daily and weekly leaderboards</Link></p>
    </div>
  )
}

export function Leaderboard() {
  const { backend, profile, refresh, toast, user } = useApp()
  const [period, setPeriod] = useState<'daily' | 'weekly'>('weekly')
  const [rows, setRows] = useState<LeaderRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    if (backend.kind !== 'cloud') return
    setRows(null); setErr(null)
    backend.getLeaderboard(period).then(setRows).catch((e) => setErr(friendlyError(e)))
  }, [backend, period])
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Challenge Arena" title="Leaderboards">Correct answers in completed Arena rounds. Only players who choose to appear are listed, by display name.</PageHeader>
      {backend.kind !== 'cloud' ? (
        <p className="card p-6 text-muted">Leaderboards compare players across devices, so they need the online backend with accounts. They are not available in this preview build.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Period">
            {(['daily', 'weekly'] as const).map((p) => <button key={p} role="tab" aria-selected={period === p} className={`btn btn-sm ${period === p ? 'bg-ink text-bg' : 'border border-line'}`} onClick={() => setPeriod(p)}>{p === 'daily' ? 'Today' : 'This week'}</button>)}
            {user && profile && (
              <label className="ml-auto flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={profile.leaderboard_opt_in} onChange={async (e) => {
                  try { await backend.updateProfile({ leaderboard_opt_in: e.target.checked }); await refresh(); setRows(await backend.getLeaderboard(period)) } catch (er) { toast({ title: 'Not saved', body: friendlyError(er), tone: 'error' }) }
                }} /> Show me on leaderboards
              </label>
            )}
          </div>
          {err && <p className="card p-4 text-bad">{err}</p>}
          {!rows && !err && <div className="loader mx-auto my-10" role="status" aria-label="Loading leaderboard" />}
          {rows && rows.length === 0 && <p className="card p-6 text-muted">No opted-in Arena results yet for this period.</p>}
          {rows && rows.length > 0 && (
            <table className="card w-full overflow-hidden text-left text-sm">
              <thead className="bg-ink/5"><tr><th className="px-4 py-2">Rank</th><th className="px-4 py-2">Player</th><th className="px-4 py-2 text-right">Correct</th><th className="px-4 py-2 text-right">Rounds</th></tr></thead>
              <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line"><td className="px-4 py-2 tabular-nums">{i + 1}</td><td className="px-4 py-2">{r.display_name}</td><td className="px-4 py-2 text-right tabular-nums">{r.correct}</td><td className="px-4 py-2 text-right tabular-nums">{r.rounds}</td></tr>)}</tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
