import { describe, it, expect } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { EventBus } from '../../engine/EventBus.ts'
import { VnEndScreen } from '../VnEndScreen.tsx'
import { SaveManager } from '../../SaveManager.ts'
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

// --- helpers -----------------------------------------------------------

function makeEngine(): GameEngine {
  const bus = new EventBus()
  const sm  = new SaveManager({ gameId: 'end-screen-test', slots: 3, autoSave: false })
  const state: GameSaveState = {
    meta:  { displayName: 'Test', sceneName: 'scene-1', playtime: 0 },
    state: {},
  }
  return {
    bus,
    title:        'Test Game',
    saveManager:  sm,
    getState:     () => state,
    restoreState: () => {},
    start:        () => {},
    advance:      () => {},
    choose:       () => {},
    data:         { characters: {}, scenes: {} },
  } as unknown as GameEngine
}

// -----------------------------------------------------------------------

describe('EventBus – US-001-AC02: end_screen event', () => {
  it('AC02: emitting "end_screen" on the bus triggers registered handler', () => {
    const bus = new EventBus()
    let received: unknown = undefined
    bus.on<{ title?: string; message?: string }>('end_screen', payload => {
      received = payload
    })
    bus.emit('end_screen', { title: 'The End', message: 'Thanks' })
    expect(received).toEqual({ title: 'The End', message: 'Thanks' })
  })

  it('AC02: end_screen event with no payload fires handler with undefined', () => {
    const bus = new EventBus()
    let fired = false
    bus.on('end_screen', () => { fired = true })
    bus.emit('end_screen')
    expect(fired).toBe(true)
  })
})

describe('VnApp – US-001-AC03: transitions to VnEndScreen', () => {
  it('AC03: VnEndScreen renders with "vn-end-screen" testid (structural)', () => {
    const html = renderToString(createElement(VnEndScreen, { title: 'The End' }))
    expect(html).toContain('data-testid="vn-end-screen"')
    // VnStage testid should not be present in end screen
    expect(html).not.toContain('data-testid="vn-stage"')
  })

  it('AC03: engine bus "end_screen" event subscription works via on()', () => {
    const engine = makeEngine()
    let payloadReceived: { title?: string; message?: string } | null = null

    const unsub = engine.bus.on<{ title?: string; message?: string }>('end_screen', p => {
      payloadReceived = p
    })

    engine.bus.emit('end_screen', { title: 'Fin', message: 'The journey ends here.' })

    expect(payloadReceived).not.toBeNull()
    expect(payloadReceived!.title).toBe('Fin')
    expect(payloadReceived!.message).toBe('The journey ends here.')
    unsub()
  })

  it('AC03: unsubscribing from "end_screen" stops further notifications', () => {
    const engine = makeEngine()
    let callCount = 0
    const unsub = engine.bus.on('end_screen', () => { callCount++ })
    engine.bus.emit('end_screen', {})
    unsub()
    engine.bus.emit('end_screen', {})
    expect(callCount).toBe(1)
  })
})
