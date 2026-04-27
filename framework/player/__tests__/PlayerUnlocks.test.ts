import { beforeEach, describe, expect, it } from 'bun:test'
import { PlayerUnlocks } from '../PlayerUnlocks.ts'

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

describe('PlayerUnlocks', () => {
  beforeEach(() => localStorage.clear())

  it('starts with empty unlock lists per category', () => {
    const unlocks = new PlayerUnlocks('unlock-test')
    expect(unlocks.load()).toEqual({ gallery: [], music: [], replay: [] })
  })

  it('persists unique unlocked ids per game id', () => {
    const unlocks = new PlayerUnlocks('unlock-test')

    unlocks.unlock('gallery', 'cg_001')
    unlocks.unlock('gallery', 'cg_001')
    unlocks.unlock('music', 'theme')

    expect(new PlayerUnlocks('unlock-test').load()).toEqual({
      gallery: ['cg_001'],
      music: ['theme'],
      replay: [],
    })
  })
})
