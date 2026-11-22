import { useEffect, useId, useRef, type ReactNode } from 'react'
import {
  Anchor, Award, Bird, Coins, Crown, Fish, Flame, Gem, Hourglass, Lamp, Leaf, Mountain, Scissors, Scroll, Shield, Sparkles,
  Sprout, Star, Sun, Swords, Target, Tent, Wheat, Wand, Images, Feather, Castle, Ship, X, type LucideIcon,
} from 'lucide-react'
import type { StoreItem } from '../engine'

export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  // Original mark: an open book whose pages form a path toward a rising star.
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="46" height="46" rx="12" fill="#142B40" />
      <path d="M9 33c5-2 10-2 15 1 5-3 10-3 15-1V16c-5-2-10-2-15 1-5-3-10-3-15-1z" fill="none" stroke="#C9A45C" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M24 17v17" stroke="#C9A45C" strokeWidth="2" />
      <path d="M24 6.5l1.5 3.4 3.6.3-2.8 2.3.9 3.5-3.2-1.9-3.2 1.9.9-3.5-2.8-2.3 3.6-.3z" fill="#F7F0DE" />
      <path d="M14 39.5h20" stroke="#27685C" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function GemIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d="M6 3h12l4 6-10 12L2 9z" fill="#8552BD" />
      <path d="M2 9h20L12 21z" fill="#6A3FA0" />
      <path d="M6 3l3 6 3-6 3 6 3-6" fill="none" stroke="#E7D6FF" strokeWidth="1" opacity=".8" />
      <path d="M9 9l3 12 3-12" fill="none" stroke="#C9A45C" strokeWidth="1" opacity=".9" />
    </svg>
  )
}

export function Gems({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums font-semibold ${className}`}>
      <GemIcon /> {n.toLocaleString()}<span className="sr-only"> gems</span>
    </span>
  )
}

export const AVATARS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: 'scroll', label: 'Scroll', Icon: Scroll }, { id: 'lamp', label: 'Lamp', Icon: Lamp }, { id: 'dove', label: 'Dove', Icon: Bird },
  { id: 'crown', label: 'Crown', Icon: Crown }, { id: 'anchor', label: 'Anchor', Icon: Anchor }, { id: 'fish', label: 'Fish', Icon: Fish },
  { id: 'star', label: 'Star', Icon: Star }, { id: 'mountain', label: 'Mountain', Icon: Mountain }, { id: 'sun', label: 'Sun', Icon: Sun },
  { id: 'sprout', label: 'Sprout', Icon: Sprout }, { id: 'shield', label: 'Shield', Icon: Shield }, { id: 'flame', label: 'Flame', Icon: Flame },
  { id: 'feather', label: 'Feather', Icon: Feather }, { id: 'castle', label: 'Tower', Icon: Castle }, { id: 'ship', label: 'Ship', Icon: Ship },
]

const FRAME_STYLES: Record<string, string> = {
  frame_gold: 'ring-4 ring-[#C9A45C]',
  frame_emerald: 'ring-4 ring-[#27685C]',
  frame_amethyst: 'ring-4 ring-[#8552BD]',
  frame_cedar: 'ring-4 ring-[#7A5532] ring-offset-2 ring-offset-[#C9A45C]',
  frame_mosaic: 'ring-4 ring-[#C9A45C] ring-offset-2 ring-offset-[#142B40]',
}

export function Avatar({ id, frame, size = 'md' }: { id: string; frame?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const a = AVATARS.find((x) => x.id === id) ?? AVATARS[0]
  const dim = size === 'lg' ? 'h-20 w-20' : size === 'sm' ? 'h-8 w-8' : 'h-12 w-12'
  const icon = size === 'lg' ? 'h-9 w-9' : size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'
  return (
    <span className={`inline-grid place-items-center rounded-full bg-navy text-gold ${dim} ${frame ? FRAME_STYLES[frame] ?? '' : 'ring-1 ring-line'}`} aria-hidden="true">
      <a.Icon className={icon} />
    </span>
  )
}

const ITEM_ICONS: Record<string, LucideIcon> = {
  hint: Lamp, eliminate_two: Scissors, extra_time: Hourglass, badge_scroll: Scroll, badge_lamp: Lamp, badge_olive: Leaf, badge_dove: Bird,
  badge_anchor: Anchor, badge_shepherd: Tent, badge_crown: Crown, coll_ot: Images, coll_nt: Images, card_sling: Target, card_manna: Wheat,
  card_lamp: Lamp, card_mite: Coins, card_staff: Wand, card_net: Fish, bonus_expert: Swords, deco_laurel: Award, deco_stars: Sparkles,
}
const SWATCH: Record<string, string> = {
  theme_galilee: 'from-[#27685C] to-[#1d4f6e]', theme_temple: 'from-[#C9A45C] to-[#8a6a2c]', theme_amethyst: 'from-[#8552BD] to-[#C9A45C]',
  frame_gold: 'from-[#C9A45C] to-[#9c7a3a]', frame_emerald: 'from-[#27685C] to-[#164036]', frame_amethyst: 'from-[#8552BD] to-[#55307f]',
  frame_cedar: 'from-[#7A5532] to-[#C9A45C]', frame_mosaic: 'from-[#142B40] to-[#C9A45C]',
}

/** Artwork tile for a store item, built from vector icons (no external images required). */
export function ItemArt({ item, size = 'md' }: { item: Pick<StoreItem, 'id' | 'category' | 'image' | 'image_alt'>; size?: 'sm' | 'md' }) {
  const Icon = ITEM_ICONS[item.id] ?? Gem
  const dim = size === 'sm' ? 'h-12 w-12' : 'h-20 w-20'
  if (item.image) return <img src={item.image} alt={item.image_alt ?? ''} className={`${dim} rounded-xl object-cover`} />
  const grad = SWATCH[item.id] ?? (item.category === 'power_up' ? 'from-[#142B40] to-[#27685C]' : item.category === 'collectible' ? 'from-[#F7F0DE] to-[#C9A45C]' : 'from-[#142B40] to-[#1f4466]')
  const fg = item.category === 'collectible' ? 'text-navy' : 'text-[#F7F0DE]'
  return (
    <span className={`grid place-items-center rounded-xl bg-gradient-to-br ${grad} ${dim} shadow-inner`} aria-hidden="true">
      {item.category === 'frame' ? <span className="h-1/2 w-1/2 rounded-full border-4 border-[#F7F0DE]/90" /> :
        item.category === 'theme' ? <span className="h-1/2 w-1/2 rounded-full bg-[#F7F0DE]/85" /> :
        <Icon className={`${size === 'sm' ? 'h-6 w-6' : 'h-9 w-9'} ${fg}`} />}
    </span>
  )
}

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const node = ref.current
    const first = node?.querySelector<HTMLElement>('button, [href], input, select, textarea')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && node) {
        const f = Array.from(node.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea'))
        if (!f.length) return
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className="card w-full max-w-md bg-raised p-6 fade-up">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={id} className="text-xl font-semibold">{title}</h2>
          <button className="btn-ghost btn-sm -mr-2 -mt-1" onClick={onClose} aria-label="Close dialog"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Shown with every illustration: the pictures are AI-generated, and the generator's terms ask that this is stated. */
export const AI_CREDIT = 'AI-generated illustration, made with Perplexity.'

export function Illustration({ path, alt, className = '', sizes = '(min-width: 1024px) 50vw, 100vw', priority = false }: { path: string | null; alt: string; className?: string; sizes?: string; priority?: boolean }) {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return <img src={path} alt={alt} className={className} loading={priority ? 'eager' : 'lazy'} decoding="async" />
  const sm = path.replace(/\.webp$/, '-sm.webp')
  const src = `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
  const srcSm = `${import.meta.env.BASE_URL}${sm.replace(/^\//, '')}`
  return <img src={src} srcSet={`${srcSm} 600w, ${src} 1200w`} sizes={sizes} alt={alt} className={className} loading={priority ? 'eager' : 'lazy'} decoding="async" />
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6 md:mb-8">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="text-2xl md:text-3xl font-semibold">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-muted">{children}</div>}
    </header>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <p className="font-display text-lg mb-1">{title}</p>
      {children && <div className="text-muted text-sm">{children}</div>}
    </div>
  )
}
