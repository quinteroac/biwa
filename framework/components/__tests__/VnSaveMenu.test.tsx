import { describe, it, expect, beforeEach } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { SaveManager } from '../../SaveManager.ts'
import { VnSaveMenu } from '../VnSaveMenu.tsx'
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
    meta: { displayName: 'Test Save', sceneName: 'scene-1', playtime: 0 },
    state: {},
  }
}

function render(overrides: Partial<Parameters<typeof VnSaveMenu>[0]> = {}): string {
  const sm = new SaveManager({ gameId: 'vn-test', slots: 3, autoSave: false })
  return renderToString(
    createElement(VnSaveMenu, {
      isOpen: true,
      onClose: () => {},
      saveManager: sm,
      getState: makeState,
      onLoad: () => {},
      ...overrides,
    }),
  )
}

// --- tests ---------------------------------------------------------------

describe('VnSaveMenu', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
  })

  // US-004-AC01: component accepts the required typed props
  it('AC01: mounts with all required props without throwing', () => {
    const sm = new SaveManager({ gameId: 'vn-test', slots: 3, autoSave: false })
    expect(() =>
      renderToString(
        createElement(VnSaveMenu, {
          isOpen: true,
          onClose: () => {},
          saveManager: sm,
          getState: makeState,
          onLoad: () => {},
        }),
      ),
    ).not.toThrow()
  })

  // US-004-AC02: exported from VnSaveMenu.tsx
  it('AC02: VnSaveMenu is a function (named export)', () => {
    expect(typeof VnSaveMenu).toBe('function')
  })

  // US-004-AC01: renders overlay when isOpen is true
  it('AC01: renders the overlay when isOpen is true', () => {
    const html = render({ isOpen: true })
    expect(html.length).toBeGreaterThan(0)
    expect(html).toContain('Save / Load')
  })

  // US-004-AC01: renders nothing when isOpen is false
  it('AC01: renders null when isOpen is false', () => {
    const html = render({ isOpen: false })
    expect(html).toBe('')
  })

  // US-004-AC01: slot list is rendered with correct number of slots
  it('AC01: slot rows are rendered for all configured slots plus auto', () => {
    const html = render({ isOpen: true })
    expect(html).toContain('Auto Save')
    expect(html).toContain('Slot 1')
    expect(html).toContain('Slot 2')
    expect(html).toContain('Slot 3')
  })

  // US-004-AC01: save button is rendered for each slot
  it('AC01: each slot row contains a Save button', () => {
    const html = render({ isOpen: true })
    const saveButtonCount = (html.match(/aria-label="Save to/g) ?? []).length
    // 3 numbered slots + 1 auto = 4 total
    expect(saveButtonCount).toBe(4)
  })

  // US-004-AC01: close button is rendered
  it('AC01: close button is rendered with correct aria-label', () => {
    const html = render({ isOpen: true })
    expect(html).toContain('aria-label="Close save menu"')
  })
})
