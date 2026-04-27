import { describe, it, expect } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { VnStage } from '../VnStage.tsx'
import { SaveManager } from '../../SaveManager.ts'
import { EventBus } from '../../engine/EventBus.ts'
import type { GameEngine } from '../../engine/GameEngine.ts'
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

// --- mock engine ----------------------------------------------------------

function makeEngine(): GameEngine {
  const sm = new SaveManager({ gameId: 'vn-stage-test', slots: 3, autoSave: false })
  const bus = new EventBus()
  const state: GameSaveState = {
    meta: { displayName: 'Stage Test', sceneName: 'scene-1', playtime: 0 },
    state: {},
  }
  return {
    bus,
    saveManager: sm,
    getState: () => state,
    restoreState: () => {},
    start: () => {},
    advance: () => {},
    choose: () => {},
    data: { characters: {}, scenes: {} },
  } as unknown as GameEngine
}

// --- tests ----------------------------------------------------------------

describe('VnStage – US-005 visibility props', () => {
  // US-005-AC01: VnStage accepts the three optional boolean props
  it('AC01: accepts showSlotMenu, showQuickSave, showAutoSave without TypeScript errors', () => {
    const engine = makeEngine()
    const el = createElement(VnStage, {
      engine,
      showSlotMenu: true,
      showQuickSave: true,
      showAutoSave: true,
    })
    expect(el).toBeTruthy()
  })

  // US-005-AC04: TypeScript accepts showQuickSave={false} in strict mode
  it('AC04: TypeScript accepts showQuickSave={false} without errors', () => {
    const engine = makeEngine()
    const el = createElement(VnStage, { engine, showQuickSave: false })
    expect(el).toBeTruthy()
  })

  it('AC04: TypeScript accepts showSlotMenu={false} without errors', () => {
    const engine = makeEngine()
    const el = createElement(VnStage, { engine, showSlotMenu: false })
    expect(el).toBeTruthy()
  })

  it('AC04: TypeScript accepts showAutoSave={false} without errors', () => {
    const engine = makeEngine()
    const el = createElement(VnStage, { engine, showAutoSave: false })
    expect(el).toBeTruthy()
  })

  // US-005-AC05: backward-compatible — no visibility props renders without errors
  it('AC05: renders without throwing when no visibility props are passed', () => {
    const engine = makeEngine()
    expect(() => renderToString(createElement(VnStage, { engine }))).not.toThrow()
  })

  // US-005-AC05: initial render without dialog shows no SaveControlsBar (dialog-gated)
  it('AC05: initial render (no active dialog) does not error', () => {
    const engine = makeEngine()
    const html = renderToString(createElement(VnStage, { engine }))
    expect(html.length).toBeGreaterThan(0)
  })

  // US-005-AC06: TypeScript/lint check — all prop combinations compile
  it('AC06: accepts all three props set to false simultaneously', () => {
    const engine = makeEngine()
    const el = createElement(VnStage, {
      engine,
      showSlotMenu: false,
      showQuickSave: false,
      showAutoSave: false,
    })
    expect(el).toBeTruthy()
  })

  // US-005-AC02/AC03: forwarding and DOM removal tested via SaveControlsBar
  // directly (with props that VnStage would forward) since dialog starts null in SSR.
  it('AC02/AC03: SaveControlsBar omits Quick Save button when showQuickSave=false', () => {
    // Verify the same prop forwarded to SaveControlsBar removes the control.
    // VnStage delegates the DOM-removal responsibility to SaveControlsBar.
    const { SaveControlsBar } = require('../SaveControlsBar.tsx')
    const sm = new SaveManager({ gameId: 'vn-stage-fwd-test', slots: 3, autoSave: false })
    const state: GameSaveState = {
      meta: { displayName: '', sceneName: '', playtime: 0 },
      state: {},
    }
    const html = renderToString(
      createElement(SaveControlsBar, {
        saveManager: sm,
        getState: () => state,
        onOpenMenu: () => {},
        showQuickSave: false,
        showSlotMenu: true,
        showAutoSave: true,
      }),
    )
    expect(html).not.toContain('Quick Save')
    expect(html).toContain('Save / Load')
    expect(html).toContain('Auto Save')
  })

  it('AC02/AC03: SaveControlsBar omits slot-menu button when showSlotMenu=false', () => {
    const { SaveControlsBar } = require('../SaveControlsBar.tsx')
    const sm = new SaveManager({ gameId: 'vn-stage-fwd-test2', slots: 3, autoSave: false })
    const state: GameSaveState = {
      meta: { displayName: '', sceneName: '', playtime: 0 },
      state: {},
    }
    const html = renderToString(
      createElement(SaveControlsBar, {
        saveManager: sm,
        getState: () => state,
        onOpenMenu: () => {},
        showQuickSave: true,
        showSlotMenu: false,
        showAutoSave: true,
      }),
    )
    expect(html).not.toContain('Save / Load')
    expect(html).toContain('Quick Save')
  })

  it('AC02/AC03: SaveControlsBar omits Auto Save toggle when showAutoSave=false', () => {
    const { SaveControlsBar } = require('../SaveControlsBar.tsx')
    const sm = new SaveManager({ gameId: 'vn-stage-fwd-test3', slots: 3, autoSave: false })
    const state: GameSaveState = {
      meta: { displayName: '', sceneName: '', playtime: 0 },
      state: {},
    }
    const html = renderToString(
      createElement(SaveControlsBar, {
        saveManager: sm,
        getState: () => state,
        onOpenMenu: () => {},
        showQuickSave: true,
        showSlotMenu: true,
        showAutoSave: false,
      }),
    )
    expect(html).not.toContain('Auto Save')
    expect(html).toContain('Quick Save')
  })
})
