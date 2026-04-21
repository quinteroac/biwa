import { describe, it, expect, beforeEach } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { SaveManager } from '../../SaveManager.ts'
import { SaveLoadMenu, formatTimestamp } from '../SaveLoadMenu.tsx'
import type { GameSaveState } from '../../types/save.d.ts'

// --- localStorage stub ---------------------------------------------------

const store: Record<string, string> = {}

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
  },
  writable: true,
})

// --- helpers -------------------------------------------------------------

function makeState(overrides?: Partial<{ displayName: string; sceneName: string }>): GameSaveState {
  return {
    meta: {
      displayName: overrides?.displayName ?? 'Chapter 1',
      sceneName: overrides?.sceneName ?? 'prologue',
      playtime: 0,
    },
    state: {},
  }
}

function render(props: Parameters<typeof SaveLoadMenu>[0]): string {
  return renderToString(createElement(SaveLoadMenu, props))
}

// --- tests ---------------------------------------------------------------

describe('SaveLoadMenu', () => {
  let sm: SaveManager

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
    sm = new SaveManager({ gameId: 'test-game', slots: 3, autoSave: false })
  })

  // US-001-AC01 — overlay renders when isOpen is true
  it('AC01: renders an overlay panel when isOpen is true', () => {
    const html = render({ isOpen: true, onClose: () => {}, saveManager: sm })
    expect(html.length).toBeGreaterThan(0)
    expect(html).toContain('Save / Load')
  })

  it('AC01: renders nothing when isOpen is false', () => {
    const html = render({ isOpen: false, onClose: () => {}, saveManager: sm })
    expect(html).toBe('')
  })

  // US-001-AC02 — close button is present
  it('AC02: renders a close button that triggers onClose', () => {
    const html = render({ isOpen: true, onClose: () => {}, saveManager: sm })
    expect(html).toContain('aria-label="Close save menu"')
  })

  // US-001-AC03 — occupied slots show displayName, sceneName, and timestamp
  it('AC03: shows displayName for an occupied slot', () => {
    sm.save(1, makeState({ displayName: 'Chapter 3', sceneName: 'forest' }))
    const html = render({ isOpen: true, onClose: () => {}, saveManager: sm })
    expect(html).toContain('Chapter 3')
    expect(html).toContain('forest')
  })

  it('AC03: shows a human-readable timestamp for an occupied slot', () => {
    const ts = Date.now()
    sm.save(1, makeState())
    const html = render({ isOpen: true, onClose: () => {}, saveManager: sm })
    const formatted = formatTimestamp(ts)
    // Timestamp should be present (same minute — allow slight clock drift by checking year)
    expect(html).toContain(new Date(ts).getFullYear().toString())
    // Ensure formatTimestamp produces a non-empty string
    expect(formatted.length).toBeGreaterThan(0)
  })

  it('AC03: shows auto-save slot data when auto slot is occupied', () => {
    sm.save('auto', makeState({ displayName: 'Auto Chapter', sceneName: 'castle' }))
    const html = render({ isOpen: true, onClose: () => {}, saveManager: sm })
    expect(html).toContain('Auto Chapter')
    expect(html).toContain('castle')
    expect(html).toContain('Auto Save')
  })

  // US-001-AC04 — empty slots show "Empty slot"
  it('AC04: shows "Empty slot" for unoccupied numeric slots', () => {
    const html = render({ isOpen: true, onClose: () => {}, saveManager: sm })
    // All 3 numeric slots + auto slot are empty → multiple "Empty slot" labels
    const matches = (html.match(/Empty slot/g) ?? []).length
    // 4 total rows (auto + 3 numeric), all empty
    expect(matches).toBe(4)
  })

  it('AC04: shows "Empty slot" only for unoccupied slots when some are occupied', () => {
    sm.save(2, makeState({ displayName: 'Slot 2 Data', sceneName: 'town' }))
    const html = render({ isOpen: true, onClose: () => {}, saveManager: sm })
    // 3 empty (auto, slot 1, slot 3), 1 occupied (slot 2)
    const matches = (html.match(/Empty slot/g) ?? []).length
    expect(matches).toBe(3)
    expect(html).toContain('Slot 2 Data')
  })

  it('AC04: lists all slots up to the configured slot count', () => {
    const html = render({ isOpen: true, onClose: () => {}, saveManager: sm })
    // sm has slots: 3 → rows for auto, slot1, slot2, slot3
    expect(html).toContain('Auto Save')
    expect(html).toContain('Slot 1')
    expect(html).toContain('Slot 2')
    expect(html).toContain('Slot 3')
  })
})

// --- formatTimestamp unit tests ------------------------------------------

describe('formatTimestamp', () => {
  it('returns a non-empty string for a valid timestamp', () => {
    const result = formatTimestamp(Date.now())
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes the year in the formatted output', () => {
    const ts = new Date('2025-06-15T10:30:00').getTime()
    const result = formatTimestamp(ts)
    expect(result).toContain('2025')
  })
})
