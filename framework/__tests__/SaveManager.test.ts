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

  it('persists and loads visual snapshots without dropping them', () => {
    const state = makeState({
      visual: {
        scene: { id: 'cafe', variant: 'night' },
        characters: [{ id: 'kai', position: 'left', expression: 'happy' }],
        audio: { bgm: { type: 'bgm', id: 'theme', file: 'audio/theme.mp3' } },
        locale: 'en',
      },
    })

    sm.save(1, state)
    const loaded = sm.load(1)

    expect(loaded?.state.visual).toEqual(state.visual)
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

// --- SaveManager.listSlots (US-003) --------------------------------------

describe('SaveManager.listSlots', () => {
  let sm: SaveManager

  beforeEach(() => {
    localStorageMock.clear()
    sm = new SaveManager({ gameId: 'test-game', slots: 3, autoSave: false })
  })

  // AC01 — only occupied slots are returned
  it('AC01: returns an empty array when no slots are saved', () => {
    expect(sm.listSlots()).toEqual([])
  })

  it('AC01: omits empty slots, includes only occupied ones', () => {
    sm.save(1, makeState())
    sm.save(3, makeState({ meta: { displayName: 'Ch3', sceneName: 'ch3', playtime: 99 } }))
    const list = sm.listSlots()
    expect(list).toHaveLength(2)
    const slots = list.map((e) => e.slot)
    expect(slots).toContain(1)
    expect(slots).toContain(3)
    expect(slots).not.toContain(2)
    expect(slots).not.toContain('auto')
  })

  // AC02 — each entry has slot, meta (with timestamp), state
  it('AC02: each entry exposes slot, meta (with timestamp), and state', () => {
    const before = Date.now()
    sm.save(1, makeState())
    const after = Date.now()

    const list = sm.listSlots()
    expect(list).toHaveLength(1)

    const entry = list[0]!
    expect(entry.slot).toBe(1)

    // meta fields from SaveMeta
    expect(entry.meta.displayName).toBe('Chapter 1')
    expect(entry.meta.sceneName).toBe('prologue')
    expect(entry.meta.playtime).toBe(42)

    // timestamp is merged into meta
    expect(typeof entry.meta.timestamp).toBe('number')
    expect(entry.meta.timestamp).toBeGreaterThanOrEqual(before)
    expect(entry.meta.timestamp).toBeLessThanOrEqual(after)

    // state is the game variables record
    expect(entry.state).toEqual({ health: 100, flag_met_hero: true })
  })

  it('AC02: auto slot entry exposes slot as "auto"', () => {
    sm.save('auto', makeState())
    const list = sm.listSlots()
    expect(list).toHaveLength(1)
    expect(list[0]!.slot).toBe('auto')
    expect(list[0]!.meta.displayName).toBe('Chapter 1')
    expect(list[0]!.state['health']).toBe(100)
  })

  // AC03 — ordering: 'auto' first, then numeric ascending
  it('AC03: orders auto slot first, then numeric slots ascending', () => {
    sm.save(3, makeState({ meta: { displayName: 'Slot 3', sceneName: 's3', playtime: 3 } }))
    sm.save(1, makeState({ meta: { displayName: 'Slot 1', sceneName: 's1', playtime: 1 } }))
    sm.save('auto', makeState({ meta: { displayName: 'Auto', sceneName: 'sA', playtime: 0 } }))

    const list = sm.listSlots()
    expect(list).toHaveLength(3)
    expect(list[0]!.slot).toBe('auto')
    expect(list[1]!.slot).toBe(1)
    expect(list[2]!.slot).toBe(3)
  })

  it('AC03: numeric slots are ascending even when saved out of order', () => {
    sm.save(3, makeState())
    sm.save(2, makeState())
    sm.save(1, makeState())

    const list = sm.listSlots()
    expect(list.map((e) => e.slot)).toEqual([1, 2, 3])
  })
})

// --- SaveManager.deleteSlot (US-004) ------------------------------------

describe('SaveManager.deleteSlot', () => {
  let sm: SaveManager

  beforeEach(() => {
    localStorageMock.clear()
    sm = new SaveManager({ gameId: 'test-game', slots: 3, autoSave: false })
  })

  // AC01 — removes entry from localStorage
  it('AC01: removes an existing slot from localStorage', () => {
    sm.save(1, makeState())
    expect(localStorage.getItem('vn:test-game:save:1')).not.toBeNull()

    sm.deleteSlot(1)
    expect(localStorage.getItem('vn:test-game:save:1')).toBeNull()
  })

  // AC01 — no error when slot is already empty
  it('AC01: does not throw when the slot is already empty', () => {
    expect(() => sm.deleteSlot(2)).not.toThrow()
  })

  it('AC01: deletes the auto slot', () => {
    sm.save('auto', makeState())
    sm.deleteSlot('auto')
    expect(localStorage.getItem('vn:test-game:save:auto')).toBeNull()
  })

  // AC02 — deprecated delete() alias logs console.warn
  it('AC02: delete() logs a console.warn deprecation message', () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    sm.save(1, makeState())

    sm.delete(1)

    expect(warnSpy).toHaveBeenCalledTimes(1)
    const msg: string = warnSpy.mock.calls[0]![0] as string
    expect(msg).toContain('deleteSlot')
    warnSpy.mockRestore()
  })

  // AC02 — deprecated delete() still removes the slot
  it('AC02: delete() still removes the slot from localStorage', () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    sm.save(1, makeState())

    sm.delete(1)
    expect(localStorage.getItem('vn:test-game:save:1')).toBeNull()
    warnSpy.mockRestore()
  })
})

// --- SaveManager.autoSave (US-005) --------------------------------------

describe('SaveManager.autoSave', () => {
  let sm: SaveManager

  beforeEach(() => {
    localStorageMock.clear()
  })

  // AC01 — calls save('auto', state) when autoSaveEnabled is true
  it('AC01: writes to the auto slot when autoSaveEnabled is true', () => {
    sm = new SaveManager({ gameId: 'test-game', slots: 3, autoSave: true })
    const state = makeState()
    sm.autoSave(state)
    const raw = localStorage.getItem('vn:test-game:save:auto')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.meta.displayName).toBe('Chapter 1')
    expect(parsed.state.health).toBe(100)
  })

  // AC02 — accepts a GameSaveState (same type as save())
  it('AC02: accepts the same GameSaveState type as save()', () => {
    sm = new SaveManager({ gameId: 'test-game', slots: 3, autoSave: true })
    const state: GameSaveState = makeState({ state: { xp: 99 } })
    sm.autoSave(state)
    const parsed = JSON.parse(localStorage.getItem('vn:test-game:save:auto')!)
    expect(parsed.state.xp).toBe(99)
  })

  // AC03 — no-op when autoSaveEnabled is false
  it('AC03: is a no-op and does not throw when autoSaveEnabled is false', () => {
    sm = new SaveManager({ gameId: 'test-game', slots: 3, autoSave: false })
    expect(() => sm.autoSave(makeState())).not.toThrow()
    expect(localStorage.getItem('vn:test-game:save:auto')).toBeNull()
  })
})

// --- SaveManager.CURRENT_VERSION & registerMigration (US-006) -----------

describe('SaveManager.CURRENT_VERSION', () => {
  // AC01 — static constant is 2
  it('AC01: exposes a static CURRENT_VERSION of 2', () => {
    expect(SaveManager.CURRENT_VERSION).toBe(2)
  })

  it('AC01: CURRENT_VERSION is accessible without instantiating SaveManager', () => {
    expect(typeof SaveManager.CURRENT_VERSION).toBe('number')
  })
})

describe('SaveManager.registerMigration', () => {
  let sm: SaveManager

  beforeEach(() => {
    localStorageMock.clear()
    sm = new SaveManager({ gameId: 'test-game', slots: 3, autoSave: false })
  })

  // AC02 — accepts (oldData: unknown) => GameSaveState
  it('AC02: accepts a migration function typed (unknown) => GameSaveState', () => {
    const fn = (oldData: unknown): GameSaveState => {
      const d = oldData as SaveData
      return { meta: d.meta, state: d.state }
    }
    expect(() => sm.registerMigration(1, fn)).not.toThrow()
  })

  // AC03 — migrations run in order for version < CURRENT_VERSION
  it('AC03: applies chained migrations when version is behind CURRENT_VERSION', () => {
    const v0Save: SaveData = {
      version: 0,
      timestamp: 2000,
      meta: { displayName: 'Legacy', sceneName: 'start', playtime: 0 },
      state: { step: 0 },
    }
    store['vn:test-game:save:1'] = JSON.stringify(v0Save)

    sm.registerMigration(0, (data) => {
      const d = data as SaveData
      return { meta: d.meta, state: { ...d.state, step: 1 } }
    })
    sm.registerMigration(1, (data) => {
      const d = data as GameSaveState
      return { meta: d.meta, state: { ...d.state, step: 2 } }
    })

    const result = sm.load(1)
    expect(result).not.toBeNull()
    expect(result!.version).toBe(SaveManager.CURRENT_VERSION)
    expect(result!.state.state['step']).toBe(2)
  })

  // AC04 — returns null and logs warning when no migration registered
  it('AC04: returns null and logs a warning when no migration is registered for an old version', () => {
    const oldSave: SaveData = {
      version: 0,
      timestamp: 3000,
      meta: { displayName: 'Old', sceneName: 'scene', playtime: 0 },
      state: {},
    }
    store['vn:test-game:save:1'] = JSON.stringify(oldSave)

    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})

    const result = sm.load(1)

    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const msg: string = warnSpy.mock.calls[0]![0] as string
    expect(msg).toContain('No migration registered')

    warnSpy.mockRestore()
  })

  it('AC04: returns null even when some but not all migrations are registered', () => {
    const v0Save: SaveData = {
      version: 0,
      timestamp: 4000,
      meta: { displayName: 'Old', sceneName: 'scene', playtime: 0 },
      state: {},
    }
    store['vn:test-game:save:1'] = JSON.stringify(v0Save)

    // Only register v0 migration, missing v1 migration
    sm.registerMigration(0, (data) => {
      const d = data as SaveData
      return { meta: d.meta, state: d.state }
    })

    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    const result = sm.load(1)

    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
  })
})

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
    expect(result!.version).toBe(2)
    expect(typeof result!.timestamp).toBe('number')
    expect(result!.state.meta.displayName).toBe('Chapter 1')
    expect(result!.state.state['health']).toBe(100)
  })

  // AC02 — migration is called when version is older
  it('AC02: calls the registered migration when stored version is older than current', () => {
    // Write a v0 save directly (two versions behind CURRENT_VERSION = 2)
    const oldSave: SaveData = {
      version: 0,
      timestamp: 1000,
      meta: { displayName: 'Old Save', sceneName: 'scene_0', playtime: 5 },
      state: { legacy_key: true },
    }
    store['vn:test-game:save:1'] = JSON.stringify(oldSave)

    // v0 → v1: add 'migrated' flag
    sm.registerMigration(0, (data) => {
      const d = data as SaveData
      return { meta: d.meta, state: { ...d.state, migrated: true } }
    })
    // v1 → v2: pass-through
    sm.registerMigration(1, (data) => data as GameSaveState)

    const result = sm.load(1)
    expect(result).not.toBeNull()
    expect(result!.state.state['migrated']).toBe(true)
    expect(result!.state.state['legacy_key']).toBe(true)
  })

  // AC02 — migration is NOT called when versions match
  it('AC02: does not call migration when stored version matches current', () => {
    sm.save(1, makeState())

    let called = false
    sm.registerMigration(1, (data) => { called = true; return data as GameSaveState })

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
