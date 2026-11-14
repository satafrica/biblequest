import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Check, Flag, Hourglass, Lamp, Scissors, Timer, X } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { friendlyError, DIFFICULTY_LABELS, type AnswerResult, type CompleteResult, type PublicQuestion, type SessionStart } from '../engine'
import { readJSON, removeKey, writeJSON } from '../lib/storage'
import { describeLevelKey, levelCount } from '../engine/levels'
import { Gems, GemIcon, Illustration, Modal } from '../components/ui'
import { playSound, unlockAudio } from '../lib/sounds'
import { soundVolume } from '../state/prefs'

const ACTIVE_KEY = 'bq.active.v1'
const ARENA_SECONDS = 20

interface Saved { levelKey: string; session: SessionStart; idx: number; results: (AnswerResult & { qid: string })[]; savedAt: number; completed?: boolean }

export default function GameRunner() {
  const { levelKey: raw = '' } = useParams()
  const levelKey = decodeURIComponent(raw)
  const app = useApp()
  const { backend, catalog, prefs, toast, setBalance, refresh, owns, online } = app
  const navigate = useNavigate()
  const kind = levelKey.split(':')[0]
  const isArena = kind === 'arena'
  const chapter = useMemo(() => kind === 'adv'
    ? catalog.adventures.flatMap((a) => a.chapters.map((c) => ({ ...c, adventure: a }))).find((c) => c.id === levelKey.split(':')[1])
    : undefined, [catalog, kind, levelKey])
  const finishRef = useRef<((s: SessionStart, r: Saved['results']) => void) | null>(null)
  const startedFor = useRef<string | null>(null)

  const [phase, setPhase] = useState<'loading' | 'intro' | 'question' | 'feedback' | 'summary' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<SessionStart | null>(null)
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<(AnswerResult & { qid: string })[]>([])
  const [summary, setSummary] = useState<CompleteResult | null>(null)
  const [busy, setBusy] = useState(false)
  // per-question state
  const [selected, setSelected] = useState<number | null>(null)
  const [clues, setClues] = useState(1)
  const [order, setOrder] = useState<string[]>([])
  const [eliminated, setEliminated] = useState<number[]>([])
  const [hint, setHint] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(ARENA_SECONDS)
  const [reportOpen, setReportOpen] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const q: PublicQuestion | undefined = session?.questions[idx]
  const timed = isArena && prefs.timers

  const persist = useCallback((s: Saved | null) => { if (s) writeJSON(ACTIVE_KEY, s); else removeKey(ACTIVE_KEY) }, [])

  const resetQuestion = useCallback((question?: PublicQuestion) => {
    setSelected(null); setClues(1); setEliminated([]); setHint(null); setTimeLeft(ARENA_SECONDS)
    setOrder(question?.game_mode === 'sequence' ? [...question.options] : [])
  }, [])

  const start = useCallback(async (resume = true) => {
    setPhase('loading'); setError(null); setSummary(null)
    try {
      const saved = readJSON<Saved | null>(ACTIVE_KEY, null)
      if (resume && saved && saved.levelKey === levelKey && !saved.completed && Date.now() - saved.savedAt < 6 * 3600_000) {
        setSession(saved.session); setResults(saved.results); setIdx(saved.idx); resetQuestion(saved.session.questions[saved.idx])
        if (saved.idx >= saved.session.questions.length) { setPhase('summary'); finishRef.current?.(saved.session, saved.results); return }
        setPhase('question')
        if (saved.results.length) toast({ title: 'Round resumed', body: 'We picked up where you left off.', tone: 'info' })
        return
      }
      if (backend.kind === 'cloud' && !navigator.onLine) throw new Error('offline')
      const s = await backend.startSession(levelKey)
      setSession(s); setResults([]); setIdx(0); resetQuestion(s.questions[0])
      persist({ levelKey, session: s, idx: 0, results: [], savedAt: Date.now() })
      setPhase(chapter ? 'intro' : 'question')
    } catch (e) {
      setError(friendlyError(e)); setPhase('error')
    }
  }, [backend, levelKey, resetQuestion, persist, chapter, toast])

  useEffect(() => {
    if (startedFor.current === levelKey) return
    startedFor.current = levelKey
    start(true)
  }, [start, levelKey])
  useEffect(() => { if (phase === 'question' || phase === 'feedback' || phase === 'summary') headingRef.current?.focus() }, [phase, idx])

  const finish = useCallback(async (sess: SessionStart, res: Saved['results']) => {
    setBusy(true)
    try {
      const r = await backend.completeSession(sess.session_id)
      setSummary(r); setBalance(r.balance)
      playSound('complete', soundVolume(prefs))
      persist({ levelKey, session: sess, idx: sess.questions.length, results: res, savedAt: Date.now(), completed: true })
      for (const a of r.new_achievements) {
        const ach = catalog.achievements.find((x) => x.id === a)
        toast({ title: 'Achievement unlocked', body: ach?.name ?? a, tone: 'gem' })
      }
      refresh().catch(() => {})
    } catch (e) {
      const msg = friendlyError(e)
      if (msg === 'This round has already finished.') { removeKey(ACTIVE_KEY); refresh().catch(() => {}) }
      setError(msg)
    } finally { setBusy(false); setPhase('summary') }
  }, [backend, catalog.achievements, levelKey, persist, refresh, setBalance, toast, prefs])

  finishRef.current = finish

  const submit = useCallback(async (choice: number) => {
    if (!session || !q || busy) return
    setBusy(true)
    unlockAudio()
    try {
      const r = q.game_mode === 'sequence'
        ? await backend.submitSequence(session.session_id, q.id, order)
        : await backend.submitAnswer(session.session_id, q.id, choice, clues)
      const res = [...results, { ...r, qid: q.id }]
      setResults(res); setSelected(choice); setBalance(r.balance); setPhase('feedback')
      playSound(r.correct ? 'correct' : 'wrong', soundVolume(prefs))
      persist({ levelKey, session, idx: idx + 1, results: res, savedAt: Date.now() })
    } catch (e) {
      toast({ title: 'Answer not sent', body: friendlyError(e), tone: 'error' })
    } finally { setBusy(false) }
  }, [session, q, busy, backend, order, clues, results, setBalance, persist, levelKey, idx, toast, prefs])

  const next = useCallback(() => {
    if (!session) return
    const n = idx + 1
    if (n >= session.questions.length) { setIdx(n); finish(session, results); return }
    setIdx(n); resetQuestion(session.questions[n]); setPhase('question')
  }, [session, idx, results, finish, resetQuestion])

  // Arena timer (optional; can be turned off in Settings)
  useEffect(() => {
    if (!timed || phase !== 'question' || busy) return
    if (timeLeft <= 0) { submit(-1); return }
    const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [timed, phase, timeLeft, busy, submit])

  const power = useCallback(async (item: 'hint' | 'eliminate_two' | 'extra_time') => {
    if (!session || !q) return
    try {
      const r = await backend.usePowerUp(session.session_id, q.id, item)
      if (r.hint) setHint(r.hint)
      if (r.eliminated) setEliminated(r.eliminated)
      if (r.extra_seconds) setTimeLeft((s) => s + r.extra_seconds!)
      refresh().catch(() => {})
    } catch (e) { toast({ title: 'Could not use power-up', body: friendlyError(e), tone: 'error' }) }
  }, [session, q, backend, refresh, toast])

  // Number keys 1-4 choose an option
  useEffect(() => {
    if (phase !== 'question' || !q || q.game_mode === 'sequence') return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const n = Number(e.key)
      if (n >= 1 && n <= q.options.length && !eliminated.includes(n - 1)) submit(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, q, eliminated, submit])

  const total = session?.questions.length ?? 0
  const title = chapter ? chapter.title : describeLevelKey(levelKey)
  const last = results[results.length - 1]
  const roundGems = results.reduce((s, r) => s + r.gems_awarded, 0) + (summary?.bonuses.reduce((s, b) => s + b.gems, 0) ?? 0)
  const points = results.reduce((s, r) => s + r.points, 0)

  if (phase === 'loading') return <div className="grid min-h-[50vh] place-items-center" role="status"><span className="sr-only">Loading round</span><div className="loader" /></div>
  if (phase === 'error') return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold mb-2">This round could not start</h1>
      <p className="text-muted mb-6">{error}</p>
      <div className="flex justify-center gap-3">
        {online && <button className="btn-primary" onClick={() => start(false)}>Try again</button>}
        <Link className="btn-secondary" to="/play">Back to games</Link>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <div className="mb-5 flex items-center gap-3">
        <button className="btn-ghost btn-sm -ml-3" onClick={() => navigate(-1)} aria-label="Leave round"><X className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          <p className="eyebrow truncate">{title}</p>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-line/60" role="progressbar" aria-label="Round progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(results.length, total)}>
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(Math.min(results.length, total) / Math.max(1, total)) * 100}%` }} />
          </div>
        </div>
        <span className="text-sm tabular-nums text-muted">{Math.min(idx + 1, total)}/{total}</span>
      </div>

      {phase === 'intro' && chapter && (
        <section className="card overflow-hidden fade-up">
          {chapter.image_id && catalog.assets[chapter.image_id] && (
            <figure>
              <Illustration path={catalog.assets[chapter.image_id].path} alt={catalog.assets[chapter.image_id].alt} className="aspect-[16/9] w-full object-cover" priority />
              <figcaption className="px-5 pt-2 text-xs text-muted">{catalog.assets[chapter.image_id].interpretation_note}</figcaption>
            </figure>
          )}
          <div className="p-5 md:p-7">
            <p className="eyebrow mb-1">{chapter.adventure.title} · Chapter {chapter.position}</p>
            <h1 ref={headingRef} tabIndex={-1} className="outline-none text-2xl font-semibold mb-1">{chapter.title}</h1>
            <p className="text-sm text-muted mb-4">{chapter.reference_label}</p>
            <p className="leading-relaxed mb-6">{chapter.narrative}</p>
            <button className="btn-primary" onClick={() => setPhase('question')}>Begin chapter · {total} questions</button>
          </div>
        </section>
      )}

      {(phase === 'question' || phase === 'feedback') && q && (
        <section aria-labelledby="q-heading" className="fade-up" key={q.id}>
          {q.image_path && (
            <figure className="mb-5 overflow-hidden rounded-2xl border border-line/70 bg-surface">
              <Illustration path={q.image_path} alt={q.image_alt ?? ''} className="aspect-[4/3] w-full object-cover" sizes="(min-width: 768px) 720px, 100vw" priority />
              {phase === 'feedback' && q.image_id && catalog.assets[q.image_id]?.interpretation_note && (
                <figcaption className="px-4 py-2 text-xs text-muted">{catalog.assets[q.image_id].interpretation_note}</figcaption>
              )}
            </figure>
          )}
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="chip">{DIFFICULTY_LABELS[q.difficulty]}</span>
            {q.game_mode === 'whoami' && phase === 'question' && <span className="chip">Worth {Math.max(20, 100 - 20 * (clues - 1))} points</span>}
            {timed && phase === 'question' && (
              <span className={`chip ${timeLeft <= 5 ? 'border-bad text-bad' : ''}`} aria-live={timeLeft === 10 || timeLeft === 5 ? 'polite' : 'off'}>
                <Timer className="h-3.5 w-3.5" aria-hidden="true" /> {timeLeft}s<span className="sr-only"> remaining</span>
              </span>
            )}
          </div>
          <h1 id="q-heading" ref={headingRef} tabIndex={-1} className="outline-none text-xl md:text-2xl font-semibold leading-snug mb-4">{q.prompt}</h1>

          {q.game_mode === 'whoami' && q.clues && (
            <ol className="mb-5 space-y-2" aria-label="Clues">
              {q.clues.slice(0, phase === 'feedback' ? q.clues.length : clues).map((c, i) => (
                <li key={i} className="card flex gap-3 px-4 py-3 fade-up"><span className="font-display text-accent font-semibold">{i + 1}</span><span>{c}</span></li>
              ))}
              {phase === 'question' && clues < q.clues.length && (
                <li><button className="btn-secondary btn-sm" onClick={() => setClues((c) => c + 1)}>Reveal next clue <span className="text-muted">(−20 points)</span></button></li>
              )}
            </ol>
          )}

          {hint && phase === 'question' && <p className="mb-4 rounded-xl border border-accent/60 bg-accent/10 px-4 py-3 text-sm" role="status"><strong>Hint:</strong> {hint}</p>}

          {q.game_mode === 'sequence' ? (
            <SequenceBoard order={order} setOrder={setOrder} locked={phase === 'feedback'} correctOrder={phase === 'feedback' ? last?.correct_order : undefined} />
          ) : (
            <div className="grid gap-3" role="group" aria-label="Answer options">
              {q.options.map((o, i) => {
                const state = phase === 'feedback'
                  ? i === last?.correct_index ? 'correct' : i === selected ? 'wrong' : undefined
                  : eliminated.includes(i) ? 'eliminated' : undefined
                return (
                  <button key={i} className="option" data-state={state} disabled={phase === 'feedback' || busy || eliminated.includes(i)} onClick={() => submit(i)}
                    aria-label={`${o}${state === 'correct' ? ', correct answer' : state === 'wrong' ? ', your answer, incorrect' : state === 'eliminated' ? ', removed' : ''}`}>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line text-sm font-semibold" aria-hidden="true">{i + 1}</span>
                    <span className="flex-1">{o}</span>
                    {state === 'correct' && <Check className="h-5 w-5 text-good" aria-hidden="true" />}
                    {state === 'wrong' && <X className="h-5 w-5 text-bad" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          )}

          {phase === 'question' && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {q.game_mode === 'sequence' && <button className="btn-primary" disabled={busy} onClick={() => submit(-1)}>Check order</button>}
              <PowerButton label="Hint" Icon={Lamp} qty={owns('hint')} onUse={() => power('hint')} disabled={Boolean(hint)} />
              {q.game_mode !== 'sequence' && <PowerButton label="Remove two" Icon={Scissors} qty={owns('eliminate_two')} onUse={() => power('eliminate_two')} disabled={eliminated.length > 0} />}
              {timed && <PowerButton label="+15 seconds" Icon={Hourglass} qty={owns('extra_time')} onUse={() => power('extra_time')} />}
            </div>
          )}

          {phase === 'feedback' && last && (
            <div className={`mt-6 card p-5 fade-up ${last.correct ? 'border-good/60' : 'border-bad/50'}`} role="status" aria-live="polite">
              <p className={`font-display text-xl font-semibold ${last.correct ? 'text-good' : 'text-bad'}`}>
                {last.correct ? 'Correct' : selected === -1 && q.game_mode !== 'sequence' ? 'Time is up' : 'Not quite'}
              </p>
              {!last.correct && q.game_mode !== 'sequence' && last.correct_index !== undefined && <p className="mt-1">The answer is <strong>{q.options[last.correct_index]}</strong>.</p>}
              {last.reference && <p className="mt-2 text-sm font-semibold">{last.reference} <span className="font-normal text-muted">· {q.translation_id}</span></p>}
              <p className="mt-2 leading-relaxed">{last.explanation}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {last.gems_awarded > 0 ? (
                  <span className="chip border-accent bg-accent/10 py-1 gem-pop"><GemIcon /> +{last.gems_awarded} gems</span>
                ) : last.correct ? (
                  <span className="text-sm text-muted">Gems for this question were already earned earlier.</span>
                ) : null}
                {last.points > 0 && <span className="text-sm text-muted">+{last.points} points</span>}
                <button className="btn-primary ml-auto" onClick={next} disabled={busy}>{idx + 1 >= total ? 'See results' : 'Next question'}</button>
              </div>
              {backend.kind === 'cloud' && (
                <button className="mt-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink" onClick={() => setReportOpen(true)}><Flag className="h-4 w-4" aria-hidden="true" /> Report a problem with this question</button>
              )}
            </div>
          )}
        </section>
      )}

      {phase === 'summary' && (
        <Summary levelKey={levelKey} results={results} total={total} summary={summary} error={error} busy={busy}
          roundGems={roundGems} points={points} headingRef={headingRef}
          onRetry={() => { removeKey(ACTIVE_KEY); start(false) }}
          onFinishRetry={() => session && finish(session, results)} />
      )}

      {q && <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} questionId={q.id} />}
    </div>
  )
}

function PowerButton({ label, Icon, qty, onUse, disabled }: { label: string; Icon: typeof Lamp; qty: number; onUse: () => void; disabled?: boolean }) {
  if (qty <= 0) return (
    <Link to="/store" className="btn-ghost btn-sm text-muted"><Icon className="h-4 w-4" aria-hidden="true" />{label}<span className="text-xs">(get in store)</span></Link>
  )
  return <button className="btn-secondary btn-sm" onClick={onUse} disabled={disabled}><Icon className="h-4 w-4" aria-hidden="true" />{label} <span className="chip py-0">{qty}</span></button>
}

function SequenceBoard({ order, setOrder, locked, correctOrder }: { order: string[]; setOrder: (o: string[]) => void; locked: boolean; correctOrder?: string[] }) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= order.length) return
    const n = [...order]; [n[i], n[j]] = [n[j], n[i]]; setOrder(n)
  }
  const [announce, setAnnounce] = useState('')
  return (
    <>
      <p className="sr-only" aria-live="polite">{announce}</p>
      <ol className="grid gap-2" aria-label="Events to order">
        {order.map((e, i) => {
          const ok = correctOrder ? correctOrder[i] === e : undefined
          return (
            <li key={e} className={`option ${ok === true ? '!border-good' : ok === false ? '!border-bad' : ''}`}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line text-sm font-semibold">{i + 1}</span>
              <span className="flex-1">{e}</span>
              {!locked && (
                <span className="flex gap-1">
                  <button className="btn-ghost btn-sm px-2" onClick={() => { move(i, -1); setAnnounce(`${e} moved to position ${i}`) }} disabled={i === 0} aria-label={`Move "${e}" earlier`}><ArrowUp className="h-4 w-4" /></button>
                  <button className="btn-ghost btn-sm px-2" onClick={() => { move(i, 1); setAnnounce(`${e} moved to position ${i + 2}`) }} disabled={i === order.length - 1} aria-label={`Move "${e}" later`}><ArrowDown className="h-4 w-4" /></button>
                </span>
              )}
              {ok === true && <Check className="h-5 w-5 text-good" aria-label="In the right place" />}
              {ok === false && <X className="h-5 w-5 text-bad" aria-label="Out of place" />}
            </li>
          )
        })}
      </ol>
      {correctOrder && correctOrder.some((c, i) => c !== order[i]) && (
        <div className="mt-4 card p-4">
          <p className="font-semibold mb-2">Correct order</p>
          <ol className="list-decimal pl-5 space-y-1">{correctOrder.map((c) => <li key={c}>{c}</li>)}</ol>
        </div>
      )}
    </>
  )
}

function Summary({ levelKey, results, total, summary, error, busy, roundGems, points, headingRef, onRetry, onFinishRetry }: {
  levelKey: string; results: AnswerResult[]; total: number; summary: CompleteResult | null; error: string | null; busy: boolean
  roundGems: number; points: number; headingRef: React.RefObject<HTMLHeadingElement | null>; onRetry: () => void; onFinishRetry: () => void
}) {
  const { catalog } = useApp()
  const correct = summary?.correct ?? results.filter((r) => r.correct).length
  const p = levelKey.split(':')
  const nextTo = useMemo(() => {
    if (p.length === 3) {
      const n = levelCount(catalog.levelCounts, p[0], Number(p[1]))
      if (Number(p[2]) < n) return { to: `/game/${encodeURIComponent(`${p[0]}:${p[1]}:${Number(p[2]) + 1}`)}`, label: 'Next level' }
      return { to: `/play/${p[0]}`, label: 'Choose another level' }
    }
    if (p[0] === 'adv') {
      const adv = catalog.adventures.find((a) => a.chapters.some((c) => c.id === p[1]))
      const ch = adv?.chapters.find((c) => c.id === p[1])
      const nx = adv?.chapters.find((c) => c.position === (ch?.position ?? 0) + 1)
      if (nx) return { to: `/game/${encodeURIComponent(`adv:${nx.id}`)}`, label: `Next chapter: ${nx.title}` }
      return { to: `/adventures`, label: 'Back to adventures' }
    }
    return { to: '/play', label: 'More games' }
  }, [catalog, p])
  if (busy && !summary) return <div className="grid min-h-[40vh] place-items-center" role="status"><span className="sr-only">Saving results</span><div className="loader" /></div>
  return (
    <section className="card p-6 md:p-8 text-center fade-up">
      <p className="eyebrow mb-2">Round complete</p>
      <h1 ref={headingRef} tabIndex={-1} className="outline-none text-3xl font-semibold mb-1">{correct} of {total} correct</h1>
      {points > 0 && <p className="text-muted">{points.toLocaleString()} points</p>}
      {correct === total && total > 0 && <p className="mt-2 font-display text-lg text-accent">A perfect round</p>}
      {summary && (
        <div className="mx-auto mt-6 max-w-sm text-left">
          <ul className="space-y-2">
            {results.some((r) => r.gems_awarded > 0) && <li className="flex justify-between"><span>Correct answers (first time)</span><span className="font-semibold">+{results.reduce((s, r) => s + r.gems_awarded, 0)}</span></li>}
            {summary.bonuses.map((b) => <li key={b.reason} className="flex justify-between"><span>{b.reason}</span><span className="font-semibold">+{b.gems}</span></li>)}
          </ul>
          <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold"><span>Gems this round</span><span className="inline-flex items-center gap-1"><GemIcon />+{roundGems}</span></div>
          <div className="mt-1 flex justify-between text-sm text-muted"><span>Balance</span><Gems n={summary.balance} /></div>
          {roundGems === 0 && <p className="mt-3 text-sm text-muted">Gems are awarded once per question and once per level bonus, so replays are for practice and points.</p>}
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-xl border border-bad/50 p-4 text-sm" role="alert">
          <p>{error}</p>
          {error !== 'This round has already finished.' && <button className="btn-secondary btn-sm mt-2" onClick={onFinishRetry}>Try saving again</button>}
        </div>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link className="btn-primary" to={nextTo.to}>{nextTo.label}</Link>
        <button className="btn-secondary" onClick={onRetry}>Play again</button>
      </div>
    </section>
  )
}

function ReportDialog({ open, onClose, questionId }: { open: boolean; onClose: () => void; questionId: string }) {
  const { backend, toast } = useApp()
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title="Report a problem">
      <form onSubmit={async (e) => {
        e.preventDefault(); setSending(true)
        try { await backend.reportQuestion(questionId, reason.trim()); toast({ title: 'Thank you', body: 'An editor will review this question.' }); setReason(''); onClose() }
        catch (err) { toast({ title: 'Report not sent', body: friendlyError(err), tone: 'error' }) }
        finally { setSending(false) }
      }}>
        <label htmlFor="report-reason" className="label">What looks wrong? (reference, wording, answer, image)</label>
        <textarea id="report-reason" className="input min-h-[110px] py-2" value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} maxLength={1000} required />
        <p className="mt-1 text-xs text-muted">Question ID: {questionId}</p>
        <div className="mt-4 flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={sending || reason.trim().length < 3}>Send report</button></div>
      </form>
    </Modal>
  )
}
