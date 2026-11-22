import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Copy, Flag, Swords, UserPlus, Users } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { Avatar, Modal, PageHeader } from '../components/ui'
import { DIFFICULTY_LABELS, friendlyError, type ChallengeDetail, type ChallengeMode, type ChallengeSummary, type Community as CommunityApi, type Friend, type GroupDetail, type GroupSummary } from '../engine'

const CHALLENGE_MODES: { v: ChallengeMode; label: string }[] = [
  { v: 'mixed', label: 'Mixed questions' },
  { v: 'picture', label: 'Picture Bible Quiz' },
  { v: 'whoami', label: 'Who Am I?' },
  { v: 'scripture', label: 'Scripture Challenge' },
  { v: 'wisdom', label: 'Wisdom Decisions' },
  { v: 'geography', label: 'Geography Explorer' },
]

const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

/** Shows why community features are not available, or renders children with the API. */
function useCommunity(): { api: CommunityApi | null; gate: ReactNode | null } {
  const { backend, user } = useApp()
  if (!backend.community) return { api: null, gate: (
    <Gate title="Needs the online version">Friends, groups and challenge matches are stored on the MyBibleGem server, so they are only available at <a className="link" href="https://mybiblegem.com">mybiblegem.com</a>.</Gate>
  ) }
  if (!user || user.isAnonymous) return { api: null, gate: (
    <Gate title="Needs a free account">Friends, groups and challenge matches need a registered account so other players can find you safely. Your guest progress carries over when you <Link className="link" to="/account">create a free account</Link>.</Gate>
  ) }
  return { api: backend.community, gate: null }
}

function Gate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card flex gap-4 p-6" data-testid="community-gate">
      <Users className="h-8 w-8 shrink-0 text-muted" aria-hidden="true" />
      <div className="leading-relaxed"><p className="font-semibold">{title}</p><p className="mt-1 text-muted">{children}</p></div>
    </div>
  )
}

function CopyCode({ code, label }: { code: string; label: string }) {
  const { toast } = useApp()
  return (
    <button type="button" className="btn-secondary btn-sm font-mono tracking-widest" aria-label={`Copy ${label} ${code}`}
      onClick={() => { navigator.clipboard?.writeText(code).then(() => toast({ title: 'Copied', body: `${label} ${code}`, tone: 'info' }), () => {}) }}>
      {code}<Copy className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}

function ReportButton({ api, type, id, name }: { api: CommunityApi; type: 'profile' | 'group'; id: string; name: string }) {
  const { toast } = useApp()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <>
      <button type="button" className="btn-ghost btn-sm text-muted" onClick={() => setOpen(true)} aria-label={`Report ${name}`}><Flag className="h-4 w-4" aria-hidden="true" /></button>
      <Modal open={open} title={`Report ${name}`} onClose={() => setOpen(false)}>
        <form onSubmit={async (e) => {
          e.preventDefault(); setBusy(true)
          try { await api.report(type, id, reason.trim() || 'Inappropriate name or content'); toast({ title: 'Report sent', body: 'An administrator will review it.', tone: 'info' }); setOpen(false); setReason('') }
          catch (er) { toast({ title: 'Report not sent', body: friendlyError(er), tone: 'error' }) } finally { setBusy(false) }
        }}>
          <label className="block text-sm font-medium" htmlFor="report-reason">What is wrong? (optional)</label>
          <textarea id="report-reason" className="input mt-1 min-h-[88px] py-2" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy}>Send report</button></div>
        </form>
      </Modal>
    </>
  )
}

export function Community() {
  const { api, gate } = useCommunity()
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Community" title="Friends, groups and challenges">
        Add friends with a private code, start a group for your church or study circle, and send challenge matches where everyone answers the same ten questions. There is no chat or direct messaging; only display names and scores are shared.
      </PageHeader>
      {gate ?? <CommunityHome api={api!} />}
    </div>
  )
}

function CommunityHome({ api }: { api: CommunityApi }) {
  const { toast } = useApp()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [friends, setFriends] = useState<Friend[] | null>(null)
  const [groups, setGroups] = useState<GroupSummary[] | null>(null)
  const [challenges, setChallenges] = useState<ChallengeSummary[] | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try {
      const [c, f, g, ch] = await Promise.all([api.myFriendCode(), api.listFriends(), api.listGroups(), api.listChallenges()])
      setCode(c); setFriends(f); setGroups(g); setChallenges(ch); setError('')
    } catch (e) { setError(friendlyError(e)) }
  }, [api])
  useEffect(() => { load() }, [load])

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); if (ok) toast({ title: ok, tone: 'info' }); await load() } catch (e) { toast({ title: 'Not done', body: friendlyError(e), tone: 'error' }) }
  }

  if (error) return <p className="card p-6" role="alert">{error} <button type="button" className="link" onClick={load}>Try again</button></p>
  if (!friends || !groups || !challenges) return <p className="text-muted" role="status">Loading…</p>

  const incoming = friends.filter((f) => f.status === 'pending' && f.direction === 'incoming')
  const outgoing = friends.filter((f) => f.status === 'pending' && f.direction === 'outgoing')
  const accepted = friends.filter((f) => f.status === 'accepted').sort((a, b) => (b.weekly_correct ?? 0) - (a.weekly_correct ?? 0))

  return (
    <div className="grid gap-8">
      {/* Friends */}
      <section aria-labelledby="friends-h" className="card p-5 md:p-6">
        <h2 id="friends-h" className="flex items-center gap-2 text-xl font-semibold"><UserPlus className="h-5 w-5" aria-hidden="true" />Friends</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span>Your friend code:</span><CopyCode code={code} label="Friend code" />
          <span className="text-muted">Share it only with people you know.</span>
        </div>
        <CodeForm id="friend-code" label="Add a friend by code" button="Send request" onSubmit={(c) => act(async () => {
          const r = await api.sendFriendRequest(c)
          toast({ title: r === 'accepted' ? 'You are now friends' : r === 'already_friends' ? 'Already friends' : r === 'pending' ? 'Request already sent' : 'Friend request sent', tone: 'info' })
        })} />
        {incoming.length > 0 && (
          <div className="mt-5"><h3 className="eyebrow mb-2">Requests for you</h3>
            <ul className="divide-y divide-line rounded-xl border border-line">{incoming.map((f) => (
              <li key={f.user_id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <Avatar id={f.avatar_id} size="sm" /><span className="flex-1 font-medium">{f.display_name}</span>
                <button type="button" className="btn-primary btn-sm" onClick={() => act(() => api.respondFriendRequest(f.user_id, true), 'Friend added')}>Accept</button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => act(() => api.respondFriendRequest(f.user_id, false))}>Decline</button>
                <ReportButton api={api} type="profile" id={f.user_id} name={f.display_name} />
              </li>))}</ul>
          </div>
        )}
        <div className="mt-5"><h3 className="eyebrow mb-2">This week (correct answers, Monday–Sunday UTC)</h3>
          {accepted.length === 0 ? <p className="text-sm text-muted">No friends yet. Send your code to someone, or add theirs above.</p> : (
            <ol className="divide-y divide-line rounded-xl border border-line" data-testid="friends-board">{accepted.map((f, i) => (
              <li key={f.user_id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-6 text-right tabular-nums text-muted">{i + 1}</span><Avatar id={f.avatar_id} size="sm" />
                <span className="flex-1 font-medium">{f.display_name}</span>
                <span className="tabular-nums">{f.weekly_correct ?? 0}</span>
                <button type="button" className="btn-ghost btn-sm text-muted" onClick={() => { if (confirm(`Remove ${f.display_name} from your friends?`)) act(() => api.removeFriend(f.user_id)) }}>Remove</button>
                <ReportButton api={api} type="profile" id={f.user_id} name={f.display_name} />
              </li>))}</ol>
          )}
          {outgoing.length > 0 && <p className="mt-2 text-sm text-muted">Waiting for: {outgoing.map((f) => f.display_name).join(', ')} <span className="sr-only">(sent requests)</span></p>}
        </div>
      </section>

      {/* Groups */}
      <section aria-labelledby="groups-h" className="card p-5 md:p-6">
        <h2 id="groups-h" className="flex items-center gap-2 text-xl font-semibold"><Users className="h-5 w-5" aria-hidden="true" />Groups</h2>
        <p className="mt-1 text-sm text-muted">Groups are invitation-only: people join with the group's invite code. The owner and moderators can remove members.</p>
        {groups.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">{groups.map((g) => (
            <li key={g.id}><Link to={`/community/group/${g.id}`} className="card block p-4 shadow-none hover:border-accent">
              <p className="font-semibold">{g.name}</p>
              <p className="text-sm text-muted">{g.members} member{g.members === 1 ? '' : 's'} · you are {g.my_role === 'owner' ? 'the owner' : `a ${g.my_role}`}</p>
            </Link></li>))}</ul>
        )}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <CodeForm id="group-code" label="Join a group by invite code" button="Join" onSubmit={(c) => act(async () => { const id = await api.joinGroup(c); navigate(`/community/group/${id}`) })} />
          <CreateGroup onCreate={(n, d) => act(async () => { const r = await api.createGroup(n, d); navigate(`/community/group/${r.id}`) })} />
        </div>
      </section>

      {/* Challenges */}
      <section aria-labelledby="ch-h" className="card p-5 md:p-6">
        <h2 id="ch-h" className="flex items-center gap-2 text-xl font-semibold"><Swords className="h-5 w-5" aria-hidden="true" />Challenge matches</h2>
        <p className="mt-1 text-sm text-muted">Create a match and share its code. Everyone who enters the code plays the same ten questions, at any time in the next seven days, and the scores appear on one board. Matches are not played live at the same moment.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <CreateChallenge groups={groups} onCreate={(m, d, g) => act(async () => { const c = await api.createChallenge(m, d, g); navigate(`/community/challenge/${c}`) })} />
          <CodeForm id="challenge-code" label="Enter a challenge code" button="Open" onSubmit={async (c) => navigate(`/community/challenge/${c.toUpperCase()}`)} />
        </div>
        <ChallengeList list={challenges} empty="You have not created or played any matches in the last 30 days." />
      </section>
    </div>
  )
}

function CodeForm({ id, label, button, onSubmit }: { id: string; label: string; button: string; onSubmit: (code: string) => Promise<unknown> }) {
  const [v, setV] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); const c = v.trim().toUpperCase(); if (!c) return
    setBusy(true); try { await onSubmit(c); setV('') } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="mt-4">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <div className="mt-1 flex gap-2">
        <input id={id} className="input font-mono uppercase tracking-widest" value={v} onChange={(e) => setV(e.target.value.replace(/[^a-z0-9]/gi, ''))} maxLength={10} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
        <button className="btn-primary shrink-0" disabled={busy || !v.trim()}>{button}</button>
      </div>
    </form>
  )
}

function CreateGroup({ onCreate }: { onCreate: (name: string, desc: string) => Promise<unknown> }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form className="mt-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onCreate(name.trim(), desc.trim()) } finally { setBusy(false) } }}>
      <label htmlFor="group-name" className="block text-sm font-medium">Start a group</label>
      <input id="group-name" className="input mt-1" placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required minLength={3} />
      <input aria-label="Group description (optional)" className="input mt-2" placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={200} />
      <button className="btn-secondary mt-2" disabled={busy || name.trim().length < 3}>Create group</button>
    </form>
  )
}

function CreateChallenge({ groups, onCreate, fixedGroup }: { groups?: GroupSummary[]; fixedGroup?: string; onCreate: (m: ChallengeMode, d: number, g: string | null) => Promise<unknown> }) {
  const [mode, setMode] = useState<ChallengeMode>('mixed')
  const [diff, setDiff] = useState(2)
  const [group, setGroup] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form className="mt-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onCreate(mode, diff, fixedGroup ?? (group || null)) } finally { setBusy(false) } }}>
      <p className="text-sm font-medium">Create a match</p>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <select aria-label="Questions" className="input" value={mode} onChange={(e) => setMode(e.target.value as ChallengeMode)}>{CHALLENGE_MODES.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}</select>
        <select aria-label="Highest difficulty" className="input" value={diff} onChange={(e) => setDiff(Number(e.target.value))}>{[1, 2, 3, 4].map((d) => <option key={d} value={d}>Up to {DIFFICULTY_LABELS[d as 1]}</option>)}</select>
      </div>
      {!fixedGroup && groups && groups.length > 0 && (
        <select aria-label="Share with a group (optional)" className="input mt-2" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Not linked to a group (share the code yourself)</option>
          {groups.map((g) => <option key={g.id} value={g.id}>Post to {g.name}</option>)}
        </select>
      )}
      <button className="btn-secondary mt-2" disabled={busy}>Create match</button>
    </form>
  )
}

function ChallengeList({ list, empty }: { list: ChallengeSummary[]; empty: string }) {
  if (list.length === 0) return <p className="mt-4 text-sm text-muted">{empty}</p>
  return (
    <ul className="mt-5 divide-y divide-line rounded-xl border border-line">{list.map((c) => (
      <li key={c.code}><Link to={`/community/challenge/${c.code}`} className="flex flex-wrap items-center gap-3 px-3 py-2 hover:bg-raised">
        <span className="font-mono tracking-widest">{c.code}</span>
        <span className="flex-1">{c.title}{c.group ? <span className="text-muted"> · {c.group}</span> : null}</span>
        <span className="text-sm text-muted">{c.players} played · ends {fmtDate(c.expires_at)}</span>
        {c.played && <span className="chip">Played</span>}
      </Link></li>))}</ul>
  )
}

export function GroupPage() {
  const { id = '' } = useParams()
  const { api, gate } = useCommunity()
  return <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">{gate ? <><PageHeader eyebrow="Community" title="Group" />{gate}</> : <GroupView api={api!} id={id} />}</div>
}

function GroupView({ api, id }: { api: CommunityApi; id: string }) {
  const { toast } = useApp()
  const navigate = useNavigate()
  const [g, setG] = useState<GroupDetail | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const load = useCallback(async () => { try { setG(await api.getGroup(id)); setError('') } catch (e) { setError(friendlyError(e)) } }, [api, id])
  useEffect(() => { load() }, [load])
  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); if (ok) toast({ title: ok, tone: 'info' }); await load() } catch (e) { toast({ title: 'Not done', body: friendlyError(e), tone: 'error' }) }
  }
  if (error) return <><p className="mb-3 text-sm"><Link to="/community" className="link">← Community</Link></p><p className="card p-6" role="alert">{error}</p></>
  if (!g) return <p className="text-muted" role="status">Loading…</p>
  const canModerate = g.my_role === 'owner' || g.my_role === 'moderator'
  return (
    <>
      <p className="mb-3 text-sm"><Link to="/community" className="link">← Community</Link></p>
      <PageHeader eyebrow="Group" title={g.name}>{g.description}</PageHeader>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>Invite code:</span><CopyCode code={g.invite_code} label="Invite code" />
        <span className="text-muted">Anyone with this code can join.</span>
        <span className="flex-1" />
        {g.is_owner && <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit group</button>}
        {!g.is_owner && <button type="button" className="btn-secondary btn-sm" onClick={() => { if (confirm(`Leave ${g.name}?`)) act(async () => { await api.leaveGroup(g.id); navigate('/community') }, 'You left the group') }}>Leave group</button>}
        <ReportButton api={api} type="group" id={g.id} name={g.name} />
      </div>

      <section className="card mt-6 p-5" aria-labelledby="members-h">
        <h2 id="members-h" className="text-lg font-semibold">Members this week</h2>
        <p className="text-sm text-muted">Correct answers since Monday (UTC).</p>
        <ol className="mt-3 divide-y divide-line rounded-xl border border-line" data-testid="group-members">{[...g.members].sort((a, b) => b.weekly_correct - a.weekly_correct).map((m, i) => (
          <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-3 py-2">
            <span className="w-6 text-right tabular-nums text-muted">{i + 1}</span><Avatar id={m.avatar_id} size="sm" />
            <span className="flex-1 font-medium">{m.display_name}{m.is_me && <span className="text-muted"> (you)</span>} {m.role !== 'member' && <span className="chip ml-1">{m.role}</span>}</span>
            <span className="tabular-nums">{m.weekly_correct}</span>
            {g.is_owner && !m.is_me && <button type="button" className="btn-ghost btn-sm" onClick={() => act(() => api.setModerator(g.id, m.user_id, m.role !== 'moderator'))}>{m.role === 'moderator' ? 'Remove moderator' : 'Make moderator'}</button>}
            {canModerate && !m.is_me && m.role !== 'owner' && (g.is_owner || m.role === 'member') && <button type="button" className="btn-ghost btn-sm text-red-700 dark:text-red-300" onClick={() => { if (confirm(`Remove ${m.display_name} from the group?`)) act(() => api.removeMember(g.id, m.user_id), 'Member removed') }}>Remove</button>}
            {!m.is_me && <ReportButton api={api} type="profile" id={m.user_id} name={m.display_name} />}
          </li>))}</ol>
      </section>

      <section className="card mt-6 p-5" aria-labelledby="gch-h">
        <h2 id="gch-h" className="text-lg font-semibold">Group challenge matches</h2>
        <CreateChallenge fixedGroup={g.id} onCreate={(m, d, gid) => act(async () => { const c = await api.createChallenge(m, d, gid); navigate(`/community/challenge/${c}`) })} />
        <ChallengeList list={g.challenges} empty="No open matches in this group. Create one above." />
      </section>

      {g.is_owner && <EditGroup open={editing} g={g} onClose={() => setEditing(false)}
        onSave={(n, d, nc) => act(async () => { await api.updateGroup(g.id, n, d, nc); setEditing(false) }, 'Group updated')}
        onDelete={() => act(async () => { await api.deleteGroup(g.id); navigate('/community') }, 'Group deleted')} />}
    </>
  )
}

function EditGroup({ open, g, onClose, onSave, onDelete }: { open: boolean; g: GroupDetail; onClose: () => void; onSave: (n: string, d: string, newCode: boolean) => void; onDelete: () => void }) {
  const [name, setName] = useState(g.name)
  const [desc, setDesc] = useState(g.description ?? '')
  const [newCode, setNewCode] = useState(false)
  return (
    <Modal open={open} title="Edit group" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(name.trim(), desc.trim(), newCode) }}>
        <label htmlFor="eg-name" className="block text-sm font-medium">Name</label>
        <input id="eg-name" className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} minLength={3} required />
        <label htmlFor="eg-desc" className="mt-3 block text-sm font-medium">Description</label>
        <input id="eg-desc" className="input mt-1" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={200} />
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={newCode} onChange={(e) => setNewCode(e.target.checked)} />Make a new invite code (the old one stops working)</label>
        <div className="mt-5 flex flex-wrap justify-between gap-2">
          <button type="button" className="btn-ghost text-red-700 dark:text-red-300" onClick={() => { if (confirm(`Delete ${g.name} for everyone? This cannot be undone.`)) onDelete() }}>Delete group</button>
          <div className="flex gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary">Save</button></div>
        </div>
      </form>
    </Modal>
  )
}

export function ChallengePage() {
  const { code = '' } = useParams()
  const { backend, user } = useApp()
  const [c, setC] = useState<ChallengeDetail | null>(null)
  const [error, setError] = useState('')
  const api = backend.community
  useEffect(() => {
    if (!api || !user) return
    api.getChallenge(code).then((r) => { setC(r); setError('') }, (e) => setError(friendlyError(e)))
  }, [api, user, code])
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <p className="mb-3 text-sm"><Link to="/community" className="link">← Community</Link></p>
      {!api ? <><PageHeader eyebrow="Challenge match" title={code} /><Gate title="Needs the online version">Challenge matches are stored on the MyBibleGem server. Open this code at <a className="link" href="https://mybiblegem.com">mybiblegem.com</a>.</Gate></>
        : !user ? <><PageHeader eyebrow="Challenge match" title={code} /><p className="card p-6">Please <Link className="link" to="/account">start playing or sign in</Link> first, then open this match again.</p></>
        : error ? <><PageHeader eyebrow="Challenge match" title={code} /><p className="card p-6" role="alert">{error}</p></>
        : !c ? <p className="text-muted" role="status">Loading…</p>
        : <>
            <PageHeader eyebrow={`Challenge match · ${c.code}`} title={c.title}>
              {c.questions} questions{c.creator ? `, created by ${c.creator}` : ''}{c.group ? ` for ${c.group}` : ''}. {c.expired ? `Ended ${fmtDate(c.expires_at)}.` : `Open until ${fmtDate(c.expires_at)}.`} Everyone gets the same questions; your first completed round is the score that counts.
            </PageHeader>
            <div className="card flex flex-wrap items-center gap-4 p-5">
              <span className="text-sm">Share code:</span><CopyCode code={c.code} label="Challenge code" />
              <span className="flex-1" />
              {!c.expired && <Link to={`/game/${encodeURIComponent(`challenge:${c.code}`)}`} className="btn-primary">{c.played ? 'Play again (practice)' : 'Play now'}</Link>}
            </div>
            <section className="card mt-6 p-5" aria-labelledby="res-h">
              <h2 id="res-h" className="text-lg font-semibold">Results</h2>
              {c.results.length === 0 ? <p className="mt-2 text-sm text-muted">Nobody has finished this match yet.</p> : (
                <ol className="mt-3 divide-y divide-line rounded-xl border border-line" data-testid="challenge-results">{c.results.map((r, i) => (
                  <li key={i} className={`flex items-center gap-3 px-3 py-2 ${r.is_me ? 'bg-accent/10' : ''}`}>
                    <span className="w-6 text-right tabular-nums text-muted">{i + 1}</span>
                    <span className="flex-1 font-medium">{r.display_name}{r.is_me && <span className="text-muted"> (you)</span>}</span>
                    <span className="tabular-nums">{r.correct}/{r.total}</span><span className="w-20 text-right tabular-nums text-muted">{r.points} pts</span>
                  </li>))}</ol>
              )}
            </section>
          </>}
    </div>
  )
}
