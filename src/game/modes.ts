import { BookOpen, Calendar, Compass, Eye, Images, ListOrdered, Map, Scale, Search, Sprout, Swords, Trophy, UserRound, type LucideIcon } from 'lucide-react'

export interface ModeInfo { id: string; name: string; blurb: string; live: boolean; to?: string; Icon: LucideIcon; image?: string }

// Live modes are fully playable end to end. A mode marked live: false is shown as "In development"
// (not clickable) so nothing pretends to work before it does. Every mode is live today.
export const MODES: ModeInfo[] = [
  { id: 'picture', name: 'Picture Bible Quiz', blurb: 'Identify stories, people and places from reviewed illustrations.', live: true, to: '/play/picture', Icon: Images, image: 'moses_red_sea' },
  { id: 'whoami', name: 'Who Am I?', blurb: 'Name the Bible character using as few clues as possible.', live: true, to: '/play/whoami', Icon: UserRound, image: 'esther_king' },
  { id: 'scripture', name: 'Scripture Challenge', blurb: 'Complete verses, name the book and match references.', live: true, to: '/play/scripture', Icon: BookOpen, image: 'sermon_mount' },
  { id: 'sequence', name: 'Story Sequencing', blurb: 'Put the events of a Bible story in the right order.', live: true, to: '/play/sequence', Icon: ListOrdered, image: 'joseph_coat' },
  { id: 'adventure', name: 'Bible Adventure Journey', blurb: 'Travel through Scripture chapter by chapter and unlock the next stage.', live: true, to: '/adventures', Icon: Map, image: 'paul_ship' },
  { id: 'arena', name: 'Bible Challenge Arena', blurb: 'Timed rounds with optional daily and weekly leaderboards.', live: true, to: '/arena', Icon: Swords, image: 'david_goliath' },
  { id: 'daily', name: 'Daily Bible Challenge', blurb: 'Five fresh questions every day.', live: true, to: '/daily', Icon: Calendar, image: 'abraham_stars' },
  { id: 'mystery', name: 'Bible Mystery', blurb: 'Solve five-stage case files using clues and the text of Scripture.', live: true, to: '/mystery', Icon: Search, image: 'daniel_lions' },
  { id: 'geography', name: 'Bible Geography Explorer', blurb: 'Find cities, rivers, mountains and journeys on real maps.', live: true, to: '/play/geography', Icon: Compass, image: 'hero_jerusalem' },
  { id: 'hidden', name: 'Hidden Object Adventure', blurb: 'Tap objects from Bible stories hidden in the illustrations.', live: true, to: '/play/hidden', Icon: Eye, image: 'noah_ark' },
  { id: 'wisdom', name: 'Bible Wisdom Decisions', blurb: 'Choose the response that matches what a passage teaches.', live: true, to: '/play/wisdom', Icon: Scale, image: 'solomon_temple' },
  { id: 'parables', name: 'Parables Explorer', blurb: 'Read a parable of Jesus in the KJV, then answer questions on it.', live: true, to: '/parables', Icon: Sprout, image: 'good_samaritan' },
  { id: 'master', name: 'Bible Master Challenge', blurb: 'Twelve Expert questions drawn from every game.', live: true, to: '/master', Icon: Trophy, image: 'elijah_carmel' },
]
export const modeInfo = (id: string) => MODES.find((m) => m.id === id)
