import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Monitor, Moon, Sun, Volume1, Volume2, VolumeX } from 'lucide-react'
import { hapticsSupported, vibrate } from '../lib/haptics'
import { englishVoices, onVoicesChanged, setPreferredVoice, speak, speechSupported } from '../lib/speech'
import { playSound, unlockAudio } from '../lib/sounds'
import { soundVolume, speechRate } from '../state/prefs'
import { useApp } from '../state/AppContext'
import { PageHeader } from '../components/ui'
import type { Prefs } from '../state/prefs'

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; label: string; Icon?: typeof Sun }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="card p-5">
      <legend className="sr-only">{label}</legend>
      <p className="mb-3 font-semibold" aria-hidden="true">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.v} className={`btn btn-sm cursor-pointer ${value === o.v ? 'bg-ink text-bg' : 'border border-line bg-raised'}`}>
            <input type="radio" className="sr-only" name={label} checked={value === o.v} onChange={() => onChange(o.v)} />
            {o.Icon && <o.Icon className="h-4 w-4" aria-hidden="true" />}{o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const SAMPLE = 'In the beginning God created the heaven and the earth. Genesis 1:1.'

/** Choice of the device's English voices, most natural first. Voices differ on every device. */
function NarratorVoice({ value, onChange, onTest }: { value: string; onChange: (v: string) => void; onTest: () => void }) {
  const [voices, setVoices] = useState(() => englishVoices())
  useEffect(() => { setVoices(englishVoices()); return onVoicesChanged(() => setVoices(englishVoices())) }, [])
  const known = !value || voices.some((v) => v.voiceURI === value)
  return (
    <div className="card p-5">
      <label htmlFor="nv" className="font-semibold">Narrator voice</label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select id="nv" className="w-full min-w-0 max-w-full rounded-xl border border-line bg-raised px-3 py-2 sm:flex-1" value={known ? value : ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Automatic (most natural)</option>
          {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang}){v.localService ? '' : ' \u00b7 needs internet'}</option>)}
        </select>
        <button type="button" className="btn-ghost btn-sm self-start sm:self-auto" onClick={onTest}><Volume2 className="h-4 w-4" aria-hidden="true" />Test voice</button>
      </div>
      {voices.length > 0 && <p className="mt-2 text-sm" data-testid="narrator-now">Now using: <strong>{(known && value ? voices.find((v) => v.voiceURI === value) : voices[0])?.name}</strong></p>}
      <p className="mt-2 text-sm text-muted">
        {voices.length === 0 ? 'No English voices have loaded yet. ' : `${voices.length} English voice${voices.length === 1 ? '' : 's'} on this device. `}
        Voices come from your device, so they sound different on each one. For a more natural voice: on iPhone or iPad, go to Settings, Accessibility, Spoken Content, Voices, English, and download an Enhanced or Premium voice; on Android, choose Speech Services by Google in your text-to-speech settings; on a computer, voices marked Natural or Online (for example in Microsoft Edge) sound most human.
      </p>
    </div>
  )
}

export default function Settings() {
  const { prefs, setPrefs, backend, profile, user } = useApp()
  const update = (p: Partial<Prefs>) => {
    setPrefs(p)
    // Keep display preferences with the account so they follow the player across devices.
    if (backend.kind === 'cloud' && user && profile) backend.updateProfile({ preferences: { ...profile.preferences, display: { ...prefs, ...p } } }).catch(() => {})
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Settings" title="Display, sound and accessibility">These options are always free.</PageHeader>
      <div className="grid gap-4">
        <Segmented label="Appearance" value={prefs.theme} onChange={(v) => update({ theme: v })} options={[{ v: 'system', label: 'Match device', Icon: Monitor }, { v: 'light', label: 'Light', Icon: Sun }, { v: 'dark', label: 'Dark', Icon: Moon }]} />
        <div className="grid gap-2">
          <Segmented label="Bible questions from" value={prefs.testament ?? 'all'} onChange={(v) => update({ testament: v })} options={[{ v: 'all', label: 'Whole Bible' }, { v: 'ot', label: 'Old Testament' }, { v: 'nt', label: 'New Testament' }]} />
          <p className="px-1 text-sm text-muted">Used by the level games and the Challenge Arena. The Daily Challenge always uses the whole Bible.</p>
        </div>
        <Segmented label="Text size" value={prefs.textSize} onChange={(v) => update({ textSize: v })} options={[{ v: 'normal', label: 'Standard' }, { v: 'large', label: 'Large' }, { v: 'xlarge', label: 'Extra large' }]} />
        <div className="grid gap-2">
          <Segmented label="Sound effects" value={prefs.sound} onChange={(v) => { update({ sound: v }); unlockAudio(); if (v !== 'off') playSound('correct', soundVolume({ ...prefs, sound: v })) }}
            options={[{ v: 'off', label: 'Off', Icon: VolumeX }, { v: 'soft', label: 'Soft', Icon: Volume1 }, { v: 'normal', label: 'Normal', Icon: Volume2 }]} />
          <div className="flex flex-wrap items-center gap-2 px-1 text-sm text-muted">
            <span>Chimes for correct and incorrect answers. Results are always shown on screen too.</span>
            <button type="button" className="btn-ghost btn-sm" disabled={prefs.sound === 'off'} onClick={() => { unlockAudio(); playSound('correct', soundVolume(prefs)) }}>Play correct</button>
            <button type="button" className="btn-ghost btn-sm" disabled={prefs.sound === 'off'} onClick={() => { unlockAudio(); playSound('wrong', soundVolume(prefs)) }}>Play incorrect</button>
          </div>
        </div>
        <div className="card flex items-start gap-3 p-5">
          <input id="hp" type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(var(--accent))]" checked={prefs.haptics} onChange={(e) => { update({ haptics: e.target.checked }); if (e.target.checked) vibrate('correct') }} />
          <label htmlFor="hp"><span className="font-semibold">Vibration</span><span className="block text-sm text-muted">{hapticsSupported() ? 'A short buzz for correct and incorrect answers.' : 'A short buzz for answers. This browser does not support vibration (iPhone browsers do not), so this setting has no effect here.'}</span></label>
        </div>
        <div className="grid gap-2">
          <div className="card flex items-start gap-3 p-5">
            <input id="ra" type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(var(--accent))]" checked={prefs.readAloudAuto} disabled={!speechSupported()} onChange={(e) => update({ readAloudAuto: e.target.checked })} />
            <label htmlFor="ra"><span className="font-semibold">Read each question aloud automatically</span><span className="block text-sm text-muted">{speechSupported() ? 'Uses your device\'s built-in voice. A "Read aloud" button is always available during play, including for the verse after you answer.' : 'This browser does not offer a built-in voice, so read-aloud is unavailable here.'}</span></label>
          </div>
          {speechSupported() && (
            <>
              <NarratorVoice value={prefs.narratorVoice ?? ''} onChange={(v) => { update({ narratorVoice: v }); setPreferredVoice(v); speak(SAMPLE, { rate: speechRate(prefs) }) }} onTest={() => speak(SAMPLE, { rate: speechRate(prefs) })} />
              <Segmented label="Reading speed" value={prefs.speechRate} onChange={(v) => { update({ speechRate: v }); speak(SAMPLE, { rate: speechRate({ ...prefs, speechRate: v }) }) }}
                options={[{ v: 'slow', label: 'Slower' }, { v: 'normal', label: 'Normal' }, { v: 'fast', label: 'Faster' }]} />
            </>
          )}
        </div>
        <Segmented label="Motion" value={prefs.motion} onChange={(v) => update({ motion: v })} options={[{ v: 'system', label: 'Match device' }, { v: 'reduce', label: 'Reduce motion' }, { v: 'full', label: 'Full motion' }]} />
        <div className="card flex items-start gap-3 p-5">
          <input id="hc" type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(var(--accent))]" checked={prefs.highContrast} onChange={(e) => update({ highContrast: e.target.checked })} />
          <label htmlFor="hc"><span className="font-semibold">High contrast</span><span className="block text-sm text-muted">Pure black and white text with stronger borders.</span></label>
        </div>
        <div className="card flex items-start gap-3 p-5">
          <input id="tm" type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(var(--accent))]" checked={prefs.timers} onChange={(e) => update({ timers: e.target.checked })} />
          <label htmlFor="tm"><span className="font-semibold">Timers in the Challenge Arena</span><span className="block text-sm text-muted">Turn off to answer at your own pace. Other games are never timed.</span></label>
        </div>
      </div>
      <p className="mt-8 text-sm text-muted"><Link to="/about" className="link">About &amp; licensing</Link> · <Link to="/privacy" className="link">Privacy</Link> · <Link to="/terms" className="link">Terms of use</Link></p>
    </div>
  )
}
