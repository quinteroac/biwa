import { beforeEach, describe, expect, it } from 'bun:test'
import { PlayerPreferences, getDefaultPlayerPreferences } from '../PlayerPreferences.ts'

const store: Record<string, string> = {}

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { for (const key of Object.keys(store)) delete store[key] },
  },
  writable: true,
})

describe('PlayerPreferences', () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key]
  })

  it('loads defaults and persists updates per game id', () => {
    const preferences = new PlayerPreferences('prefs-game')
    expect(preferences.load()).toEqual(getDefaultPlayerPreferences())

    preferences.update({ textSpeedMs: 45, autoMode: true, textScale: 1.2 })
    expect(new PlayerPreferences('prefs-game').load()).toMatchObject({
      textSpeedMs: 45,
      autoMode: true,
      textScale: 1.2,
    })
    expect(new PlayerPreferences('other-game').load().autoMode).toBe(false)
  })

  it('normalizes invalid persisted values', () => {
    store['vn:prefs-game:player:preferences'] = JSON.stringify({
      textSpeedMs: 9999,
      textScale: 9,
      autoMode: 'yes',
    })

    expect(new PlayerPreferences('prefs-game').load()).toMatchObject({
      textSpeedMs: 120,
      textScale: 1.6,
      autoMode: false,
    })
  })

  it('reads legacy player mode keys when no unified preference exists', () => {
    store['vn:prefs-game:player:auto'] = 'true'
    store['vn:prefs-game:player:skip'] = 'true'
    store['vn:prefs-game:player:skip-read-only'] = 'false'

    expect(new PlayerPreferences('prefs-game').load()).toMatchObject({
      autoMode: true,
      skipMode: true,
      skipReadOnly: false,
    })
  })
})
