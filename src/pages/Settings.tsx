import { Monitor, Moon, Sun } from 'lucide-react'
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

export default function Settings() {
  const { prefs, setPrefs, backend, profile, user } = useApp()
  const update = (p: Partial<Prefs>) => {
    setPrefs(p)
    // Keep display preferences with the account so they follow the player across devices.
    if (backend.kind === 'cloud' && user && profile) backend.updateProfile({ preferences: { ...profile.preferences, display: { ...prefs, ...p } } }).catch(() => {})
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <PageHeader eyebrow="Settings" title="Display and accessibility">These options are always free.</PageHeader>
      <div className="grid gap-4">
        <Segmented label="Appearance" value={prefs.theme} onChange={(v) => update({ theme: v })} options={[{ v: 'system', label: 'Match device', Icon: Monitor }, { v: 'light', label: 'Light', Icon: Sun }, { v: 'dark', label: 'Dark', Icon: Moon }]} />
        <Segmented label="Text size" value={prefs.textSize} onChange={(v) => update({ textSize: v })} options={[{ v: 'normal', label: 'Standard' }, { v: 'large', label: 'Large' }, { v: 'xlarge', label: 'Extra large' }]} />
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
    </div>
  )
}
