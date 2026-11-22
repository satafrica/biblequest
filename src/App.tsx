import { lazy, Suspense, Component, type ReactNode } from 'react'
import { HashRouter, Route, Routes, Link, Navigate } from 'react-router-dom'
import { AppProvider } from './state/AppContext'
import { Layout } from './components/Layout'
import Home from './pages/Home'
import { PlayHub, PlayMode } from './pages/Play'
import { AdventureDetail, AdventureList } from './pages/Adventures'
import { Arena, Daily, Leaderboard } from './pages/Challenges'
import StorePage from './pages/Store'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Account, { NewPassword } from './pages/Account'
import { About, Collection } from './pages/Info'
import { Master } from './pages/Master'
import { ChallengePage, Community, GroupPage } from './pages/Community'
import { Privacy, Terms } from './pages/Legal'
import GameRunner from './game/GameRunner'
import { report } from './lib/monitor'

const Admin = lazy(() => import('./admin/Admin'))

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e: unknown) { report(e, 'react') }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-muted mb-6">Your saved progress is safe. Reload the page to continue.</p>
        <button className="btn-primary" onClick={() => location.reload()}>Reload</button>
      </div>
    )
  }
}

function NotFound() {
  return <div className="mx-auto max-w-md px-4 py-16 text-center"><h1 className="text-2xl font-semibold mb-2">Page not found</h1><Link className="link" to="/">Go home</Link></div>
}

export default function App() {
  return (
    <Boundary>
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="play" element={<PlayHub />} />
              <Route path="play/:mode" element={<PlayMode />} />
              <Route path="game/:levelKey" element={<GameRunner />} />
              <Route path="adventures" element={<AdventureList />} />
              <Route path="adventures/:id" element={<AdventureDetail />} />
              <Route path="mystery" element={<AdventureList kind="mystery" />} />
              <Route path="parables" element={<AdventureList kind="parables" />} />
              <Route path="master" element={<Master />} />
              <Route path="daily" element={<Daily />} />
              <Route path="arena" element={<Arena />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="rewards" element={<StorePage />} />
              <Route path="store" element={<Navigate to="/rewards" replace />} />
              <Route path="collection/:id" element={<Collection />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="account" element={<Account />} />
              <Route path="account/new-password" element={<NewPassword />} />
              <Route path="about" element={<About />} />
              <Route path="community" element={<Community />} />
              <Route path="community/group/:id" element={<GroupPage />} />
              <Route path="community/challenge/:code" element={<ChallengePage />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="terms" element={<Terms />} />
              <Route path="admin" element={<Suspense fallback={<div className="loader mx-auto my-20" />}><Admin /></Suspense>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </HashRouter>
      </AppProvider>
    </Boundary>
  )
}
