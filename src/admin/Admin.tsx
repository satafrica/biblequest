import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Download, Plus } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { DIFFICULTY_LABELS, friendlyError, type Difficulty } from '../engine'
import { PageHeader, Modal, Illustration } from '../components/ui'
import { download, QuestionDetail, StatusChip, toCSV, transitions, useQuestionFilter, type AdminQuestion, type Status } from './shared'
import { BOOKS } from '../engine/books'

export default function Admin() {
  const { backend, profile } = useApp()
  if (backend.kind === 'local') return <PreviewReview />
  if (!profile || profile.role === 'player') {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <PageHeader eyebrow="Admin" title="Staff only">The admin dashboard is available to editors, moderators and administrators. Access is checked by the server for every action.</PageHeader>
        <Link to="/" className="link">Back to home</Link>
      </div>
    )
  }
  return <CloudAdmin isAdmin={profile.role === 'admin'} />
}

/* ------------------------------------------------------------------ */
/* Preview mode: read-only review of the bundled question bank         */
/* ------------------------------------------------------------------ */
function PreviewReview() {
  const [questions, setQuestions] = useState<AdminQuestion[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => {
    // Build-time guard: cloud builds never include the bundled answer key.
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) { setQuestions([]); return }
    import('../engine/content').then((m) => setQuestions(m.QUESTIONS as unknown as AdminQuestion[]))
  }, [])
  const { rows, controls } = useQuestionFilter(questions ?? [])
  if (!questions) return <div className="loader mx-auto my-20" role="status" aria-label="Loading" />
  const by = (m: string, d: number) => questions.filter((q) => q.game_mode === m && q.difficulty === d).length
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Content review" title="Question bank (read-only preview)">
        Every question below passed the automated KJV reference check and is waiting for human review. Approving and publishing happens in the live admin dashboard once the Supabase backend is connected. Download the review sheet to record decisions now.
      </PageHeader>
      <div className="mb-6 overflow-x-auto card" tabIndex={0} role="region" aria-label="Question counts by mode and difficulty">
        <table className="w-full text-sm">
          <thead className="bg-ink/5"><tr><th className="px-3 py-2 text-left">Mode</th>{[1, 2, 3, 4].map((d) => <th key={d} className="px-3 py-2 text-right">{DIFFICULTY_LABELS[d as Difficulty]}</th>)}<th className="px-3 py-2 text-right">Total</th></tr></thead>
          <tbody>{['picture', 'whoami', 'scripture', 'sequence'].map((m) => (
            <tr key={m} className="border-t border-line"><td className="px-3 py-2">{m}</td>{[1, 2, 3, 4].map((d) => <td key={d} className="px-3 py-2 text-right tabular-nums">{by(m, d)}</td>)}<td className="px-3 py-2 text-right font-semibold tabular-nums">{questions.filter((q) => q.game_mode === m).length}</td></tr>
          ))}<tr className="border-t border-line font-semibold"><td className="px-3 py-2">All</td><td colSpan={4} /><td className="px-3 py-2 text-right tabular-nums">{questions.length}</td></tr></tbody>
        </table>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted">{rows.length} shown</p>
        <button className="btn-secondary btn-sm ml-auto" onClick={() => download('mybiblegem-review-sheet.csv', toCSV(rows))}><Download className="h-4 w-4" aria-hidden="true" />Download review sheet (CSV)</button>
      </div>
      {controls}
      <QuestionList rows={rows} open={open} setOpen={setOpen} />
    </div>
  )
}

function QuestionList({ rows, open, setOpen, selected, setSelected, actions }: {
  rows: AdminQuestion[]; open: string | null; setOpen: (id: string | null) => void
  selected?: Set<string>; setSelected?: (s: Set<string>) => void; actions?: (q: AdminQuestion) => ReactNode
}) {
  const [limit, setLimit] = useState(60)
  return (
    <>
      <ul className="card divide-y divide-line">
        {rows.slice(0, limit).map((q) => (
          <li key={q.id} className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              {selected && setSelected && (
                <input type="checkbox" className="h-4 w-4" aria-label={`Select ${q.id}`} checked={selected.has(q.id)} onChange={(e) => { const n = new Set(selected); if (e.target.checked) n.add(q.id); else n.delete(q.id); setSelected(n) }} />
              )}
              <button className="min-w-0 flex-1 text-left" aria-expanded={open === q.id} onClick={() => setOpen(open === q.id ? null : q.id)}>
                <span className="block truncate font-medium">{q.prompt}</span>
                <span className="text-xs text-muted">{q.id} · {q.game_mode} · {DIFFICULTY_LABELS[q.difficulty as Difficulty]} · {q.reference_label}</span>
              </button>
              <StatusChip s={q.status} />
            </div>
            {open === q.id && <div className="mt-3 rounded-xl bg-ink/[.03] p-3"><QuestionDetail q={q} />{actions && <div className="mt-3 flex flex-wrap gap-2">{actions(q)}</div>}</div>}
          </li>
        ))}
      </ul>
      {rows.length > limit && <button className="btn-secondary btn-sm mt-3" onClick={() => setLimit((l) => l + 100)}>Show more ({rows.length - limit} remaining)</button>}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Live admin (Supabase)                                               */
/* ------------------------------------------------------------------ */
type Tab = 'overview' | 'questions' | 'images' | 'adventures' | 'daily' | 'store' | 'reports' | 'audit'

function CloudAdmin({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>('overview')
  const tabs: { id: Tab; label: string; admin?: boolean }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'questions', label: 'Questions' }, { id: 'images', label: 'Illustrations' },
    { id: 'adventures', label: 'Adventures' }, { id: 'daily', label: 'Daily challenges', admin: true }, { id: 'store', label: 'Store & rewards', admin: true },
    { id: 'reports', label: 'Reports' }, { id: 'audit', label: 'Audit log', admin: true },
  ]
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Admin" title="MyBibleGem dashboard">Only published content appears in games. Edits send content back to draft for review.</PageHeader>
      <div role="tablist" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.filter((t) => !t.admin || isAdmin).map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`btn btn-sm shrink-0 ${tab === t.id ? 'bg-ink text-bg' : 'border border-line bg-raised'}`}>{t.label}</button>)}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'questions' && <Questions isAdmin={isAdmin} />}
      {tab === 'images' && <Images isAdmin={isAdmin} />}
      {tab === 'adventures' && <Adventures isAdmin={isAdmin} />}
      {tab === 'daily' && <DailyAdmin />}
      {tab === 'store' && <StoreAdmin />}
      {tab === 'reports' && <Reports />}
      {tab === 'audit' && <Audit />}
    </div>
  )
}

async function sb() { return (await import('../lib/supabase')).supabase() }
function useAdminAction() {
  const { toast } = useApp()
  return useCallback(async (label: string, fn: () => Promise<{ error: { message: string } | null } | void>) => {
    try { const r = await fn(); if (r && r.error) throw new Error(r.error.message); toast({ title: label }) ; return true }
    catch (e) { toast({ title: 'Action failed', body: e instanceof Error && /invalid_transition|forbidden|required|invalid|unknown|past|unpublished|started/.test(e.message) ? e.message : friendlyError(e), tone: 'error' }); return false }
  }, [toast])
}

function Overview() {
  const [s, setS] = useState<Record<string, unknown> | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { sb().then((c) => c.rpc('admin_stats')).then(({ data, error }) => error ? setErr(error.message) : setS(data)) }, [])
  if (err) return <p className="card p-4 text-bad">{err}</p>
  if (!s) return <div className="loader" role="status" aria-label="Loading" />
  const cards: [string, unknown][] = [['Players', s.players], ['Rounds started (7 days)', s.sessions_7d], ['Rounds completed (7 days)', s.completed_7d], ['Answers (7 days)', s.answers_7d],
    ['Accuracy (7 days)', s.accuracy_7d != null ? `${s.accuracy_7d}%` : '—'], ['Gems earned (7 days)', s.gems_earned_7d], ['Gems spent (7 days)', s.gems_spent_7d], ['Open reports', s.open_reports]]
  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([k, v]) => <li key={k} className="card p-4"><p className="eyebrow mb-1">{k}</p><p className="text-2xl font-semibold tabular-nums">{String(v ?? 0)}</p></li>)}</ul>
      <h2 className="mt-8 mb-2 text-lg font-semibold">Questions by status</h2>
      <ul className="flex flex-wrap gap-2">{Object.entries((s.questions_by_status as Record<string, number>) ?? {}).map(([k, v]) => <li key={k} className="chip py-1 text-sm">{k}: {v}</li>)}</ul>
      <p className="mt-4 text-xs text-muted">Figures come directly from the database; nothing here is simulated.</p>
    </div>
  )
}

function Questions({ isAdmin }: { isAdmin: boolean }) {
  const [questions, setQuestions] = useState<AdminQuestion[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Partial<AdminQuestion> | null>(null)
  const act = useAdminAction()
  const load = useCallback(async () => {
    const c = await sb()
    const all: AdminQuestion[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await c.from('questions').select('*').order('id').range(from, from + 999)
      if (error) throw error
      all.push(...(data as AdminQuestion[])); if (!data || data.length < 1000) break
    }
    setQuestions(all)
  }, [])
  useEffect(() => { load().catch(() => setQuestions([])) }, [load])
  const { rows, controls } = useQuestionFilter(questions ?? [])
  if (!questions) return <div className="loader" role="status" aria-label="Loading" />

  const setStatus = async (ids: string[], to: Status) => {
    const c = await sb()
    let ok = 0
    for (const id of ids) { const { error } = await c.rpc('admin_set_question_status', { p_id: id, p_status: to, p_note: null }); if (!error) ok++ }
    await act(`${ok} of ${ids.length} moved to ${to}`, async () => {})
    setSelected(new Set()); await load()
  }
  const selectedRows = rows.filter((r) => selected.has(r.id))
  const common = selectedRows.length ? transitions(selectedRows[0].status, isAdmin).filter((t) => selectedRows.every((r) => transitions(r.status, isAdmin).some((x) => x.to === t.to))) : []

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted">{rows.length} shown · {selected.size} selected</p>
        <button className="btn-ghost btn-sm" onClick={() => setSelected(new Set(rows.map((r) => r.id)))}>Select all shown</button>
        {selected.size > 0 && <button className="btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>}
        {common.map((t) => <button key={t.to} className="btn-secondary btn-sm" onClick={() => setStatus([...selected], t.to)}>{t.label} ({selected.size})</button>)}
        <button className="btn-secondary btn-sm ml-auto" onClick={() => download('mybiblegem-questions.csv', toCSV(rows))}><Download className="h-4 w-4" aria-hidden="true" />CSV</button>
        <button className="btn-primary btn-sm" onClick={() => setEditing({ game_mode: 'picture', difficulty: 1, options: ['', '', '', ''], correct_index: 0, translation_id: 'KJV', book_id: 1, chapter: 1, verse_start: 1 })}><Plus className="h-4 w-4" aria-hidden="true" />New question</button>
      </div>
      {controls}
      <QuestionList rows={rows} open={open} setOpen={setOpen} selected={selected} setSelected={setSelected}
        actions={(q) => <>{transitions(q.status, isAdmin).map((t) => <button key={t.to} className="btn-secondary btn-sm" onClick={() => setStatus([q.id], t.to)}>{t.label}</button>)}<button className="btn-ghost btn-sm" onClick={() => setEditing(q)}>Edit</button></>} />
      {editing && <QuestionEditor q={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load() }} />}
    </div>
  )
}

function QuestionEditor({ q, onClose, onSaved }: { q: Partial<AdminQuestion>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<AdminQuestion>>({ ...q })
  const act = useAdminAction()
  const set = (k: keyof AdminQuestion, v: unknown) => setF((x) => ({ ...x, [k]: v }))
  const book = BOOKS.find((b) => b.id === Number(f.book_id))
  return (
    <Modal open onClose={onClose} title={q.id ? `Edit ${q.id}` : 'New question'}>
      <form className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1" onSubmit={async (e) => {
        e.preventDefault()
        const payload = { ...f, clues: f.game_mode === 'whoami' ? (f.clues ?? []).filter(Boolean) : null, options: (f.options ?? []).filter((o) => o.trim() !== ''),
          reference_label: f.reference_label || `${book?.name ?? ''} ${f.chapter}:${f.verse_start}${f.verse_end && f.verse_end !== f.verse_start ? `-${f.verse_end}` : ''}` }
        if (await act('Saved as draft', async () => (await sb()).rpc('admin_upsert_question', { p: payload }))) onSaved()
      }}>
        <p className="text-xs text-muted">Saving puts the question in draft. It must be reviewed, approved and published before players see it. Check the reference against the Bible text before sending to review.</p>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="e-mode">Mode</label><select id="e-mode" className="input" value={f.game_mode} onChange={(e) => set('game_mode', e.target.value)}>{['picture', 'whoami', 'scripture', 'sequence'].map((m) => <option key={m}>{m}</option>)}</select></div>
          <div><label className="label" htmlFor="e-diff">Difficulty</label><select id="e-diff" className="input" value={f.difficulty} onChange={(e) => set('difficulty', Number(e.target.value))}>{[1, 2, 3, 4].map((d) => <option key={d} value={d}>{DIFFICULTY_LABELS[d as Difficulty]}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-4 sm:col-span-2"><label className="label" htmlFor="e-book">Book</label><select id="e-book" className="input" value={f.book_id} onChange={(e) => set('book_id', Number(e.target.value))}>{BOOKS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div><label className="label" htmlFor="e-ch">Chapter</label><input id="e-ch" type="number" min={1} max={book?.chapters} className="input" value={f.chapter ?? 1} onChange={(e) => set('chapter', Number(e.target.value))} required /></div>
          <div><label className="label" htmlFor="e-vs">Verse</label><input id="e-vs" type="number" min={1} className="input" value={f.verse_start ?? 1} onChange={(e) => set('verse_start', Number(e.target.value))} required /></div>
        </div>
        <div><label className="label" htmlFor="e-ve">End verse (optional)</label><input id="e-ve" type="number" min={1} className="input" value={f.verse_end ?? ''} onChange={(e) => set('verse_end', e.target.value ? Number(e.target.value) : null)} /></div>
        <div><label className="label" htmlFor="e-prompt">Question</label><textarea id="e-prompt" className="input py-2" value={f.prompt ?? ''} onChange={(e) => set('prompt', e.target.value)} required /></div>
        {f.game_mode === 'whoami' && <div><label className="label" htmlFor="e-clues">Clues (one per line, hardest first)</label><textarea id="e-clues" className="input min-h-[100px] py-2" value={(f.clues ?? []).join('\n')} onChange={(e) => set('clues', e.target.value.split('\n'))} /></div>}
        <fieldset><legend className="label">{f.game_mode === 'sequence' ? 'Events in the correct order' : 'Options (choose the correct one)'}</legend>
          {(f.options ?? []).map((o, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              {f.game_mode !== 'sequence' && <input type="radio" name="correct" aria-label={`Option ${i + 1} is correct`} checked={f.correct_index === i} onChange={() => set('correct_index', i)} />}
              <input className="input" aria-label={`Option ${i + 1}`} value={o} onChange={(e) => { const n = [...(f.options ?? [])]; n[i] = e.target.value; set('options', n) }} />
            </div>
          ))}
          {(f.options ?? []).length < 6 && <button type="button" className="btn-ghost btn-sm" onClick={() => set('options', [...(f.options ?? []), ''])}>Add option</button>}
        </fieldset>
        <div><label className="label" htmlFor="e-exp">Explanation</label><textarea id="e-exp" className="input py-2" value={f.explanation ?? ''} onChange={(e) => set('explanation', e.target.value)} required /></div>
        <div><label className="label" htmlFor="e-hint">Hint (optional)</label><input id="e-hint" className="input" value={f.hint ?? ''} onChange={(e) => set('hint', e.target.value)} /></div>
        <div><label className="label" htmlFor="e-img">Illustration ID (optional)</label><input id="e-img" className="input" value={f.image_id ?? ''} onChange={(e) => set('image_id', e.target.value)} /></div>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Save draft</button></div>
      </form>
    </Modal>
  )
}

interface AssetRow { id: string; description: string; bible_reference: string | null; ownership: string; license: string; interpretation_note: string | null; alt_text: string; storage_path: string; review_status: Status; generation_prompt: string | null }

function Images({ isAdmin }: { isAdmin: boolean }) {
  const [rows, setRows] = useState<AssetRow[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const act = useAdminAction()
  const load = useCallback(async () => { const { data } = await (await sb()).from('question_assets').select('*').order('id'); setRows((data ?? []) as AssetRow[]) }, [])
  useEffect(() => { load() }, [load])
  if (!rows) return <div className="loader" role="status" aria-label="Loading" />
  return (
    <div>
      <button className="btn-primary btn-sm mb-4" onClick={() => setUploading(true)}><Plus className="h-4 w-4" aria-hidden="true" />Upload illustration</button>
      <ul className="grid gap-4 md:grid-cols-2">
        {rows.map((a) => (
          <li key={a.id} className="card overflow-hidden">
            <Illustration path={a.storage_path} alt={a.alt_text} className="aspect-[16/9] w-full object-cover" sizes="50vw" />
            <div className="p-4 text-sm">
              <div className="mb-1 flex items-center gap-2"><p className="font-semibold">{a.id}</p><StatusChip s={a.review_status} /></div>
              <p>{a.description} · {a.bible_reference}</p>
              <p className="text-muted"><strong>Alt:</strong> {a.alt_text}</p>
              <p className="text-muted"><strong>Licence:</strong> {a.license} · <strong>Owner:</strong> {a.ownership}</p>
              {a.interpretation_note && <p className="text-muted"><strong>Interpretation:</strong> {a.interpretation_note}</p>}
              <div className="mt-3 flex flex-wrap gap-2">{transitions(a.review_status, isAdmin).map((t) => <button key={t.to} className="btn-secondary btn-sm" onClick={async () => { if (await act(`${a.id}: ${t.to}`, async () => (await sb()).rpc('admin_set_content_status', { p_type: 'asset', p_id: a.id, p_status: t.to, p_note: null }))) load() }}>{t.label}</button>)}</div>
            </div>
          </li>
        ))}
      </ul>
      {uploading && <UploadAsset onClose={() => setUploading(false)} onDone={() => { setUploading(false); load() }} />}
    </div>
  )
}

function UploadAsset({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [f, setF] = useState({ id: '', description: '', bible_reference: '', alt_text: '', ownership: '', license: '', interpretation_note: 'Artistic interpretation. Faces, clothing, colours and composition are imagined.', generation_prompt: '' })
  const act = useAdminAction()
  const field = (k: keyof typeof f, label: string, req = true) => (
    <div><label className="label" htmlFor={`u-${k}`}>{label}</label><input id={`u-${k}`} className="input" value={f[k]} required={req} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  )
  return (
    <Modal open onClose={onClose} title="Upload illustration">
      <form className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1" onSubmit={async (e) => {
        e.preventDefault(); if (!file) return
        const ok = await act('Uploaded as draft', async () => {
          const c = await sb()
          const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp'
          const up = await c.storage.from('illustrations').upload(`${f.id}.${ext}`, file, { upsert: true, contentType: file.type })
          if (up.error) return { error: up.error }
          const url = c.storage.from('illustrations').getPublicUrl(`${f.id}.${ext}`).data.publicUrl
          const dims = await new Promise<{ w: number; h: number }>((res) => { const img = new Image(); img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight }); img.onerror = () => res({ w: 0, h: 0 }); img.src = URL.createObjectURL(file) })
          return c.rpc('admin_upsert_asset', { p: { ...f, storage_path: url, width: dims.w, height: dims.h, is_artistic_interpretation: true } })
        })
        if (ok) onDone()
      }}>
        <div><label className="label" htmlFor="u-file">Image file (WebP, PNG or JPEG, up to 2 MB; WebP around 1200px wide recommended)</label><input id="u-file" type="file" accept="image/webp,image/png,image/jpeg" className="input py-2" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required /></div>
        {field('id', 'ID (lowercase letters, numbers, _ or -)')}
        {field('description', 'Description')}
        {field('bible_reference', 'Bible reference')}
        {field('alt_text', 'Alt text (describe what is shown)')}
        {field('ownership', 'Owner')}
        {field('license', 'Licence / usage rights (do not guess)')}
        {field('interpretation_note', 'Interpretation note', false)}
        {field('generation_prompt', 'Generation prompt (if AI-generated)', false)}
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={!file}>Upload</button></div>
      </form>
    </Modal>
  )
}

function Adventures({ isAdmin }: { isAdmin: boolean }) {
  const [advs, setAdvs] = useState<{ id: string; title: string; status: Status }[] | null>(null)
  const [chs, setChs] = useState<{ id: string; adventure_id: string; position: number; title: string; reference_label: string; narrative: string; image_id: string | null; question_ids: string[]; status: Status }[]>([])
  const [edit, setEdit] = useState<(typeof chs)[number] | null>(null)
  const act = useAdminAction()
  const load = useCallback(async () => {
    const c = await sb()
    const [a, ch] = await Promise.all([c.from('adventures').select('id,title,status').order('sort_order'), c.from('adventure_chapters').select('*').order('position')])
    setAdvs((a.data ?? []) as typeof advs); setChs((ch.data ?? []) as typeof chs)
  }, [])
  useEffect(() => { load() }, [load])
  if (!advs) return <div className="loader" role="status" aria-label="Loading" />
  const status = (type: 'adventure' | 'chapter', id: string, to: Status) => act(`${id}: ${to}`, async () => (await sb()).rpc('admin_set_content_status', { p_type: type, p_id: id, p_status: to, p_note: null })).then(load)
  return (
    <div className="grid gap-6">
      {advs.map((a) => (
        <section key={a.id} className="card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{a.title}</h2><StatusChip s={a.status} />
            <span className="ml-auto flex flex-wrap gap-2">{transitions(a.status, isAdmin).map((t) => <button key={t.to} className="btn-secondary btn-sm" onClick={() => status('adventure', a.id, t.to)}>{t.label}</button>)}</span></div>
          <ul className="divide-y divide-line">
            {chs.filter((c) => c.adventure_id === a.id).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1"><strong>{c.position}. {c.title}</strong> <span className="text-muted">· {c.reference_label} · {c.question_ids.length} questions</span></span>
                <StatusChip s={c.status} />
                {transitions(c.status, isAdmin).map((t) => <button key={t.to} className="btn-ghost btn-sm" onClick={() => status('chapter', c.id, t.to)}>{t.label}</button>)}
                <button className="btn-ghost btn-sm" onClick={() => setEdit(c)}>Edit</button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Players only see an adventure when the adventure, its chapters and the chapter questions are published.</p>
        </section>
      ))}
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={`Edit chapter ${edit.position}`}>
          <form className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); if (await act('Chapter saved as draft', async () => (await sb()).rpc('admin_upsert_chapter', { p: edit }))) { setEdit(null); load() } }}>
            <div><label className="label" htmlFor="c-t">Title</label><input id="c-t" className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required /></div>
            <div><label className="label" htmlFor="c-r">Reference</label><input id="c-r" className="input" value={edit.reference_label} onChange={(e) => setEdit({ ...edit, reference_label: e.target.value })} required /></div>
            <div><label className="label" htmlFor="c-n">Narrative</label><textarea id="c-n" className="input min-h-[120px] py-2" value={edit.narrative} onChange={(e) => setEdit({ ...edit, narrative: e.target.value })} required /></div>
            <div><label className="label" htmlFor="c-q">Question IDs (comma separated, in order)</label><input id="c-q" className="input" value={edit.question_ids.join(', ')} onChange={(e) => setEdit({ ...edit, question_ids: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary">Save draft</button></div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function DailyAdmin() {
  const [rows, setRows] = useState<{ challenge_date: string; question_ids: string[] }[]>([])
  const [date, setDate] = useState(''); const [ids, setIds] = useState('')
  const act = useAdminAction()
  const load = useCallback(async () => { const { data } = await (await sb()).from('daily_challenges').select('*').order('challenge_date', { ascending: false }).limit(30); setRows((data ?? []) as typeof rows) }, [])
  useEffect(() => { load() }, [load])
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form className="card grid gap-3 p-4" onSubmit={async (e) => { e.preventDefault(); if (await act('Daily challenge scheduled', async () => (await sb()).rpc('admin_set_daily', { p_date: date, p_ids: ids.split(',').map((s) => s.trim()).filter(Boolean) }))) load() }}>
        <h2 className="font-semibold">Schedule a daily challenge</h2>
        <p className="text-sm text-muted">Days without a schedule get five published questions automatically. Use 3–10 published question IDs. A day cannot be changed once players have started it.</p>
        <div><label className="label" htmlFor="d-date">Date (UTC)</label><input id="d-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div><label className="label" htmlFor="d-ids">Question IDs (comma separated)</label><textarea id="d-ids" className="input py-2" value={ids} onChange={(e) => setIds(e.target.value)} required /></div>
        <button className="btn-primary">Schedule</button>
      </form>
      <div className="card p-4"><h2 className="mb-2 font-semibold">Recent and upcoming</h2>
        <ul className="divide-y divide-line text-sm">{rows.map((r) => <li key={r.challenge_date} className="py-2"><strong>{r.challenge_date}</strong> <span className="text-muted">{r.question_ids.join(', ')}</span></li>)}</ul>
        {rows.length === 0 && <p className="text-sm text-muted">None yet.</p>}
      </div>
    </div>
  )
}

function StoreAdmin() {
  const [items, setItems] = useState<{ id: string; name: string; price: number; active: boolean; category: string }[]>([])
  const [rules, setRules] = useState<{ id: string; gems: number; description: string }[]>([])
  const act = useAdminAction()
  const load = useCallback(async () => {
    const c = await sb()
    const [i, r] = await Promise.all([c.from('store_items').select('id,name,price,active,category').order('sort_order'), c.from('reward_rules').select('*').order('id')])
    setItems((i.data ?? []) as typeof items); setRules((r.data ?? []) as typeof rules)
  }, [])
  useEffect(() => { load() }, [load])
  return (
    <div className="grid gap-8">
      <section><h2 className="mb-2 text-lg font-semibold">Reward rules</h2>
        <ul className="card divide-y divide-line">{rules.map((r) => <RuleRow key={r.id} r={r} onSave={(g) => act(`${r.id} = ${g}`, async () => (await sb()).rpc('admin_update_reward_rule', { p_id: r.id, p_gems: g })).then(load)} />)}</ul>
        <p className="mt-2 text-xs text-muted">Changes apply to future awards only. Past transactions are never altered.</p></section>
      <section><h2 className="mb-2 text-lg font-semibold">Store prices</h2>
        <ul className="card divide-y divide-line">{items.map((i) => <ItemRow key={i.id} i={i} onSave={(p, a) => act(`${i.name} updated`, async () => (await sb()).rpc('admin_update_store_item', { p_id: i.id, p_price: p, p_active: a })).then(load)} />)}</ul></section>
    </div>
  )
}
function RuleRow({ r, onSave }: { r: { id: string; gems: number; description: string }; onSave: (g: number) => void }) {
  const [g, setG] = useState(r.gems)
  return <li className="flex flex-wrap items-center gap-3 p-3 text-sm"><span className="flex-1">{r.description} <span className="text-muted">({r.id})</span></span><label className="sr-only" htmlFor={`r-${r.id}`}>Gems</label><input id={`r-${r.id}`} type="number" min={0} max={1000} className="input w-28" value={g} onChange={(e) => setG(Number(e.target.value))} /><button className="btn-secondary btn-sm" disabled={g === r.gems} onClick={() => onSave(g)}>Save</button></li>
}
function ItemRow({ i, onSave }: { i: { id: string; name: string; price: number; active: boolean; category: string }; onSave: (p: number, a: boolean) => void }) {
  const [p, setP] = useState(i.price); const [a, setA] = useState(i.active)
  return <li className="flex flex-wrap items-center gap-3 p-3 text-sm"><span className="flex-1">{i.name} <span className="text-muted">· {i.category}</span></span>
    <label className="flex items-center gap-1"><input type="checkbox" checked={a} onChange={(e) => setA(e.target.checked)} />Active</label>
    <label className="sr-only" htmlFor={`p-${i.id}`}>Price</label><input id={`p-${i.id}`} type="number" min={1} className="input w-28" value={p} onChange={(e) => setP(Number(e.target.value))} />
    <button className="btn-secondary btn-sm" disabled={p === i.price && a === i.active} onClick={() => onSave(p, a)}>Save</button></li>
}

function Reports() {
  const [rows, setRows] = useState<{ id: number; target_type: string; target_id: string; reason: string; status: string; created_at: string }[]>([])
  const act = useAdminAction()
  const load = useCallback(async () => { const { data } = await (await sb()).from('reports').select('*').order('created_at', { ascending: false }).limit(200); setRows((data ?? []) as typeof rows) }, [])
  useEffect(() => { load() }, [load])
  if (!rows.length) return <p className="card p-6 text-muted">No player reports.</p>
  return (
    <ul className="card divide-y divide-line">{rows.map((r) => (
      <li key={r.id} className="p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2"><strong>{r.target_type} {r.target_id}</strong><span className="chip">{r.status}</span><span className="text-muted">{new Date(r.created_at).toLocaleString()}</span></div>
        <p className="mt-1">{r.reason}</p>
        <div className="mt-2 flex gap-2">{['reviewing', 'resolved', 'dismissed'].filter((s) => s !== r.status).map((s) => <button key={s} className="btn-secondary btn-sm" onClick={() => act(`Report ${s}`, async () => (await sb()).rpc('admin_set_report_status', { p_id: r.id, p_status: s })).then(load)}>Mark {s}</button>)}</div>
      </li>))}</ul>
  )
}

function Audit() {
  const [rows, setRows] = useState<{ id: number; action: string; target_type: string; target_id: string; created_at: string; details: unknown }[]>([])
  useEffect(() => { sb().then((c) => c.from('admin_audit_log').select('*').order('id', { ascending: false }).limit(200)).then(({ data }) => setRows((data ?? []) as typeof rows)) }, [])
  return (
    <div className="card overflow-x-auto" tabIndex={0} role="region" aria-label="Audit log"><table className="w-full text-left text-sm"><thead className="bg-ink/5"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">Details</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-line align-top"><td className="whitespace-nowrap px-3 py-2">{new Date(r.created_at).toLocaleString()}</td><td className="px-3 py-2">{r.action}</td><td className="px-3 py-2">{r.target_type} {r.target_id}</td><td className="px-3 py-2 font-mono text-xs break-all">{JSON.stringify(r.details).slice(0, 200)}</td></tr>)}</tbody></table>
      {rows.length === 0 && <p className="p-4 text-muted">No admin actions recorded yet.</p>}</div>
  )
}
