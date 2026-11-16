import { Link, Navigate, useParams } from 'react-router-dom'
import { Lock, Users } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { Illustration, PageHeader } from '../components/ui'

const GALLERIES: Record<string, { title: string; ids: string[] }> = {
  coll_ot: { title: 'Old Testament Gallery', ids: ['creation', 'noah_ark', 'abraham_stars', 'joseph_coat', 'moses_red_sea', 'david_goliath', 'solomon_temple', 'elijah_carmel', 'esther_king', 'daniel_lions', 'jonah_fish'] },
  coll_nt: { title: 'Gospels and Acts Gallery', ids: ['nativity', 'sermon_mount', 'calming_storm', 'good_samaritan', 'prodigal_son', 'empty_tomb', 'pentecost', 'paul_ship'] },
}

export function Collection() {
  const { id = '' } = useParams()
  const { owns, catalog } = useApp()
  const g = GALLERIES[id]
  if (!g) return <Navigate to="/store" replace />
  if (owns(id) < 1) return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <Lock className="mx-auto mb-3 h-8 w-8 text-muted" aria-hidden="true" />
      <h1 className="text-2xl font-semibold mb-2">{g.title}</h1>
      <p className="text-muted mb-5">Unlock this gallery in the store to view every illustration with its Scripture reference and artistic notes.</p>
      <Link to="/store" className="btn-primary">Go to the store</Link>
    </div>
  )
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Illustration gallery" title={g.title}>All illustrations are artistic interpretations. Notes below each image separate what Scripture describes from what the artist imagined.</PageHeader>
      <ul className="grid gap-6 md:grid-cols-2">
        {g.ids.map((aid) => catalog.assets[aid]).filter(Boolean).map((a) => (
          <li key={a.id} className="card overflow-hidden">
            <figure>
              <Illustration path={a.path} alt={a.alt} className="aspect-[4/3] w-full object-cover" sizes="(min-width:768px) 50vw, 100vw" />
              <figcaption className="p-4"><p className="font-semibold">{a.description}</p><p className="text-sm">{a.reference}</p><p className="mt-1 text-sm text-muted">{a.interpretation_note}</p></figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function About() {
  const { backend, catalog } = useApp()
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="About" title="About BibleQuest">Explore Scripture. Play the Adventure. Discover the Truth.</PageHeader>
      <div className="space-y-8 leading-relaxed">
        <section><h2 className="text-xl font-semibold mb-2">Scripture text and references</h2>
          <p>Questions quote and cite the King James Version (KJV). The KJV is in the public domain in most countries; in the United Kingdom it is under Crown patent administered by Cambridge University Press, so permission is needed before distributing KJV text in the UK. Every reference was checked automatically against a KJV text file (from the open-source <a className="link" href="https://github.com/thiagobodruk/bible" target="_blank" rel="noreferrer">thiagobodruk/bible</a> project): the cited verses must exist and contain the answer’s key words.</p>
          <p className="mt-2">Other translations (for example Spanish, French, Portuguese, Twi or Swahili Bibles) will be added only after their licences are confirmed. The app is built so text can be translated later; only English is available today.</p></section>
        <section><h2 className="text-xl font-semibold mb-2">Editorial review</h2>
          <p>Questions, illustrations and adventure chapters move through draft → review → approved → published. Only published content appears in games on the live service. {backend.kind === 'local' ? `This preview shows all ${catalog.totalQuestions} questions currently in review so the project owner can check them; they are not yet marked as human-approved.` : ''} Explanations stick to what the text says; where Christian traditions interpret a passage differently, BibleQuest avoids presenting one reading as settled fact.</p></section>
        <section><h2 className="text-xl font-semibold mb-2">Illustrations</h2>
          <p>Illustrations were created with an AI image generator for BibleQuest and are artistic interpretations. Faces, clothing, colours and settings are imagined; each image carries a note distinguishing what Scripture describes from artistic detail. Commercial-use terms of the generator should be confirmed by the owner before public release.</p></section>
        <section><h2 className="text-xl font-semibold mb-2">Gems</h2>
          <p>Gems are earned by playing: {catalog.rewards.correct_answer} for the first correct answer to each question, {catalog.rewards.level_complete} for completing a level for the first time, {catalog.rewards.perfect_round} for a first perfect round, {catalog.rewards.daily_challenge} for each daily challenge and {catalog.rewards.adventure_complete} for completing an adventure. Replaying the same question does not earn gems again. Gems never expire, cannot go below zero, and cannot be bought, sold or exchanged for money.</p></section>
        <section id="accounts" className="scroll-mt-24"><h2 className="text-xl font-semibold mb-2">Accounts and saving</h2>
          {backend.kind === 'cloud'
            ? <p>You can play as a guest straight away; your guest progress is saved to a private guest account on this device. Create an account with your email to keep progress, gems and items on every device. All gem awards and purchases are calculated and stored by the server.</p>
            : <p>This build runs without the online backend. Progress and practice gems are stored only in this browser. Connecting the Supabase backend enables accounts, password recovery, cross-device saves, leaderboards and server-verified gems.</p>}
        </section>
        <section id="privacy" className="scroll-mt-24"><h2 className="text-xl font-semibold mb-2">Privacy</h2>
          <p>BibleQuest stores what it needs to run the game: your email (if you register), display name, avatar, progress, answers, gem history, items and settings. Leaderboards show only players who opt in, by display name. There is no advertising tracking. Error reports, if enabled by the operator, exclude your answers and personal details. Read the full <Link className="link" to="/privacy">Privacy policy</Link> and <Link className="link" to="/terms">Terms of use</Link>.</p></section>
        <section><h2 className="text-xl font-semibold mb-2">Accessibility</h2>
          <p>BibleQuest aims for WCAG 2.2 AA: keyboard play (number keys 1–4 answer), screen-reader labels, alt text for every illustration, adjustable text size, high contrast, light and dark themes, reduced motion and optional timers. <Link className="link" to="/settings">Open settings</Link>.</p></section>
      </div>
    </div>
  )
}

export function Community() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Community" title="Friends, groups and multiplayer">Not yet available.</PageHeader>
      <div className="card flex gap-4 p-6">
        <Users className="h-8 w-8 shrink-0 text-muted" aria-hidden="true" />
        <div className="leading-relaxed">
          <p>Church groups, friend lists, study groups and live multiplayer are planned. The database already includes group and membership tables with moderation reports, but these features are switched off until they are finished, moderated and tested.</p>
          <p className="mt-3 text-sm text-muted">Planned safeguards: invitation-only groups, group leaders as moderators, reporting of names and messages, no direct messages between strangers.</p>
        </div>
      </div>
    </div>
  )
}
