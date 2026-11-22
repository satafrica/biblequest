import { Link } from 'react-router-dom'
import { ChevronRight, Lock } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { MODES } from '../game/modes'
import { AI_CREDIT, Gems, Illustration } from '../components/ui'
import { countsFor, describeLevelKey, nextLevel, parseLevelKey, recommendDifficulty, levelKey } from '../engine/levels'
import { todayUTC } from '../lib/ids'
import { ReviewCard, StreakCard } from '../components/Streak'
import { usePlayerStats } from '../state/usePlayerStats'

export default function Home() {
  const { catalog, progress, wallet, achievements, user, backend, profile, prefs } = useApp()
  const stats = usePlayerStats()
  const hero = catalog.assets['hero_jerusalem']
  const today = todayUTC()
  const dailyDone = progress.some((p) => p.level_key === `daily:${today}` && p.times_completed > 0)
  const featured = catalog.adventures[0]
  const featuredDone = featured ? featured.chapters.filter((c) => progress.some((p) => p.level_key === `adv:${c.id}` && p.times_completed > 0)).length : 0
  const recent = [...progress].sort((a, b) => b.last_played_at.localeCompare(a.last_played_at))[0]
  const continueTo = (() => {
    if (!recent) return null
    const p = recent.level_key.split(':')
    const lv = parseLevelKey(recent.level_key)
    if (lv) {
      const n = nextLevel(progress, countsFor(catalog, lv.testament), lv.mode, lv.diff, lv.testament)
      const k = levelKey(lv.mode, lv.diff, n, lv.testament)
      return { to: `/game/${encodeURIComponent(k)}`, label: describeLevelKey(k) }
    }
    if (p[0] === 'adv') {
      const adv = catalog.adventures.find((a) => a.chapters.some((c) => c.id === p[1]))
      const nx = adv?.chapters.find((c) => !progress.some((x) => x.level_key === `adv:${c.id}` && x.times_completed > 0))
      if (nx) return { to: `/game/${encodeURIComponent(`adv:${nx.id}`)}`, label: `${adv!.title} · ${nx.title}` }
    }
    return null
  })()
  const startTestament = prefs.testament ?? 'all'
  const startDiff = recommendDifficulty(progress, 'picture')
  const startTo = `/game/${encodeURIComponent(levelKey('picture', startDiff, nextLevel(progress, countsFor(catalog, startTestament), 'picture', startDiff, startTestament), startTestament))}`
  const levelsDone = progress.filter((p) => p.times_completed > 0 && parseLevelKey(p.level_key)).length
  const guest = backend.kind === 'local' || !user || user.isAnonymous

  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy text-ivory">
        {hero && <Illustration path={hero.path} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" sizes="100vw" priority />}
        <div className="hero-shade absolute inset-0 -z-10" />
        <div className="mx-auto flex min-h-[64vh] max-w-6xl flex-col justify-end px-4 pb-12 pt-24 md:min-h-[72vh] md:pb-16">
          <p className="mb-3 hidden text-sm font-semibold uppercase tracking-[0.2em] text-gold md:block">MyBibleGem</p>
          <h1 className="max-w-3xl text-[clamp(2.25rem,5vw+1rem,4.25rem)] font-semibold leading-[1.05]">
            Explore Scripture. Play the Adventure. Discover the Truth.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ivory/85">
            Bible games for adults: picture quizzes, character riddles, verse challenges and journeys through the whole story — every question tied to a Scripture reference.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={startTo} className="btn-primary px-7 text-base">Start playing</Link>
            <Link to="/play" className="btn border border-ivory/40 text-ivory hover:bg-ivory/10">Browse all games</Link>
          </div>
          {hero && <p className="mt-6 text-xs text-ivory/60">{AI_CREDIT} {hero.interpretation_note}</p>}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <section aria-label="Your progress" className="-mt-8 relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-4">
            <p className="eyebrow mb-1">Gem balance</p>
            <Gems n={wallet.balance} className="text-2xl" />
            <p className="mt-1 text-xs text-muted">{backend.kind === 'local' ? 'Practice gems on this device' : 'Saved to your account'}</p>
          </div>
          <div className="card p-4">
            <p className="eyebrow mb-1">Levels completed</p>
            <p className="text-2xl font-semibold tabular-nums">{levelsDone}</p>
            <p className="mt-1 text-xs text-muted">{catalog.totalQuestions} questions available</p>
          </div>
          <div className="card p-4">
            <p className="eyebrow mb-1">Achievements</p>
            <p className="text-2xl font-semibold tabular-nums">{achievements.length}<span className="text-base text-muted"> / {catalog.achievements.length}</span></p>
            <Link to="/profile#achievements" className="mt-1 inline-block text-xs link">View all</Link>
          </div>
          <div className="card p-4">
            <p className="eyebrow mb-1">{guest ? 'Playing as guest' : 'Signed in'}</p>
            <p className="truncate font-semibold">{profile?.display_name ?? 'Guest pilgrim'}</p>
            {guest && backend.kind === 'cloud' ? <Link to="/account" className="mt-1 inline-block text-xs link">Create an account to keep progress on every device</Link>
              : guest ? <Link to="/about#accounts" className="mt-1 inline-block text-xs link">How accounts work</Link>
              : <Link to="/profile" className="mt-1 inline-block text-xs link">Profile and settings</Link>}
          </div>
        </section>

        <section aria-label="Streak and review" className="mt-4 grid gap-3 md:grid-cols-2">
          <StreakCard stats={stats} />
          <ReviewCard stats={stats} />
        </section>

        {continueTo && (
          <section className="mt-8">
            <Link to={continueTo.to} className="card flex items-center gap-4 p-4 hover:border-accent">
              <div className="min-w-0 flex-1"><p className="eyebrow">Continue playing</p><p className="truncate font-semibold">{continueTo.label}</p></div>
              <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
            </Link>
          </section>
        )}

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <article className="card overflow-hidden">
            <div className="grid sm:grid-cols-[180px_1fr]">
              {catalog.assets['abraham_stars'] && <Illustration path={catalog.assets['abraham_stars'].path} alt={catalog.assets['abraham_stars'].alt} className="h-40 w-full object-cover sm:h-full" sizes="180px" />}
              <div className="p-5">
                <p className="eyebrow mb-1">Daily challenge · {today}</p>
                <h2 className="text-xl font-semibold mb-1">Five questions, new every day</h2>
                <p className="text-sm text-muted mb-4">{dailyDone ? 'Completed today. A new challenge arrives at midnight UTC.' : `Finish today's set for a ${catalog.rewards.daily_challenge ?? 25}-gem bonus.`}</p>
                <Link to="/daily" className={dailyDone ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}>{dailyDone ? 'Review today' : 'Play today\u2019s challenge'}</Link>
              </div>
            </div>
          </article>
          {featured && (
            <article className="card overflow-hidden">
              <div className="grid sm:grid-cols-[180px_1fr]">
                {featured.image_id && catalog.assets[featured.image_id] && <Illustration path={catalog.assets[featured.image_id].path} alt={catalog.assets[featured.image_id].alt} className="h-40 w-full object-cover sm:h-full" sizes="180px" />}
                <div className="p-5">
                  <p className="eyebrow mb-1">Featured adventure</p>
                  <h2 className="text-xl font-semibold mb-1">{featured.title}</h2>
                  <p className="text-sm text-muted mb-3">{featured.summary}</p>
                  <div className="mb-4 flex items-center gap-2 text-xs text-muted">
                    <div className="h-1.5 flex-1 rounded-full bg-line/60"><div className="h-full rounded-full bg-good" style={{ width: `${(featuredDone / featured.chapters.length) * 100}%` }} /></div>
                    {featuredDone}/{featured.chapters.length} chapters
                  </div>
                  <Link to={`/adventures/${featured.id}`} className="btn-primary btn-sm">{featuredDone ? 'Continue journey' : 'Begin journey'}</Link>
                </div>
              </div>
            </article>
          )}
        </section>

        <section className="mt-12" aria-labelledby="games-h">
          <div className="mb-4 flex items-end justify-between">
            <h2 id="games-h" className="text-2xl font-semibold">Games</h2>
            <Link to="/play" className="text-sm link">All games</Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.filter((m) => m.live).map((m) => (
              <li key={m.id}>
                <Link to={m.to!} className="card group block overflow-hidden hover:border-accent">
                  {m.image && catalog.assets[m.image] && <Illustration path={catalog.assets[m.image].path} alt="" className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" />}
                  <div className="p-4">
                    <h3 className="flex items-center gap-2 text-lg font-semibold"><m.Icon className="h-5 w-5 text-accent" aria-hidden="true" />{m.name}</h3>
                    <p className="mt-1 text-sm text-muted">{m.blurb}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {MODES.some((m) => !m.live) && (
            <>
              <h3 className="mt-10 mb-3 text-lg font-semibold">In development</h3>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {MODES.filter((m) => !m.live).map((m) => (
                  <li key={m.id} className="card flex items-start gap-3 p-4 border-dashed shadow-none" aria-label={`${m.name}: in development, not yet playable`}>
                    <m.Icon className="mt-0.5 h-5 w-5 text-muted" aria-hidden="true" />
                    <div><p className="font-semibold">{m.name} <span className="chip ml-1 align-middle"><Lock className="h-3 w-3" aria-hidden="true" />In development</span></p><p className="text-sm text-muted">{m.blurb}</p></div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="mt-12 card grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-xl font-semibold">The Gem Store</h2>
            <p className="text-sm text-muted">Spend gems on hints, profile frames, badges, colour themes and illustration galleries. Scripture learning and accessibility features always stay free.</p>
          </div>
          <Link to="/store" className="btn-secondary">Open the store</Link>
        </section>
      </div>
    </>
  )
}
