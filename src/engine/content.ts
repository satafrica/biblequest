// Bundled editorial content. Used by the local (no-server) preview backend and for
// static metadata (book names, store artwork) in both modes.
import questionsJson from '../content/generated/questions.json'
import adventuresJson from '../content/generated/adventures.json'
import assetsJson from '../content/generated/assets.json'
import storeJson from '../content/generated/store.json'
import achievementsJson from '../content/generated/achievements.json'
import type { Achievement, Adventure, Asset, StoreItem } from './types'

export interface FullQuestion {
  id: string; game_mode: 'picture' | 'whoami' | 'scripture' | 'sequence'; book_id: number; book: string; chapter: number
  verse_start: number | null; verse_end: number | null; reference_label: string; difficulty: 1 | 2 | 3 | 4; prompt: string
  clues: string[] | null; options: string[]; correct_index: number; explanation: string; hint: string | null
  image_id: string | null; translation_id: string; tags: string[]; status: string; verse_text?: string | null
  clue_refs?: { ref: string; text: string }[][] | null
  verification: { reference_exists: boolean; keywords_found: boolean; checked_against: string; checked_at: string; human_review: string }
}

export const QUESTIONS = questionsJson as FullQuestion[]
export const ADVENTURES = adventuresJson as Adventure[]
export const ASSET_LIST = assetsJson as Asset[]
export const ASSETS: Record<string, Asset> = Object.fromEntries(ASSET_LIST.map((a) => [a.id, a]))
export const STORE = storeJson as StoreItem[]
export const ACHIEVEMENTS = achievementsJson as (Achievement & { rule: { type: string; gte: number; mode?: string } })[]
export const REWARDS = { correct_answer: 10, level_complete: 50, daily_challenge: 25, perfect_round: 100, adventure_complete: 250 }
