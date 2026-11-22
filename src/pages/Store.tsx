import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { friendlyError, GameError, type StoreItem } from '../engine'
import { readJSON, writeJSON } from '../lib/storage'
import { uuid } from '../lib/ids'
import { Gems, ItemArt, Modal, PageHeader } from '../components/ui'

const CATS: { id: StoreItem['category'] | 'all'; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'power_up', label: 'Power-ups' }, { id: 'badge', label: 'Badges' }, { id: 'frame', label: 'Frames' },
  { id: 'theme', label: 'Themes' }, { id: 'collection', label: 'Galleries' }, { id: 'collectible', label: 'Collectibles' },
  { id: 'decoration', label: 'Decorations' }, { id: 'bonus', label: 'Bonus challenges' },
]
export const EQUIPPABLE = new Set(['badge', 'frame', 'theme', 'decoration'])
const PENDING = 'bq.pendingPurchases.v1'

/**
 * Purchases carry an idempotency key that is stored before the request is sent. If the
 * connection drops and the player tries again, the same key is reused, so the server
 * returns the original result instead of charging twice.
 */
function keyFor(itemId: string): string {
  const p = readJSON<Record<string, string>>(PENDING, {})
  if (!p[itemId]) { p[itemId] = uuid(); writeJSON(PENDING, p) }
  return p[itemId]
}
function clearKey(itemId: string) { const p = readJSON<Record<string, string>>(PENDING, {}); delete p[itemId]; writeJSON(PENDING, p) }

export function usePurchase() {
  const { backend, refresh, toast, setBalance } = useApp()
  const [busy, setBusy] = useState(false)
  const buy = async (item: StoreItem) => {
    setBusy(true)
    try {
      const r = await backend.purchase(item.id, keyFor(item.id))
      clearKey(item.id)
      setBalance(r.balance)
      toast({ title: r.replayed ? 'Already unlocked' : `${item.name} unlocked`, body: r.replayed ? 'Your earlier unlock went through; the gems were used only once.' : `Balance: ${r.balance} gems`, tone: 'gem' })
      await refresh()
      return true
    } catch (e) {
      if (!(e instanceof GameError && e.code === 'offline')) clearKey(item.id)
      toast({ title: 'Unlock not completed', body: friendlyError(e), tone: 'error' })
      return false
    } finally { setBusy(false) }
  }
  return { buy, busy }
}

export default function StorePage() {
  const { catalog, wallet, inventory, backend, toast, refresh } = useApp()
  const [cat, setCat] = useState<(typeof CATS)[number]['id']>('all')
  const [confirm, setConfirm] = useState<StoreItem | null>(null)
  const { buy, busy } = usePurchase()
  const items = useMemo(() => catalog.store.filter((i) => cat === 'all' || i.category === cat).sort((a, b) => a.sort - b.sort), [catalog.store, cat])
  const inv = (id: string) => inventory.find((i) => i.item_id === id)

  const equip = async (item: StoreItem, on: boolean) => {
    try { await backend.setEquipped(item.id, on); await refresh() } catch (e) { toast({ title: 'Could not update', body: friendlyError(e), tone: 'error' }) }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Earned by playing" title="Gem Rewards">
        Gems are earned by playing and never expire. They can't be bought, and nothing in MyBibleGem costs real money. Hints and cosmetics are optional — every Scripture lesson and accessibility feature is free.
      </PageHeader>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="chip border-accent py-1.5 text-sm">Your balance: <Gems n={wallet.balance} /></span>
        {backend.kind === 'local' && <span className="text-sm text-muted">Practice gems in this preview stay on this device.</span>}
        <Link to="/profile#wallet" className="ml-auto text-sm link">Gem history</Link>
      </div>
      <div role="tablist" aria-label="Reward categories" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {CATS.map((c) => <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={`btn btn-sm shrink-0 ${cat === c.id ? 'bg-ink text-bg' : 'border border-line bg-raised'}`}>{c.label}</button>)}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const owned = inv(item.id)
          const ownedNonConsumable = owned && !item.consumable
          const short = item.price - wallet.balance
          return (
            <li key={item.id} className={`card flex gap-4 p-4 ${owned?.equipped ? 'border-accent' : ''}`}>
              <ItemArt item={item} />
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 className="font-semibold leading-tight">{item.name}</h2>
                <p className="mt-0.5 text-sm text-muted">{item.description}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                  {ownedNonConsumable ? (
                    <>
                      <span className="chip border-good text-good"><Check className="h-3 w-3" aria-hidden="true" />Unlocked</span>
                      {EQUIPPABLE.has(item.category) && <button className="btn-secondary btn-sm" onClick={() => equip(item, !owned.equipped)}>{owned.equipped ? 'Unequip' : 'Equip'}</button>}
                      {item.category === 'collection' && <Link to={`/collection/${item.id}`} className="btn-secondary btn-sm">Open gallery</Link>}
                      {item.category === 'bonus' && <Link to="/arena" className="btn-secondary btn-sm">Go to Arena</Link>}
                    </>
                  ) : (
                    <>
                      <span className="text-sm"><span className="text-muted">Gems needed </span><span className="font-semibold"><Gems n={item.price} /></span></span>
                      {item.consumable && owned && <span className="chip">You have {owned.quantity}</span>}
                      <button className="btn-primary btn-sm ml-auto" disabled={busy || short > 0} onClick={() => setConfirm(item)}
                        aria-label={short > 0 ? `${item.name}: need ${short} more gems` : `Unlock ${item.name} for ${item.price} gems`}>
                        {short > 0 ? `Need ${short} more` : 'Unlock'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Confirm unlock">
        {confirm && (
          <div>
            <div className="flex items-center gap-4"><ItemArt item={confirm} size="sm" /><div><p className="font-semibold">{confirm.name}</p><p className="text-sm text-muted">{confirm.description}</p></div></div>
            <dl className="mt-5 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Gems needed</dt><dd><Gems n={confirm.price} /></dd></div>
              <div className="flex justify-between"><dt>Current balance</dt><dd><Gems n={wallet.balance} /></dd></div>
              <div className="flex justify-between border-t border-line pt-1 font-semibold"><dt>Gems left</dt><dd><Gems n={wallet.balance - confirm.price} /></dd></div>
            </dl>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy} onClick={async () => { if (await buy(confirm)) setConfirm(null) }}>{busy ? 'Unlocking…' : `Unlock for ${confirm.price} gems`}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
