import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test'
import { SaveManager } from '../SaveManager.ts'
import type { GameSaveState } from '../types/save.d.ts'

// --- localStorage stub --------------------------------------------------

const store: Record<string, string> = {}

const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { for (const k of Object.keys(store)) delete store[k] },
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// --- helpers ------------------------------------------------------------

function makeState(overrides?: Partial<GameSaveState>): GameSaveState {
  return {
    meta: {
      displayName: 'Chapter 1',
      sceneName: 'prologue',
      playtime: 42,
      ...overrides?.meta,
    },
    state: { health: 100, flag_met_hero: true, ...overrides?.state },
  }
}

// --- tests --------------------------------------------------------------

describe('SaveManager.save', () => {
  let sm: SaveManager

  beforeEach(() => {
    localStorageMock.clear()
    sm = new SaveManager({ gameId: 'test-game', slots: 3, autoSave: false })
  })

  // AC01 — typed payload, correct localStorage key
  it('AC01: serialises GameSaveState to the correct localStorage key', () => {
    const state = makeState()
    sm.save(1, state)

    const raw = localStorage.getItem('vn:test-game:save:1')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.meta.displayName).toBe('Chapter 1')
    expect(parsed.state.health).toBe(100)
  })

  // AC02 — persisted JSON shape
  it('AC02: persisted JSON includes version, timestamp, meta, and state', () => {
    sm.save(1, makeState())

    const raw = localStorage.getItem('vn:test-game:save:1')!
    const parsed = JSON.parse(raw)

    expect(typeof parsed.version).toBe('number')
    expect(typeof parsed.timestamp).toBe('number')
    expect(parsed.meta).toEqual({
      displayName: 'Chapter 1',
      sceneName: 'prologue',
      playtime: 42,
    })
    expect(parsed.state).toEqual({ health: 100, flag_met_hero: true })
  })

  // AC02 — timestamp is recent
  it('AC02: timestamp is approximately now', () => {
    const before = Date.now()
    sm.save(1, makeState())
    const after = Date.now()

    const parsed = JSON.parse(localStorage.getItem('vn:test-game:save:1')!)
    expect(parsed.timestamp).toBeGreaterThanOrEqual(before)
    expect(parsed.timestamp).toBeLessThanOrEqual(after)
  })

  // AC03 — overwrite silently
  it('AC03: overwrites an existing slot without error', () => {
    sm.save(1, makeState({ state: { health: 100 } }))
    sm.save(1, makeState({ state: { health: 50 } }))

    const parsed = JSON.parse(localStorage.getItem('vn:test-game:save:1')!)
    expect(parsed.state.health).toBe(50)
  })

  // AC04 — localStorage error is swallowed
  it('AC04: emits console.warn and does not throw when localStorage fails', () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})

    const throwingStorage = {
      ...localStorageMock,
      setItem: () => { throw new DOMException('QuotaExceededError') },
    }
    Object.defineProperty(globalThis, 'localStorage', { value: throwingStorage, writable: true })

    expect(() => sm.save(1, makeState())).not.toThrow()
    expect(warnSpy).toHaveBeenCalledTimes(1)

    // restore
    Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
    warnSpy.mockRestore()
  })

  // AC01 — 'auto' slot key format
  it('AC01: uses vn:{gameId}:save:auto key for auto slot', () => {
    sm.save('auto', makeState())
    expect(localStorage.getItem('vn:test-game:save:auto')).not.toBeNull()
  })
})
