import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { PageHeader } from '../components/ui'

// These pages describe what the app actually stores and does today. They are written
// in plain language and should be reviewed by the owner (and ideally a lawyer) before
// public launch. The contact address comes from VITE_CONTACT_EMAIL at build time.
const UPDATED = 'November 16, 2026'
const CONTACT = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim()

function Contact() {
  return CONTACT
    ? <a className="link" href={`mailto:${CONTACT}`}>{CONTACT}</a>
    : <span>the contact address that will be listed here before public launch</span>
}

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return <section id={id} className="scroll-mt-24"><h2 className="mb-2 text-xl font-semibold">{title}</h2><div className="space-y-2">{children}</div></section>
}

export function Privacy() {
  const { backend } = useApp()
  const cloud = backend.kind === 'cloud'
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Privacy" title="Privacy policy">Last updated {UPDATED}. This page explains, in plain language, what MyBibleGem stores and why.</PageHeader>
      <div className="space-y-8 leading-relaxed">
        {!cloud && (
          <p className="card p-4 text-sm">You are using the offline preview. It has no server: everything below about accounts does not apply, and your progress stays in this browser only.</p>
        )}
        <Section title="What we store">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Account details</strong> (only if you create an account): your email address and a password. Passwords are stored by our authentication provider in hashed form; we never see them.</li>
            <li><strong>Profile</strong>: display name, chosen avatar, whether you opted in to leaderboards, and your display settings (theme, text size, sound, vibration, read-aloud).</li>
            <li><strong>Game activity</strong>: rounds you start and finish, the answer you chose for each question and whether it was right, your progress, streak days, achievements, gem history and unlocked reward items.</li>
            <li><strong>Reports</strong> you send about a question, including the text you write.</li>
          </ul>
          <p>Guests who have not registered get a private guest account with no email address. The same game activity is stored for it.</p>
          <p>We do not collect your real name, location, contacts, photos or payment details. MyBibleGem has no advertising and no advertising or analytics trackers.</p>
        </Section>
        <Section title="Why we store it">
          <p>Only to run the game: to save your progress and gems, show your streak and the questions to review, prevent gems being earned twice for the same question, show opt-in leaderboards, and let editors fix questions you report.</p>
        </Section>
        <Section title="On your device">
          <p>The app keeps a few items in your browser's local storage: your display settings, the round you are currently playing (so it can resume), and your sign-in session. The offline preview also keeps its practice progress there. Clearing your browser data removes them.</p>
          <p>Read-aloud uses your device's built-in voice. On some devices the operating system or browser may use an online voice service to speak the text; only the question or verse text is spoken, never your account details.</p>
        </Section>
        <Section title="Who can see it">
          <ul className="list-disc space-y-1 pl-5">
            <li>Other players see only your display name and score, and only if you opt in to leaderboards.</li>
            <li>MyBibleGem editors and administrators can see reports and profile details needed to moderate content.</li>
            <li>Our service providers process data on our behalf to host the app: Supabase (database and sign-in, hosted in the United States) and the website host.</li>
          </ul>
          <p>We do not sell or rent personal information.</p>
        </Section>
        <Section title="Error reports">
          <p>If the operator turns on error reporting, crash reports contain the error message, the page and the app version. Email addresses, sign-in tokens and your answers are removed before sending.</p>
        </Section>
        <Section id="delete" title="Your choices and deleting your data">
          <ul className="list-disc space-y-1 pl-5">
            <li>Change your display name, avatar and leaderboard choice at any time on your <Link className="link" to="/profile">Profile</Link>.</li>
            <li>{cloud ? <>Delete your account and all of its data yourself: Profile → Settings &amp; data → <strong>Delete my account</strong>. Deletion is immediate and permanent.</> : <>Clear this preview's data from Profile → Settings &amp; data.</>}</li>
            <li>For any other request about your data, contact <Contact />.</li>
          </ul>
        </Section>
        <Section title="Age">
          <p>MyBibleGem is designed for adults and is not directed to children under 13. If you believe a child has created an account, contact <Contact /> and we will delete it.</p>
        </Section>
        <Section title="Changes">
          <p>If this policy changes, the date at the top will change. Significant changes will be shown in the app.</p>
        </Section>
      </div>
    </div>
  )
}

export function Terms() {
  const { catalog } = useApp()
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Terms" title="Terms of use">Last updated {UPDATED}. By using MyBibleGem you agree to these terms.</PageHeader>
      <div className="space-y-8 leading-relaxed">
        <Section title="The service">
          <p>MyBibleGem is a free Bible learning game. Features may change, and the service may occasionally be unavailable for maintenance.</p>
        </Section>
        <Section title="Your account">
          <p>You are responsible for keeping your password private. Use a display name that is respectful; names that are offensive or impersonate others may be changed or removed. You may delete your account at any time from your Profile.</p>
        </Section>
        <Section title="Gems and reward items">
          <p>Gems are earned only by playing (for example {catalog.rewards.correct_answer} gems for the first correct answer to a question). Gems and reward items have no monetary value, cannot be bought with or exchanged for money, and cannot be transferred between accounts. They are tied to your account and are removed if the account is deleted. We may correct balances affected by errors or misuse.</p>
        </Section>
        <Section title="Fair play">
          <p>Do not try to manipulate scores or gems, interfere with the service, or access other players' data. Accounts that do so may be suspended.</p>
        </Section>
        <Section title="Content">
          <p>Scripture quotations are from the King James Version, which is in the public domain in most countries (see <Link className="link" to="/about">About &amp; licensing</Link> for details, including the United Kingdom). Questions, explanations and illustrations are reviewed by editors, but mistakes are possible; please use “Report a problem” on any question. Illustrations are artistic interpretations, not historical records. MyBibleGem is a learning aid and does not replace reading Scripture or the guidance of your church.</p>
        </Section>
        <Section title="No warranty">
          <p>MyBibleGem is provided “as is”. To the extent the law allows, we are not liable for indirect losses arising from use of the app, including loss of progress or gems.</p>
        </Section>
        <Section title="Contact">
          <p>Questions about these terms: <Contact />. See also the <Link className="link" to="/privacy">Privacy policy</Link>.</p>
        </Section>
      </div>
    </div>
  )
}
