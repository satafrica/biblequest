import { Link } from 'react-router-dom'
import { History, RotateCcw } from 'lucide-react'
import { readJSON, removeKey } from '../lib/storage'
import { describeLevelKey } from '../engine/levels'
import { useApp } from '../state/AppContext'
import type { AnswerResult, SessionStart } from '../engine'

/** The round the player is in the middle of, kept on this device so they can come back to it. */
export const ACTIVE_KEY = 'bq.active.v1'
/** How long an unfinished round is kept. The server keeps rounds open, so this only limits clutter. */
export const RESUME_MS = 3 * 24 * 3600_000

export interface SavedRound { levelKey: string; session: SessionStart; idx: number; results: (AnswerResult & { qid: string })[]; savedAt: number; completed?: boolean }

const todayUTC = () => new Date().toISOString().slice(0, 10)

/** True if the saved round can still be continued. */
export function isResumable(s: SavedRound | null | undefined, now = Date.now()): s is SavedRound {
  if (!s || s.completed || !s.session?.questions?.length) return false
  if (now - s.savedAt >= RESUME_MS) return false
  if (s.idx >= s.session.questions.length) return false
  if (s.levelKey.startsWith('daily:') && s.levelKey !== `daily:${todayUTC()}`) return false
  return true
}

/** The unfinished round with at least one answer, or null. */
export function readActiveRound(): SavedRound | null {
  const s = readJSON<SavedRound | null>(ACTIVE_KEY, null)
  return isResumable(s) && s.results.length > 0 ? s : null
}

export function clearActiveRound() { removeKey(ACTIVE_KEY) }

export function roundLink(levelKey: string, choice: 'continue' | 'restart') {
  return `/game/${encodeURIComponent(levelKey)}?resume=${choice}`
}

/** "Continue where you left off" card with Continue and Start over. Shows nothing if there is no unfinished round. */
export function ResumeCard({ className = '' }: { className?: string }) {
  const { catalog } = useApp()
  const r = readActiveRound()
  if (!r) return null
  const chapterTitle = (id: string) => catalog.adventures.flatMap((a) => a.chapters).find((c) => c.id === id)?.title
  const total = r.session.questions.length
  const right = r.results.filter((x) => x.correct).length
  return (
    <section className={`card border-accent p-4 md:p-5 ${className}`} aria-labelledby="resume-h" data-testid="resume-card">
      <div className="flex flex-wrap items-center gap-4">
        <History className="h-8 w-8 shrink-0 text-accent" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow" id="resume-h">Continue where you left off</p>
          <p className="font-semibold">{describeLevelKey(r.levelKey, chapterTitle)}</p>
          <p className="text-sm text-muted">Question {r.idx + 1} of {total} · {right} of {r.results.length} correct so far</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link to={roundLink(r.levelKey, 'continue')} className="btn-primary flex-1 sm:flex-none">Continue</Link>
          <Link to={roundLink(r.levelKey, 'restart')} className="btn-secondary flex-1 sm:flex-none"><RotateCcw className="h-4 w-4" aria-hidden="true" />Start over</Link>
        </div>
      </div>
    </section>
  )
}
