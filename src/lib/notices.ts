/** Small display helpers for notices and titles. Kept free of React so they can be unit-tested. */

export interface Toast { id: number; title: string; body?: string; tone?: 'gem' | 'info' | 'error'; path?: string }

/** True if a notice should stay visible on `path`. Gem and reward notices follow the player; others belong to the page they were shown on. */
export const stays = (t: Toast, path: string) => t.tone === 'gem' || !t.path || t.path === path

/** Current HashRouter page path, e.g. '/community/group/123'. */
export const currentPath = () => (typeof window === 'undefined' ? '/' : window.location.hash.replace(/^#/, '').split('?')[0] || '/')

/** Keeps each ' · ' separator with the word before it, so a wrapped line never starts with '·'. */
export const keepSeparators = (s: string) => s.replace(/ · /g, '\u00a0· ')
