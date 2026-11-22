import { describe, expect, it } from 'vitest'
import { keepSeparators, stays } from '../notices'

describe('notices', () => {
  it('info and error notices close on another page; gem notices stay', () => {
    expect(stays({ id: 1, title: 'Friend request sent', tone: 'info', path: '/community' }, '/community')).toBe(true)
    expect(stays({ id: 1, title: 'Friend request sent', tone: 'info', path: '/community' }, '/community/group/1')).toBe(false)
    expect(stays({ id: 2, title: 'Not done', tone: 'error', path: '/community' }, '/')).toBe(false)
    expect(stays({ id: 3, title: 'Profile saved', path: '/profile' }, '/')).toBe(false)
    expect(stays({ id: 4, title: 'Achievement unlocked', tone: 'gem', path: '/game/x' }, '/')).toBe(true)
    expect(stays({ id: 5, title: 'Old notice' }, '/anywhere')).toBe(true)
  })
  it('a wrapped title never starts a line with the separator', () => {
    expect(keepSeparators('Mixed questions · Intermediate')).toBe('Mixed questions\u00a0· Intermediate')
    expect(keepSeparators('A · B · C')).toBe('A\u00a0· B\u00a0· C')
    expect(keepSeparators('No separator')).toBe('No separator')
  })
})
