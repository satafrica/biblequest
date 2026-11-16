import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { friendlyError } from '../engine'
import { PageHeader } from '../components/ui'

type Tab = 'signin' | 'signup' | 'reset'

function authMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (/invalid login credentials/i.test(m)) return 'That email and password do not match an account.'
  if (/already registered|already been registered|exists/i.test(m)) return 'An account with this email already exists. Try signing in.'
  if (/password/i.test(m) && /characters|short|weak/i.test(m)) return 'Choose a stronger password (at least 8 characters).'
  if (/rate limit/i.test(m)) return 'Too many attempts. Please wait a minute and try again.'
  return friendlyError(e)
}

export default function Account() {
  const { backend, user, refresh } = useApp()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  if (backend.kind !== 'cloud') {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <PageHeader eyebrow="Account" title="Accounts are not switched on in this build" />
        <p className="card p-5 leading-relaxed">This preview runs without the online backend, so sign-up, sign-in, password reset and cross-device saves are unavailable here. Everything you play is kept on this device. Once the Supabase project is connected (see SETUP.md), this page offers registration, login and password recovery, and guest progress links to the new account.</p>
        <p className="mt-4"><Link to="/" className="link">Back to home</Link></p>
      </div>
    )
  }
  if (user && !user.isAnonymous) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <PageHeader eyebrow="Account" title="You are signed in">{user.email}</PageHeader>
        <div className="flex gap-3"><Link to="/profile" className="btn-primary">Go to profile</Link><button className="btn-secondary" onClick={async () => { await backend.signOut(); nav('/') }}>Sign out</button></div>
      </div>
    )
  }

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true); setMsg(null)
    try { const t = await fn(); if (t) setMsg({ tone: 'ok', text: t }) } catch (e) { setMsg({ tone: 'err', text: authMessage(e) }) } finally { setBusy(false) }
  }
  const isGuest = Boolean(user?.isAnonymous)

  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-14">
      <PageHeader eyebrow="Account" title={tab === 'signin' ? 'Sign in' : tab === 'signup' ? 'Create your account' : 'Reset your password'}>
        {tab === 'signup' && isGuest && 'Your current guest progress, gems and items stay with you when you add an email.'}
        {tab === 'signin' && isGuest && 'Signing in to an existing account switches to that account. Progress from this guest session stays with the guest session.'}
      </PageHeader>
      <div role="tablist" className="mb-5 flex gap-2">
        {(['signup', 'signin', 'reset'] as Tab[]).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setMsg(null) }} className={`btn btn-sm ${tab === t ? 'bg-ink text-bg' : 'border border-line'}`}>{t === 'signup' ? 'Create account' : t === 'signin' ? 'Sign in' : 'Forgot password'}</button>)}
      </div>
      <form className="card grid gap-4 p-5" onSubmit={(e) => {
        e.preventDefault()
        if (tab === 'signin') run(async () => { await backend.signIn(email, password); await refresh(); nav('/profile') })
        else if (tab === 'signup') run(async () => {
          const r = await backend.signUp(email, password, name.trim())
          await refresh()
          return isGuest
            ? 'Check your email to confirm your address. After confirming, set a password in Profile → Account security so you can sign in on other devices.'
            : r.needsConfirmation ? 'Check your email to confirm your account, then sign in.' : 'Account created.'
        })
        else run(async () => { await backend.requestPasswordReset(email); return 'If an account exists for that email, a reset link is on its way.' })
      }}>
        {tab === 'signup' && <div><label htmlFor="name" className="label">Display name</label><input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="nickname" /></div>}
        <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
        {(tab === 'signin' || (tab === 'signup' && !isGuest)) && (
          <div><label htmlFor="pw" className="label">Password</label><input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={tab === 'signin' ? 'current-password' : 'new-password'} />
            {tab === 'signup' && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}</div>
        )}
        {msg && <p role={msg.tone === 'err' ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${msg.tone === 'err' ? 'border-bad/60 text-bad' : 'border-good/60'}`}>{msg.text}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Please wait…' : tab === 'signin' ? 'Sign in' : tab === 'signup' ? 'Create account' : 'Send reset link'}</button>
      </form>
      <p className="mt-4 text-xs text-muted">We store your email, display name, progress and gem history to run the game. By creating an account you agree to the <Link className="link" to="/terms">Terms of use</Link>; see the <Link className="link" to="/privacy">Privacy policy</Link>.</p>
    </div>
  )
}

export function NewPassword() {
  const { backend, user } = useApp()
  const nav = useNavigate()
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  if (backend.kind !== 'cloud' || !user) return <div className="mx-auto max-w-md px-4 py-12"><PageHeader title="Set a new password">Open the link from your password email, or <Link className="link" to="/account">request a new one</Link>.</PageHeader></div>
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageHeader eyebrow="Account security" title="Set a new password" />
      <form className="card grid gap-4 p-5" onSubmit={async (e) => {
        e.preventDefault()
        if (pw !== pw2) { setMsg({ tone: 'err', text: 'The passwords do not match.' }); return }
        setBusy(true)
        try { await backend.updatePassword(pw); setMsg({ tone: 'ok', text: 'Password updated.' }); setTimeout(() => nav('/profile'), 900) } catch (er) { setMsg({ tone: 'err', text: authMessage(er) }) } finally { setBusy(false) }
      }}>
        <div><label htmlFor="np" className="label">New password</label><input id="np" type="password" className="input" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
        <div><label htmlFor="np2" className="label">Repeat password</label><input id="np2" type="password" className="input" minLength={8} required value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></div>
        {msg && <p role={msg.tone === 'err' ? 'alert' : 'status'} className="text-sm">{msg.text}</p>}
        <button className="btn-primary" disabled={busy}>Save password</button>
      </form>
    </div>
  )
}
