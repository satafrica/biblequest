import { useMemo, useState } from 'react'
import { DIFFICULTY_LABELS, type Difficulty } from '../engine'

export type Status = 'draft' | 'review' | 'approved' | 'published' | 'rejected' | 'archived'

export interface AdminQuestion {
  id: string; game_mode: string; book_id: number; chapter: number; verse_start: number | null; verse_end: number | null
  reference_label: string; difficulty: number; prompt: string; clues: string[] | null; options: string[]; correct_index: number
  explanation: string; hint: string | null; image_id: string | null; translation_id: string; tags: string[]; status: Status
  verification?: Record<string, unknown> | null
}

export const STATUS_STYLE: Record<Status, string> = {
  draft: 'border-line text-muted', review: 'border-royal text-royal', approved: 'border-good text-good',
  published: 'border-good bg-good/10 text-good', rejected: 'border-bad text-bad', archived: 'border-line text-muted line-through',
}
export const StatusChip = ({ s }: { s: Status }) => <span className={`chip ${STATUS_STYLE[s]}`}>{s}</span>

/** Allowed next states, mirroring admin_set_question_status / admin_set_content_status. */
export function transitions(from: Status, isAdmin: boolean): { to: Status; label: string }[] {
  const t: { to: Status; label: string }[] = []
  if (from === 'draft' || from === 'rejected') t.push({ to: 'review', label: 'Send to review' })
  if (from === 'review') t.push({ to: 'approved', label: 'Approve' }, { to: 'rejected', label: 'Reject' })
  if (from === 'approved' && isAdmin) t.push({ to: 'published', label: 'Publish' })
  if (from === 'published' && isAdmin) t.push({ to: 'archived', label: 'Archive' })
  if (from !== 'draft') t.push({ to: 'draft', label: 'Back to draft' })
  return t
}

export function useQuestionFilter(questions: AdminQuestion[]) {
  const [status, setStatus] = useState<string>('all')
  const [mode, setMode] = useState<string>('all')
  const [diff, setDiff] = useState<string>('all')
  const [q, setQ] = useState('')
  const rows = useMemo(() => questions.filter((x) =>
    (status === 'all' || x.status === status) && (mode === 'all' || x.game_mode === mode) && (diff === 'all' || String(x.difficulty) === diff) &&
    (!q || `${x.id} ${x.prompt} ${x.reference_label} ${x.options.join(' ')}`.toLowerCase().includes(q.toLowerCase()))), [questions, status, mode, diff, q])
  const controls = (
    <div className="mb-4 grid gap-2 sm:grid-cols-4">
      <label className="sr-only" htmlFor="f-q">Search</label>
      <input id="f-q" className="input" placeholder="Search text, reference or ID" value={q} onChange={(e) => setQ(e.target.value)} />
      <Select id="f-status" label="Status" value={status} onChange={setStatus} options={['all', 'draft', 'review', 'approved', 'published', 'rejected', 'archived']} />
      <Select id="f-mode" label="Mode" value={mode} onChange={setMode} options={['all', 'picture', 'whoami', 'scripture', 'sequence']} />
      <Select id="f-diff" label="Difficulty" value={diff} onChange={setDiff} options={['all', '1', '2', '3', '4']} render={(v) => v === 'all' ? 'All difficulties' : DIFFICULTY_LABELS[Number(v) as Difficulty]} />
    </div>
  )
  return { rows, controls }
}

export function Select({ id, label, value, onChange, options, render }: { id: string; label: string; value: string; onChange: (v: string) => void; options: string[]; render?: (v: string) => string }) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{render ? render(o) : o === 'all' ? `All ${label.toLowerCase()}` : o}</option>)}
      </select>
    </>
  )
}

export function QuestionDetail({ q }: { q: AdminQuestion }) {
  return (
    <div className="grid gap-2 text-sm">
      <p><strong>Prompt:</strong> {q.prompt}</p>
      {q.clues && <ol className="list-decimal pl-5">{q.clues.map((c, i) => <li key={i}>{c}</li>)}</ol>}
      <ol className="list-decimal pl-5">{q.options.map((o, i) => <li key={i} className={(q.game_mode === 'sequence' || i === q.correct_index) ? 'font-semibold text-good' : ''}>{o}{q.game_mode !== 'sequence' && i === q.correct_index && ' ✓'}</li>)}</ol>
      {q.game_mode === 'sequence' && <p className="text-muted">Sequence options are stored in the correct order; players see them shuffled.</p>}
      <p><strong>Reference:</strong> {q.reference_label} ({q.translation_id})</p>
      <p><strong>Explanation:</strong> {q.explanation}</p>
      {q.hint && <p><strong>Hint:</strong> {q.hint}</p>}
      {q.image_id && <p><strong>Image:</strong> {q.image_id}</p>}
      {q.verification && Object.keys(q.verification).length > 0 && <p className="text-muted"><strong>Automated check:</strong> {Object.entries(q.verification).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}</p>}
    </div>
  )
}

export function toCSV(rows: AdminQuestion[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = ['id', 'status', 'mode', 'difficulty', 'reference', 'prompt', 'clues', 'option_1', 'option_2', 'option_3', 'option_4', 'option_5', 'correct', 'explanation', 'hint', 'image', 'reviewer_decision', 'reviewer_notes']
  const lines = rows.map((q) => [q.id, q.status, q.game_mode, DIFFICULTY_LABELS[q.difficulty as Difficulty], q.reference_label, q.prompt, (q.clues ?? []).join(' | '),
    ...Array.from({ length: 5 }, (_, i) => q.options[i] ?? ''), q.game_mode === 'sequence' ? 'options are in correct order' : q.options[q.correct_index], q.explanation, q.hint ?? '', q.image_id ?? '', '', ''].map(esc).join(','))
  return [head.join(','), ...lines].join('\n')
}

export function download(name: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
