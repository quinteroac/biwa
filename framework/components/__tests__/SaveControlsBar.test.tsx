import { describe, it, expect, beforeEach } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { SaveManager } from '../../SaveManager.ts'
import { SaveControlsBar } from '../SaveControlsBar.tsx'
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
    meta: { displayName: 'Bar Test', sceneName: 'scene-1', playtime: 0 },
    state: {},
  }
}

type BarProps = Parameters<typeof SaveControlsBar>[0]

function render(overrides: Partial<BarProps> = {}): string {
  const sm = new SaveManager({ gameId: 'vn-bar-test', slots: 3, autoSave: false })
  return renderToString(
    createElement(SaveControlsBar, {
      saveManager: sm,
      getState: makeState,
      onOpenMenu: () => {},
      ...overrides,
    }),
  )
}

// --- tests ---------------------------------------------------------------

describe('SaveControlsBar', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
  })

  // US-001-AC01: renders as a horizontal strip with Quick Save button
  it('AC01: renders a Quick Save button', () => {
    const html = render()
    expect(html).toContain('aria-label="Quick save"')
    expect(html).toContain('Quick Save')
  })

  // US-001-AC01: renders a Save Menu button
  it('AC01: renders a Save Menu button', () => {
    const html = render()
    expect(html).toContain('aria-label="Open save menu"')
    expect(html).toContain('Save / Load')
  })

  // US-001-AC01: container uses flex row layout for horizontal strip
  it('AC01: container uses display:flex for horizontal layout', () => {
    const html = render()
    expect(html).toContain('display:flex')
  })

  // US-001-AC02: bar renders output when mounted (dialog visibility controls mounting in VnStage)
  it('AC02: renders non-empty output when mounted', () => {
    const html = render()
    expect(html.length).toBeGreaterThan(0)
  })

  // US-001-AC03: container does not intercept pointer events (pass-through to stage)
  it('AC03: container sets pointer-events:none to allow click-through', () => {
    const html = render()
    expect(html).toContain('pointer-events:none')
  })

  // US-001-AC03: buttons have pointer-events:auto so they remain interactive
  it('AC03: buttons have pointer-events:auto to capture clicks', () => {
    const html = render()
    expect(html).toContain('pointer-events:auto')
  })

  // US-001-AC04: SaveControlsBar is a named function export
  it('AC04: SaveControlsBar is a named function export', () => {
    expect(typeof SaveControlsBar).toBe('function')
  })

  // US-001-AC04: mounts without throwing
  it('AC04: mounts with all required props without throwing', () => {
    const sm = new SaveManager({ gameId: 'vn-bar-test', slots: 3, autoSave: false })
    expect(() =>
      renderToString(
        createElement(SaveControlsBar, {
          saveManager: sm,
          getState: makeState,
          onOpenMenu: () => {},
        }),
      ),
    ).not.toThrow()
  })

  // US-002-AC01: "Save / Load" button renders when showSlotMenu is true (default)
  it('US-002-AC01: renders "Save / Load" button when showSlotMenu is true (default)', () => {
    const html = render()
    expect(html).toContain('Save / Load')
    expect(html).toContain('aria-label="Open save menu"')
  })

  // US-002-AC01: explicit showSlotMenu={true} also renders the button
  it('US-002-AC01: renders "Save / Load" button when showSlotMenu is explicitly true', () => {
    const html = render({ showSlotMenu: true })
    expect(html).toContain('Save / Load')
  })

  // US-002-AC02: button is present so clicking it can open VnSaveMenu
  it('US-002-AC02: "Save / Load" button is present (enables opening VnSaveMenu on click)', () => {
    const html = render({ showSlotMenu: true })
    expect(html).toContain('aria-label="Open save menu"')
  })

  // US-002-AC03: "Save / Load" button is absent when showSlotMenu is false
  it('US-002-AC03: hides "Save / Load" button when showSlotMenu is false', () => {
    const html = render({ showSlotMenu: false })
    expect(html).not.toContain('Save / Load')
    expect(html).not.toContain('aria-label="Open save menu"')
  })

  // US-002-AC03: Quick Save button still renders when showSlotMenu is false
  it('US-002-AC03: Quick Save button still renders when showSlotMenu is false', () => {
    const html = render({ showSlotMenu: false })
    expect(html).toContain('Quick Save')
  })
})
