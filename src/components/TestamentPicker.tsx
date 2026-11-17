import { useTestament } from '../state/useTestament'
import { TESTAMENTS } from '../engine/levels'

export function TestamentPicker({ id = 'testament', note }: { id?: string; note?: React.ReactNode }) {
  const [t, choose] = useTestament()
  return (
    <div className="mb-6">
      <p id={`${id}-label`} className="eyebrow mb-2">Questions from</p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2" data-testid="testament-picker">
        {TESTAMENTS.map((x) => (
          <button key={x.v} type="button" role="radio" aria-checked={t === x.v} onClick={() => choose(x.v)}
            className={`btn-sm btn ${t === x.v ? 'bg-ink text-bg' : 'border border-line bg-raised'}`}>
            {x.label}
          </button>
        ))}
      </div>
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
    </div>
  )
}
