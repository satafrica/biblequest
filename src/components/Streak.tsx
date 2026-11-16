import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Flame, RotateCcw } from 'lucide-react'
import type { PlayerStats } from '../engine'

const DAY = 86400000
const parse = (s: string) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)))
const fmt = (d: Date) => d.toISOString().slice(0, 10)
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function streakLine(s: PlayerStats): string {
  if (s.current_streak === 0) return s.best_streak > 0 ? 'Complete a round today to start a new streak.' : 'Complete a round on consecutive days to build a streak.'
  return s.played_today ? 'You have played today. Come back tomorrow to keep it going.' : 'Complete a round today to keep your streak.'
}

/** Compact card: current streak plus the last 7 days. */
export function StreakCard({ stats }: { stats: PlayerStats | null }) {
  if (!stats || !stats.today) return null
  const active = new Set(stats.active_days)
  const today = parse(stats.today)
  const week = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() - (6 - i) * DAY))
  return (
    <div className="card flex flex-wrap items-center gap-4 p-4" data-testid="streak-card">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-full ${stats.current_streak > 0 ? 'bg-accent text-accent-ink' : 'bg-line/60 text-muted'}`} aria-hidden="true"><Flame className="h-6 w-6" /></span>
        <div>
          <p className="eyebrow">Daily streak</p>
          <p className="text-2xl font-semibold tabular-nums">{stats.current_streak} {stats.current_streak === 1 ? 'day' : 'days'}</p>
        </div>
      </div>
      <ol className="flex gap-1.5" aria-label="Last 7 days">
        {week.map((d) => {
          const on = active.has(fmt(d))
          return (
            <li key={fmt(d)} className="flex flex-col items-center gap-1 text-[11px] text-muted">
              <span aria-hidden="true">{WEEKDAYS[d.getUTCDay()]}</span>
              <span className={`h-6 w-6 rounded-full border ${on ? 'border-accent bg-accent' : 'border-line'}`} aria-hidden="true" />
              <span className="sr-only">{WEEKDAY_NAMES[d.getUTCDay()]} {fmt(d)}: {on ? 'played' : 'not played'}</span>
            </li>
          )
        })}
      </ol>
      <p className="basis-full text-xs text-muted">{streakLine(stats)} Best: {stats.best_streak}.</p>
    </div>
  )
}

/** Month calendar of days with a completed round. */
export function StreakCalendar({ stats }: { stats: PlayerStats | null }) {
  const [offset, setOffset] = useState(0)
  if (!stats || !stats.today) return null
  const active = new Set(stats.active_days)
  const today = parse(stats.today)
  const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1))
  const daysIn = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  const cells: (Date | null)[] = [...Array(first.getUTCDay()).fill(null), ...Array.from({ length: daysIn }, (_, i) => new Date(first.getTime() + i * DAY))]
  const month = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const played = cells.filter((d) => d && active.has(fmt(d))).length
  return (
    <section className="card p-5" aria-labelledby="cal-h" data-testid="streak-calendar">
      <div className="mb-3 flex items-center gap-2">
        <h2 id="cal-h" className="flex-1 text-lg font-semibold">{month}</h2>
        <button className="btn-ghost btn-sm px-2" onClick={() => setOffset((o) => Math.min(2, o + 1))} disabled={offset >= 2} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
        <button className="btn-ghost btn-sm px-2" onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted" aria-hidden="true">{WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}</div>
      <ol className="mt-1 grid grid-cols-7 gap-1" aria-label={`${month}: played on ${played} ${played === 1 ? 'day' : 'days'}`}>
        {cells.map((d, i) => {
          if (!d) return <li key={`e${i}`} aria-hidden="true" />
          const key = fmt(d); const on = active.has(key); const isToday = key === stats.today; const future = d > today
          return (
            <li key={key} className={`grid aspect-square place-items-center rounded-lg text-sm tabular-nums ${on ? 'bg-accent font-semibold text-accent-ink' : future ? 'text-muted' : 'bg-line/30'} ${isToday ? 'ring-2 ring-ink' : ''}`}>
              <span aria-hidden="true">{d.getUTCDate()}</span>
              <span className="sr-only">{d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', timeZone: 'UTC' })}: {on ? 'played' : 'not played'}{isToday ? ', today' : ''}</span>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-sm text-muted">Current streak {stats.current_streak} · best {stats.best_streak} · {played} {played === 1 ? 'day' : 'days'} this month. A day counts when you complete a round.</p>
    </section>
  )
}

export function ReviewCard({ stats }: { stats: PlayerStats | null }) {
  if (!stats) return null
  const n = stats.review_count
  return n > 0 ? (
    <Link to={`/game/${encodeURIComponent('review')}`} className="card flex items-center gap-3 p-4 hover:border-accent" data-testid="review-card">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-line/60" aria-hidden="true"><RotateCcw className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><p className="eyebrow">Review my mistakes</p><p className="font-semibold">{n} {n === 1 ? 'question' : 'questions'} to try again</p></div>
      <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
    </Link>
  ) : (
    <div className="card flex items-center gap-3 p-4" data-testid="review-card">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-line/60 text-muted" aria-hidden="true"><RotateCcw className="h-5 w-5" /></span>
      <div><p className="eyebrow">Review my mistakes</p><p className="text-sm text-muted">Nothing to review. Questions you miss will appear here until you get them right.</p></div>
    </div>
  )
}
