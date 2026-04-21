import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test'
import { SaveManager } from '../SaveManager.ts'
import type { GameSaveState, SaveData } from '../types/save.d.ts'

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

// --- SaveManager.load (US-002) -------------------------------------------

describe('SaveManager.load', () => {
  let sm: SaveManager

  beforeEach(() => {
    localStorageMock.clear()
    sm = new SaveManager({ gameId: 'test-game', slots: 3, autoSave: false })
  })

  // AC01 — returns null for empty slot
  it('AC01: returns null when the slot is empty', () => {
    expect(sm.load(1)).toBeNull()
  })

  // AC01 — returns null for unparseable JSON
  it('AC01: returns null when stored JSON is unparseable', () => {
    store['vn:test-game:save:2'] = '{{not valid json'
    expect(sm.load(2)).toBeNull()
  })

  // AC01 — returns SaveSlot when data exists
  it('AC01: returns a SaveSlot when valid data is present', () => {
    sm.save(1, makeState())
    const result = sm.load(1)
    expect(result).not.toBeNull()
    expect(result!.version).toBe(1)
    expect(typeof result!.timestamp).toBe('number')
    expect(result!.state.meta.displayName).toBe('Chapter 1')
    expect(result!.state.state['health']).toBe(100)
  })

  // AC02 — migration is called when version is older
  it('AC02: calls the registered migration when stored version is older than current', () => {
    // Write a v0 save directly
    const oldSave: SaveData = {
      version: 0,
      timestamp: 1000,
      meta: { displayName: 'Old Save', sceneName: 'scene_0', playtime: 5 },
      state: { legacy_key: true },
    }
    store['vn:test-game:save:1'] = JSON.stringify(oldSave)

    const migrateFn = (data: SaveData): SaveData => ({
      ...data,
      version: 1,
      state: { ...data.state, migrated: true },
    })
    sm.registerMigration(0, migrateFn)

    const result = sm.load(1)
    expect(result).not.toBeNull()
    expect(result!.state.state['migrated']).toBe(true)
    expect(result!.state.state['legacy_key']).toBe(true)
  })

  // AC02 — migration is NOT called when versions match
  it('AC02: does not call migration when stored version matches current', () => {
    sm.save(1, makeState())

    let called = false
    sm.registerMigration(1, (data) => { called = true; return data })

    sm.load(1)
    expect(called).toBe(false)
  })

  // AC03 — returned state field is typed GameSaveState (meta + state)
  it('AC03: returned state field contains meta and state matching GameSaveState shape', () => {
    sm.save(1, makeState())
    const result = sm.load(1)
    expect(result).not.toBeNull()
    // Verify GameSaveState shape: meta and state present
    expect(result!.state).toHaveProperty('meta')
    expect(result!.state).toHaveProperty('state')
    expect(result!.state.meta.sceneName).toBe('prologue')
    expect(result!.state.meta.playtime).toBe(42)
    expect(result!.state.state).toEqual({ health: 100, flag_met_hero: true })
  })
})
