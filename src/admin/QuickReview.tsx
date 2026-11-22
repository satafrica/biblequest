import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { DIFFICULTY_LABELS, friendlyError, type Difficulty } from '../engine'
import { Illustration } from '../components/ui'
import type { AdminQuestion } from './shared'

/**
 * Quick review: a page of pending questions at a time. Each card shows everything needed
 * to judge it (answer, KJV text, explanation, picture, automated checks). The reviewer flags
 * only the problems; one button then approves the rest of the page.
 */
type Row = AdminQuestion & { verse_text?: string | null }
const PAGE = 10
const MODES = ['all', 'picture', 'scripture', 'whoami', 'sequence'] as const
const MODE_LABEL: Record<string, string> = { all: 'All modes', picture: 'Picture', scripture: 'Scripture', whoami: 'Who Am I?', sequence: 'Story order' }

async function sb() { return (await import('../lib/supabase')).supabase() }
const review = (q: Row) => String(q.verification?.human_review ?? 'pending')

export default function QuickReview() {
  const { catalog, toast } = useApp()
  const [all, setAll] = useState<Row[] | null>(null)
  const [mode, setMode] = useState<string>('all')
  const [flaggedFirst, setFlaggedFirst] = useState(true)
  const [flags, setFlags] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    const c = await sb()
    const rows: Row[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await c.from('questions').select('*').order('id').range(from, from + 999)
      if (error) throw error
      rows.push(...(data as Row[])); if (!data || data.length < 1000) break
    }
    setAll(rows)
  }, [])
  useEffect(() => { load().catch((e) => setErr(friendlyError(e))) }, [load])

  const pending = useMemo(() => (all ?? []).filter((q) => review(q) === 'pending'), [all])
  const needsFix = useMemo(() => (all ?? []).filter((q) => review(q) === 'needs_fix'), [all])
  const approved = useMemo(() => (all ?? []).filter((q) => review(q) === 'approved').length, [all])
  const queue = useMemo(() => {
    const list = pending.filter((q) => mode === 'all' || q.game_mode === mode)
    if (!flaggedFirst) return list
    return [...list].sort((a, b) => Number(b.verification?.ai_review === 'flagged') - Number(a.verification?.ai_review === 'flagged'))
  }, [pending, mode, flaggedFirst])
  const page = queue.slice(0, PAGE)

  if (err) return <p className="card p-4 text-bad">{err}</p>
  if (!all) return <div className="loader" role="status" aria-label="Loading" />

  const total = all.length
  const pct = total ? Math.round((approved / total) * 100) : 0
  const flaggedOnPage = page.filter((q) => flags[q.id] !== undefined)
  const missingNote = flaggedOnPage.some((q) => !flags[q.id]?.trim())
  const approveIds = page.filter((q) => flags[q.id] === undefined).map((q) => q.id)

  const submit = async () => {
    setSaving(true)
    try {
      const c = await sb()
      if (approveIds.length) {
        const { error } = await c.rpc('admin_review_questions', { p_ids: approveIds, p_decision: 'approved', p_note: null })
        if (error) throw error
      }
      for (const q of flaggedOnPage) {
        const { error } = await c.rpc('admin_review_questions', { p_ids: [q.id], p_decision: 'needs_fix', p_note: flags[q.id].trim() })
        if (error) throw error
      }
      toast({ title: `Saved: ${approveIds.length} approved, ${flaggedOnPage.length} need a fix` })
      setFlags({}); await load(); window.scrollTo({ top: 0 })
    } catch (e) {
      toast({ title: 'Could not save this page', body: e instanceof Error && /forbidden|invalid|note_required/.test(e.message) ? e.message : friendlyError(e), tone: 'error' })
    } finally { setSaving(false) }
  }

  return (
    <div>
      <section className="card mb-4 p-4" aria-label="Review progress">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="text-lg font-semibold"><span className="tabular-nums" data-testid="qr-pending">{pending.length}</span> waiting for review</p>
          <p className="text-sm text-muted"><span className="tabular-nums">{approved}</span> of {total} approved · <span className="tabular-nums">{needsFix.length}</span> need a fix</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Questions approved">
          <div className="h-full bg-good" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted">Read each card. If something is wrong, press <strong>Needs a fix</strong> and say what. Then press the <strong>Approve</strong> button at the bottom to approve everything else on the page. About {Math.max(1, Math.ceil(pending.length / PAGE))} pages to go.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="qr-mode">Game mode</label>
          <select id="qr-mode" className="input w-auto" value={mode} onChange={(e) => { setMode(e.target.value); setFlags({}) }}>
            {MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]} ({m === 'all' ? pending.length : pending.filter((q) => q.game_mode === m).length})</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flaggedFirst} onChange={(e) => setFlaggedFirst(e.target.checked)} />Show AI-flagged questions first</label>
        </div>
      </section>

      {page.length === 0 && <p className="card p-6 text-center">Nothing left to review here.{needsFix.length > 0 && ` ${needsFix.length} question(s) are marked as needing a fix.`}</p>}

      <ol className="grid gap-4">
        {page.map((q, n) => {
          const asset = q.image_id ? catalog.assets[q.image_id] : undefined
          const flagged = flags[q.id] !== undefined
          const ai = q.verification?.ai_review as string | undefined
          return (
            <li key={q.id} className={`card overflow-hidden ${flagged ? 'ring-2 ring-bad' : ''}`} data-testid="qr-card">
              {asset && <Illustration path={asset.path} alt={asset.alt} className="aspect-[16/9] w-full object-cover" sizes="(min-width: 768px) 600px, 100vw" />}
              <div className="grid gap-3 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip">{n + 1} of {page.length}</span>
                  <span className="chip">{MODE_LABEL[q.game_mode] ?? q.game_mode}</span>
                  <span className="chip">{DIFFICULTY_LABELS[q.difficulty as Difficulty]}</span>
                  {ai === 'passed' && <span className="chip border-good text-good">AI check passed</span>}
                  {ai === 'flagged' && <span className="chip border-bad text-bad">AI check flagged this</span>}
                  {q.verification?.reference_exists === true && <span className="chip border-good text-good">Reference found in KJV</span>}
                  <span className="ml-auto text-muted">{q.id}</span>
                </div>
                {ai === 'flagged' && typeof q.verification?.ai_note === 'string' && <p className="rounded-md border border-bad/40 bg-bad/5 p-2"><strong>AI concern:</strong> {q.verification.ai_note}</p>}
                <p className="text-base font-semibold">{q.prompt}</p>
                {q.clues && q.clues.length > 0 && <ol className="list-decimal pl-5">{q.clues.map((c, i) => <li key={i}>{c}</li>)}</ol>}
                {q.game_mode === 'sequence'
                  ? <div><p className="mb-1 text-muted">Correct order:</p><ol className="list-decimal pl-5 font-medium">{q.options.map((o, i) => <li key={i}>{o}</li>)}</ol></div>
                  : <ul className="grid gap-1">{q.options.map((o, i) => <li key={i} className={i === q.correct_index ? 'rounded-md bg-good/10 px-2 py-1 font-semibold text-good' : 'px-2 py-1 text-muted'}>{i === q.correct_index ? '✓ ' : ''}{o}</li>)}</ul>}
                <blockquote className="border-l-4 border-gold pl-3"><p className="font-semibold">{q.reference_label} (KJV)</p><p className="mt-1 italic">{q.verse_text || 'Verse text not stored for this question.'}</p></blockquote>
                <p><strong>Explanation:</strong> {q.explanation}</p>
                {q.hint && <p><strong>Hint:</strong> {q.hint}</p>}
                {asset?.interpretation_note && <p className="text-muted"><strong>Picture note:</strong> {asset.interpretation_note}</p>}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {!flagged
                    ? <button className="btn-secondary btn-sm" onClick={() => setFlags((f) => ({ ...f, [q.id]: '' }))}>Needs a fix</button>
                    : <button className="btn-ghost btn-sm" onClick={() => setFlags((f) => { const n2 = { ...f }; delete n2[q.id]; return n2 })}>Looks fine after all</button>}
                </div>
                {flagged && <div><label className="label" htmlFor={`qr-note-${q.id}`}>What needs fixing?</label><textarea id={`qr-note-${q.id}`} className="input min-h-[70px] py-2" value={flags[q.id]} onChange={(e) => setFlags((f) => ({ ...f, [q.id]: e.target.value }))} placeholder="For example: the answer should be Elijah, or the picture does not match" /></div>}
              </div>
            </li>
          )
        })}
      </ol>

      {page.length > 0 && (
        <div className="sticky bottom-20 z-10 mt-4 md:bottom-4">
          <div className="card flex flex-wrap items-center gap-3 p-3 shadow-lg">
            <p className="text-sm">{approveIds.length} to approve{flaggedOnPage.length > 0 && `, ${flaggedOnPage.length} ${flaggedOnPage.length === 1 ? 'needs' : 'need'} a fix`}</p>
            {missingNote && <p className="text-sm text-bad">Add a note to each flagged question.</p>}
            <button className="btn-primary ml-auto" disabled={saving || missingNote} onClick={submit}>
              {saving ? 'Saving…' : flaggedOnPage.length ? `Approve ${approveIds.length}, flag ${flaggedOnPage.length}` : `Approve all ${approveIds.length} on this page`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
