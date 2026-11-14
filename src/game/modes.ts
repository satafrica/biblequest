import { BookOpen, Calendar, Compass, Eye, Images, ListOrdered, Map, Scale, Search, Sprout, Swords, Trophy, UserRound, type LucideIcon } from 'lucide-react'

export interface ModeInfo { id: string; name: string; blurb: string; live: boolean; to?: string; Icon: LucideIcon; image?: string }

// Live modes are fully playable end to end. The rest are planned and shown as "In development"
// (not clickable) so nothing pretends to work before it does.
export const MODES: ModeInfo[] = [
  { id: 'picture', name: 'Picture Bible Quiz', blurb: 'Identify stories, people and places from reviewed illustrations.', live: true, to: '/play/picture', Icon: Images, image: 'moses_red_sea' },
  { id: 'whoami', name: 'Who Am I?', blurb: 'Name the Bible character using as few clues as possible.', live: true, to: '/play/whoami', Icon: UserRound, image: 'esther_king' },
  { id: 'scripture', name: 'Scripture Challenge', blurb: 'Complete verses, name the book and match references.', live: true, to: '/play/scripture', Icon: BookOpen, image: 'sermon_mount' },
  { id: 'sequence', name: 'Story Sequencing', blurb: 'Put the events of a Bible story in the right order.', live: true, to: '/play/sequence', Icon: ListOrdered, image: 'joseph_coat' },
  { id: 'adventure', name: 'Bible Adventure Journey', blurb: 'Travel through Scripture chapter by chapter and unlock the next stage.', live: true, to: '/adventures', Icon: Map, image: 'paul_ship' },
  { id: 'arena', name: 'Bible Challenge Arena', blurb: 'Timed rounds with optional daily and weekly leaderboards.', live: true, to: '/arena', Icon: Swords, image: 'david_goliath' },
  { id: 'daily', name: 'Daily Bible Challenge', blurb: 'Five fresh questions every day.', live: true, to: '/daily', Icon: Calendar, image: 'abraham_stars' },
  { id: 'mystery', name: 'Bible Mystery', blurb: 'Multi-stage investigations using clues and Scripture references.', live: false, Icon: Search },
  { id: 'geography', name: 'Bible Geography Explorer', blurb: 'Cities, rivers, mountains and journeys on reviewed maps.', live: false, Icon: Compass },
  { id: 'hidden', name: 'Hidden Object Adventure', blurb: 'Find objects connected to Bible stories in illustrated scenes.', live: false, Icon: Eye },
  { id: 'wisdom', name: 'Bible Wisdom Decisions', blurb: 'Real-life choices connected to biblical teaching.', live: false, Icon: Scale },
  { id: 'parables', name: 'Parables Explorer', blurb: 'Interactive journeys through the parables of Jesus.', live: false, Icon: Sprout },
  { id: 'master', name: 'Bible Master Challenge', blurb: 'Expert-level challenges across all of Scripture.', live: false, Icon: Trophy },
]
export const modeInfo = (id: string) => MODES.find((m) => m.id === id)
