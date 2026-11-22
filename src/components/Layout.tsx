import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Compass, House, Map, Store, UserRound, WifiOff, X } from 'lucide-react'
import { stays, useApp } from '../state/AppContext'
import { Avatar, Gems, Logo } from './ui'

const NAV = [
  { to: '/play', label: 'Play' },
  { to: '/adventures', label: 'Adventures' },
  { to: '/daily', label: 'Daily' },
  { to: '/arena', label: 'Arena' },
  { to: '/store', label: 'Store' },
]
const TABS = [
  { to: '/', label: 'Home', Icon: House, end: true },
  { to: '/play', label: 'Play', Icon: Compass },
  { to: '/adventures', label: 'Journeys', Icon: Map },
  { to: '/store', label: 'Store', Icon: Store },
  { to: '/profile', label: 'Profile', Icon: UserRound },
]

export function PreviewBanner() {
  const { backend } = useApp()
  if (backend.kind !== 'local') return null
  return (
    <div className="border-b border-line bg-royal/10 text-sm">
      <p className="mx-auto max-w-6xl px-4 py-2">
        <strong className="font-semibold">Editorial preview.</strong> <span className="sm:hidden">Questions await human review; practice gems {backend.persistent ? 'stay on this device' : 'reset when you close'}.</span><span className="hidden sm:inline">Questions are checked against the KJV text but still await human review.
        Gems here are practice gems {backend.persistent ? 'saved on this device only' : 'that reset when you close this window'}; accounts and cloud saves need the online backend.</span> <Link className="link" to="/about">Details</Link>
      </p>
    </div>
  )
}

export function Layout() {
  const { wallet, profile, user, backend, online, toasts, dismissToast, dismissOtherPages, inventory } = useApp()
  const loc = useLocation()
  useEffect(() => { window.scrollTo(0, 0); dismissOtherPages(loc.pathname) }, [loc.pathname, dismissOtherPages])
  const frame = inventory.find((i) => i.equipped && i.item_id.startsWith('frame_'))?.item_id
  const staff = profile && profile.role !== 'player'
  const isGuest = backend.kind === 'local' || !user || user.isAnonymous

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 btn-primary">Skip to content</a>
      <PreviewBanner />
      {!online && (
        <div role="status" className="bg-bad/10 text-sm border-b border-line">
          <p className="mx-auto max-w-6xl px-4 py-2 flex items-center gap-2"><WifiOff className="h-4 w-4" aria-hidden="true" />
            {backend.kind === 'cloud' ? 'You are offline. Answers and gems are checked by the server, so new rounds start when you reconnect.' : 'You are offline. Preview play continues on this device.'}
          </p>
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="MyBibleGem home">
            <Logo />
            <span className="font-display text-xl font-semibold tracking-tight">MyBibleGem</span>
          </Link>
          <nav aria-label="Main" className="ml-4 hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-ink/[.07] text-ink' : 'text-muted hover:text-ink'}`}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/profile#wallet" className="chip border-accent/60 bg-raised py-1.5 text-sm" aria-label={`Gem balance: ${wallet.balance} gems. Open wallet`}>
              <Gems n={wallet.balance} />
            </Link>
            {isGuest && backend.kind === 'cloud' && <Link to="/account" className="btn-secondary btn-sm hidden sm:inline-flex">Sign in</Link>}
            <Link to="/profile" className="hidden md:inline-flex" aria-label={`Profile: ${profile?.display_name ?? 'Guest'}`}>
              <Avatar id={profile?.avatar_id ?? 'scroll'} frame={frame} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 pb-24 md:pb-10">
        <Outlet />
      </main>

      <footer className="hidden md:block border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted">
          <span>MyBibleGem · Explore Scripture. Play the Adventure. Discover the Truth.</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 md:ml-auto">
            <Link className="hover:text-ink" to="/about">About &amp; licensing</Link>
            <Link className="hover:text-ink" to="/community">Community</Link>
            <Link className="hover:text-ink" to="/settings">Settings</Link>
            <Link className="hover:text-ink" to="/leaderboard">Leaderboards</Link>
            <Link className="hover:text-ink" to="/privacy">Privacy</Link>
            <Link className="hover:text-ink" to="/terms">Terms</Link>
            {staff && <Link className="hover:text-ink" to="/admin">Admin</Link>}
            {backend.kind === 'local' && <Link className="hover:text-ink" to="/admin">Content review</Link>}
          </nav>
        </div>
      </footer>

      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="grid grid-cols-5">
          {TABS.map(({ to, label, Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[12px] font-medium ${isActive ? 'text-ink' : 'text-muted'}`}>
                {({ isActive }) => (<><Icon className={`h-5 w-5 ${isActive ? 'text-accent' : ''}`} aria-hidden="true" />{label}</>)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
        {toasts.filter((t) => stays(t, loc.pathname)).map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto card flex max-w-sm items-start gap-3 bg-raised px-4 py-3 fade-up ${t.tone === 'error' ? 'border-bad/60' : t.tone === 'gem' ? 'border-accent' : ''}`}>
            <div className="min-w-0">
              <p className="font-semibold">{t.title}</p>
              {t.body && <p className="text-sm text-muted">{t.body}</p>}
            </div>
            <button className="ml-auto text-muted hover:text-ink" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
