import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Award, BookOpen as Book, Wheat as Bread, Crown, Eye, Gem, Map, Route, Scroll, Sun, UserRound, type LucideIcon } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { friendlyError, type Transaction } from '../engine'
import { AVATARS, Avatar, Gems, ItemArt, Modal, PageHeader } from '../components/ui'
import { EQUIPPABLE } from './Store'
import { ReviewCard, StreakCalendar } from '../components/Streak'
import { usePlayerStats } from '../state/usePlayerStats'

const ACH_ICONS: Record<string, LucideIcon> = { sun: Sun, scroll: Scroll, book: Book, crown: Crown, path: Route, gem: Gem, bread: Bread, map: Map, eye: Eye, person: UserRound }

export default function Profile() {
  const { profile, wallet, inventory, achievements, catalog, backend, user, refresh, toast, progress } = useApp()
  const loc = useLocation()
  const stats = usePlayerStats()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [txs, setTxs] = useState<Transaction[] | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  useEffect(() => { setName(profile?.display_name ?? '') }, [profile?.display_name])
  useEffect(() => { backend.getTransactions(100).then(setTxs).catch(() => setTxs([])) }, [backend, wallet.balance])
  useEffect(() => {
    if (loc.hash) document.getElementById(loc.hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [loc.hash, txs])

  const frame = inventory.find((i) => i.equipped && i.item_id.startsWith('frame_'))?.item_id
  const badge = inventory.find((i) => i.equipped && i.item_id.startsWith('badge_'))
  const deco = inventory.find((i) => i.equipped && i.item_id.startsWith('deco_'))?.item_id
  const itemOf = (id: string) => catalog.store.find((s) => s.id === id)
  const guest = backend.kind === 'local' || !user || user.isAnonymous
  const advDone = catalog.adventures.filter((a) => a.chapters.every((c) => progress.some((p) => p.level_key === `adv:${c.id}` && p.times_completed > 0)))

  const save = async (patch: Parameters<typeof backend.updateProfile>[0]) => {
    try { await backend.updateProfile(patch); await refresh(); toast({ title: 'Profile saved' }) } catch (e) { toast({ title: 'Not saved', body: friendlyError(e), tone: 'error' }) }
  }
  const equip = async (id: string, on: boolean) => { try { await backend.setEquipped(id, on); await refresh() } catch (e) { toast({ title: 'Could not update', body: friendlyError(e), tone: 'error' }) } }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Profile" title={profile?.display_name ?? 'Guest pilgrim'} />
      <section className="card mb-8 flex flex-wrap items-center gap-5 p-5">
        <Avatar id={profile?.avatar_id ?? 'scroll'} frame={frame} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{guest ? (backend.kind === 'cloud' ? 'Guest account on this device' : 'Preview guest on this device') : user?.email}</p>
          {badge && itemOf(badge.item_id) && <p className="mt-1 chip border-accent">{itemOf(badge.item_id)!.name}</p>}
          <div className="mt-2 flex flex-wrap gap-4 text-sm"><span><Gems n={wallet.balance} /> balance</span><span className="text-muted">{wallet.lifetime_earned.toLocaleString()} earned all-time</span></div>
        </div>
        {backend.kind === 'cloud' && (guest ? <Link to="/account" className="btn-primary">Create account or sign in</Link> : <div className="flex flex-wrap gap-2">{profile && profile.role !== 'player' && <Link to="/admin" className="btn-secondary">Admin dashboard</Link>}<Link to="/account/new-password" className="btn-ghost">Change password</Link><button className="btn-secondary" onClick={() => backend.signOut()}>Sign out</button></div>)}
      </section>

      <section id="streak" className="mb-10 grid scroll-mt-24 gap-6 md:grid-cols-2">
        <StreakCalendar stats={stats} />
        <div className="self-start"><ReviewCard stats={stats} /></div>
      </section>

      <section className="mb-10 grid gap-6 md:grid-cols-2">
        <form className="card p-5" onSubmit={(e) => { e.preventDefault(); save({ display_name: name.trim() }) }}>
          <h2 className="mb-3 text-lg font-semibold">Display name</h2>
          <label htmlFor="dn" className="label">Shown on leaderboards if you opt in</label>
          <div className="flex gap-2"><input id="dn" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} minLength={1} required /><button className="btn-primary" disabled={!name.trim() || name.trim() === profile?.display_name}>Save</button></div>
        </form>
        <div className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Avatar</h2>
          <div role="radiogroup" aria-label="Choose avatar" className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button key={a.id} role="radio" aria-checked={profile?.avatar_id === a.id} aria-label={a.label} onClick={() => save({ avatar_id: a.id })}
                className={`rounded-full p-0.5 ${profile?.avatar_id === a.id ? 'ring-2 ring-accent' : ''}`}><Avatar id={a.id} size="sm" /></button>
            ))}
          </div>
        </div>
      </section>

      <section id="achievements" className="mb-10 scroll-mt-24">
        <h2 className="mb-3 text-xl font-semibold">Achievements <span className="text-base text-muted">{achievements.length}/{catalog.achievements.length}</span></h2>
        <ul className={`grid gap-3 rounded-2xl sm:grid-cols-2 lg:grid-cols-3 ${deco === 'deco_stars' ? 'bg-navy p-4 bg-[radial-gradient(#F7F0DE_1px,transparent_1px)] [background-size:22px_22px]' : deco === 'deco_laurel' ? 'border-2 border-dashed border-accent p-4' : ''}`}>
          {catalog.achievements.map((a) => {
            const got = achievements.find((e) => e.achievement_id === a.id)
            const Icon = ACH_ICONS[a.icon] ?? Award
            return (
              <li key={a.id} className={`card flex items-start gap-3 p-4 ${got ? '' : 'border-dashed shadow-none'}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${got ? 'bg-accent text-accent-ink' : 'bg-line/60 text-muted'}`} aria-hidden="true"><Icon className="h-5 w-5" /></span>
                <div><p className="font-semibold">{a.name}</p><p className="text-sm text-muted">{a.description}</p><p className="mt-1 text-xs">{got ? `Earned ${new Date(got.earned_at).toLocaleDateString()}` : 'Not yet earned'}</p></div>
              </li>
            )
          })}
        </ul>
      </section>

      {advDone.length > 0 && (
        <section className="mb-10"><h2 className="mb-3 text-xl font-semibold">Completed adventures</h2>
          <ul className="flex flex-wrap gap-2">{advDone.map((a) => <li key={a.id} className="chip border-good py-1 text-sm">{a.title}</li>)}</ul>
        </section>
      )}

      <section id="inventory" className="mb-10 scroll-mt-24">
        <h2 className="mb-3 text-xl font-semibold">Inventory</h2>
        {inventory.filter((i) => i.quantity > 0).length === 0 ? <p className="card p-5 text-muted">Nothing yet. <Link to="/store" className="link">Visit the store</Link>.</p> : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inventory.filter((i) => i.quantity > 0).map((i) => {
              const it = itemOf(i.item_id)
              if (!it) return null
              return (
                <li key={i.item_id} className={`card flex items-center gap-3 p-3 ${i.equipped ? 'border-accent' : ''}`}>
                  <ItemArt item={it} size="sm" />
                  <div className="min-w-0 flex-1"><p className="font-semibold leading-tight">{it.name}</p><p className="text-xs text-muted">{it.consumable ? `Quantity ${i.quantity}` : i.equipped ? 'Equipped' : 'Owned'}</p></div>
                  {EQUIPPABLE.has(it.category) && <button className="btn-secondary btn-sm" onClick={() => equip(i.item_id, !i.equipped)}>{i.equipped ? 'Unequip' : 'Equip'}</button>}
                  {it.category === 'collection' && <Link className="btn-secondary btn-sm" to={`/collection/${it.id}`}>Open</Link>}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section id="history" className="mb-10 scroll-mt-24">
        <h2 id="wallet" className="mb-3 text-xl font-semibold scroll-mt-24">Gem history</h2>
        {!txs ? <div className="loader" role="status" aria-label="Loading history" /> : txs.length === 0 ? <p className="card p-5 text-muted">No gem activity yet.</p> : (
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink/5"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Activity</th><th className="px-4 py-2 text-right">Gems</th><th className="px-4 py-2 text-right">Balance</th></tr></thead>
              <tbody>{txs.map((t) => (
                <tr key={t.id} className="border-t border-line"><td className="whitespace-nowrap px-4 py-2 text-muted">{new Date(t.created_at).toLocaleString()}</td><td className="px-4 py-2">{t.reason}</td>
                  <td className={`px-4 py-2 text-right tabular-nums font-semibold ${t.amount > 0 ? 'text-good' : 'text-bad'}`}>{t.amount > 0 ? `+${t.amount}` : t.amount}</td><td className="px-4 py-2 text-right tabular-nums">{t.balance_after}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-2 text-lg font-semibold">Settings &amp; data</h2>
        <p className="text-sm text-muted mb-3">Theme, text size, contrast, motion and timers are in <Link to="/settings" className="link">Settings</Link>.</p>
        {backend.kind === 'local' && 'reset' in backend && (
          <>
            <button className="btn-secondary btn-sm" onClick={() => setResetOpen(true)}>Reset preview data on this device</button>
            <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset preview data?">
              <p className="text-sm">This clears practice gems, purchases, achievements and progress stored by this preview on this device. It cannot be undone.</p>
              <div className="mt-5 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setResetOpen(false)}>Cancel</button>
                <button className="btn-primary" onClick={async () => { (backend as unknown as { reset: () => void }).reset(); await refresh(); setResetOpen(false); toast({ title: 'Preview data cleared' }) }}>Reset</button></div>
            </Modal>
          </>
        )}
        {backend.kind === 'cloud' && user && <DeleteAccount />}
        <p className="mt-4 text-sm text-muted"><Link to="/privacy" className="link">Privacy</Link> · <Link to="/terms" className="link">Terms of use</Link></p>
      </section>
    </div>
  )
}

function DeleteAccount() {
  const { backend, refresh, toast, user } = useApp()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="mt-4 border-t border-line pt-4">
      <button className="btn-ghost btn-sm text-bad" onClick={() => setOpen(true)}>Delete my account</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete your account?">
        <p className="text-sm">This permanently deletes {user?.isAnonymous ? 'this guest account' : 'your account'} and everything saved with it: gems, items, progress, achievements, answers and any reports you sent. It cannot be undone.</p>
        <label htmlFor="del-confirm" className="label mt-4">Type DELETE to confirm</label>
        <input id="del-confirm" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary bg-bad" disabled={typed.trim() !== 'DELETE' || busy} onClick={async () => {
            setBusy(true)
            try { await backend.deleteAccount(); setOpen(false); await refresh().catch(() => {}); toast({ title: 'Account deleted', body: 'Your data has been removed. You can keep playing as a new guest.' }) }
            catch (e) { toast({ title: 'Account not deleted', body: friendlyError(e), tone: 'error' }) }
            finally { setBusy(false) }
          }}>Delete permanently</button>
        </div>
      </Modal>
    </div>
  )
}
