import { describe, it, expect, beforeEach } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { SaveManager } from '../../SaveManager.ts'
import { VnQuickSave, quickSave } from '../VnQuickSave.tsx'
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

function makeState(): GameSaveState {
  return {
    meta: { displayName: 'Quick Save Test', sceneName: 'scene-1', playtime: 42 },
    state: { chapter: 1 },
  }
}

function render(overrides: Partial<VnQuickSaveProps> = {}): string {
  const sm = new SaveManager({ gameId: 'vn-qs-test', slots: 3, autoSave: false })
  return renderToString(
    createElement(VnQuickSave, {
      saveManager: sm,
      getState: makeState,
      ...overrides,
    }),
  )
}

type VnQuickSaveProps = Parameters<typeof VnQuickSave>[0]

// --- tests ---------------------------------------------------------------

describe('VnQuickSave', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
  })

  // US-005-AC02: component accepts saveManager and getState props
  it('AC02: mounts with saveManager and getState props without throwing', () => {
    const sm = new SaveManager({ gameId: 'vn-qs-test', slots: 3, autoSave: false })
    expect(() =>
      renderToString(
        createElement(VnQuickSave, { saveManager: sm, getState: makeState }),
      ),
    ).not.toThrow()
  })

  // US-005-AC01: component renders a Quick Save button
  it('AC01: renders a Quick Save button', () => {
    const html = render()
    expect(html).toContain('aria-label="Quick save"')
    expect(html).toContain('Quick Save')
  })

  // US-005-AC01: quickSave helper writes to slot 1
  it('AC01: quickSave() writes to slot 1', () => {
    const sm = new SaveManager({ gameId: 'vn-qs-test', slots: 3, autoSave: false })
    const result = quickSave(sm, makeState)
    expect(result).toBe(true)
    const loaded = sm.load(1)
    expect(loaded).not.toBeNull()
    expect(loaded?.state.meta.displayName).toBe('Quick Save Test')
  })

  // US-005-AC01: quickSave does not write to any other slot
  it('AC01: quickSave() writes only to slot 1, not other slots', () => {
    const sm = new SaveManager({ gameId: 'vn-qs-test', slots: 3, autoSave: false })
    quickSave(sm, makeState)
    expect(sm.load(2)).toBeNull()
    expect(sm.load(3)).toBeNull()
    expect(sm.load('auto')).toBeNull()
  })

  // US-005-AC03: component renders the ARIA live region for the confirmation toast
  it('AC03: renders an aria-live="polite" status region for confirmation', () => {
    const html = render()
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
  })

  // US-005-AC03: confirmation region is present (toast is always mounted for accessibility)
  it('AC03: confirmation container is always in the DOM (opacity 0 when idle)', () => {
    const html = render()
    expect(html).toContain('opacity:0')
  })

  // US-005-AC02: VnQuickSave is a named function export
  it('AC02: VnQuickSave is a named function export', () => {
    expect(typeof VnQuickSave).toBe('function')
  })

  // US-005-AC01: quickSave export is a named function
  it('AC01: quickSave is a named function export', () => {
    expect(typeof quickSave).toBe('function')
  })

  // US-005-AC01: quickSave returns false when localStorage throws
  it('AC01: quickSave() returns false when localStorage is unavailable', () => {
    const sm = new SaveManager({ gameId: 'vn-qs-test', slots: 3, autoSave: false })
    const originalSetItem = localStorage.setItem
    localStorage.setItem = () => { throw new Error('Storage full') }
    const result = quickSave(sm, makeState)
    expect(result).toBe(false)
    localStorage.setItem = originalSetItem
  })
})
