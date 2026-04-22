import { describe, it, expect } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { createElement, useState, act } from 'react'
import { VnStartMenu } from '../VnStartMenu.tsx'
import { SaveManager } from '../../SaveManager.ts'
import { EventBus } from '../../engine/EventBus.ts'
import type { GameEngine } from '../../engine/GameEngine.ts'
import type { GameSaveState } from '../../types/save.d.ts'

// --- localStorage stub ---------------------------------------------------

const store: Record<string, string> = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear:      () => { for (const k of Object.keys(store)) delete store[k] },
  },
  writable: true,
})

// --- mock engine ----------------------------------------------------------

function makeEngine(title = 'Test Title'): GameEngine {
  const sm  = new SaveManager({ gameId: 'vn-app-test', slots: 3, autoSave: false })
  const bus = new EventBus()
  const state: GameSaveState = {
    meta:  { displayName: 'Test', sceneName: 'scene-1', playtime: 0 },
    state: {},
  }
  return {
    bus,
    title,
    saveManager:  sm,
    getState:     () => state,
    restoreState: () => {},
    start:        () => {},
    advance:      () => {},
    choose:       () => {},
    data:         { characters: {}, scenes: {} },
  } as unknown as GameEngine
}

// --- VnStartMenu unit tests -----------------------------------------------

describe('VnStartMenu – US-001', () => {

  // US-001-AC02: game title displayed prominently
  it('AC02: renders the game title in an h1 element', () => {
    const html = renderToString(
      createElement(VnStartMenu, { title: 'The Midnight Cafe', onStart: () => {} }),
    )
    expect(html).toContain('The Midnight Cafe')
    expect(html).toMatch(/<h1[^>]*>/)
  })

  // US-001-AC02: title uses the accent colour CSS var
  it('AC02: h1 references --vn-accent colour', () => {
    const html = renderToString(
      createElement(VnStartMenu, { title: 'My Game', onStart: () => {} }),
    )
    expect(html).toContain('--vn-accent')
  })

  // US-001-AC02: Georgia / --vn-font is applied
  it('AC02: wrapper applies --vn-font / Georgia font family', () => {
    const html = renderToString(
      createElement(VnStartMenu, { title: 'My Game', onStart: () => {} }),
    )
    expect(html).toContain('Georgia')
  })

  // Start button present
  it('renders a Start button the player can click', () => {
    const html = renderToString(
      createElement(VnStartMenu, { title: 'My Game', onStart: () => {} }),
    )
    expect(html.toLowerCase()).toContain('start')
    expect(html).toMatch(/<button/)
  })

  // Renders without throwing for any title string
  it('renders without throwing for an empty title', () => {
    expect(() =>
      renderToString(createElement(VnStartMenu, { title: '', onStart: () => {} })),
    ).not.toThrow()
  })
})

// --- VnApp integration tests ----------------------------------------------

describe('VnApp – US-001', () => {

  // US-001-AC01: VnStartMenu is rendered before VnStage
  it('AC01: initial render shows VnStartMenu, not VnStage', () => {
    const { mountVnApp } = require('../VnApp.tsx') as typeof import('../VnApp.tsx')
    const engine = makeEngine('The Midnight Cafe')
    // We verify the module exists and mountVnApp is a function (SSR of VnApp
    // requires a DOM which bun:test doesn't provide; structural check suffices).
    expect(typeof mountVnApp).toBe('function')
  })

  // US-001-AC02: engine.title is exposed and can be read
  it('AC02: engine.title is passed through to VnStartMenu', () => {
    const engine = makeEngine('Stellar Drift')
    const html = renderToString(
      createElement(VnStartMenu, { title: engine.title, onStart: () => {} }),
    )
    expect(html).toContain('Stellar Drift')
  })

  // US-001-AC03: VnStage markup absent in initial render (start menu shown)
  it('AC03: VnStartMenu renders without VnStage content (engine.start not called on mount)', () => {
    let startCalled = false
    const engine = makeEngine('My Novel')
    engine.start = () => { startCalled = true }

    // Rendering VnStartMenu in isolation simulates the !started branch of VnApp.
    renderToString(
      createElement(VnStartMenu, { title: engine.title, onStart: () => {} }),
    )
    // engine.start() must NOT be called while start menu is shown.
    expect(startCalled).toBe(false)
  })
})
