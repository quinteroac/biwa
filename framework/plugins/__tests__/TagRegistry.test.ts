import { describe, expect, it, mock } from 'bun:test'
import { EventBus } from '../../engine/EventBus.ts'
import { TagRegistry } from '../TagRegistry.ts'
import type { GameEngine } from '../../engine/GameEngine.ts'

describe('TagRegistry', () => {
  it('registers and dispatches plugin tag handlers', async () => {
    const registry = new TagRegistry()
    const handler = mock(() => {})
    registry.register('effect', handler, { pluginId: 'screen-effects' })

    const dispatched = await registry.dispatch(
      { type: 'effect', id: 'shake', intensity: '0.4' },
      { engine: { id: 'tag-game' } as GameEngine, eventBus: new EventBus() },
    )

    expect(dispatched).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(registry.get('effect')?.pluginId).toBe('screen-effects')
  })

  it('rejects core tag overrides and duplicate plugin tags', () => {
    const registry = new TagRegistry()
    expect(() => registry.register('scene', () => {})).toThrow('reserved')
    registry.register('effect', () => {})
    expect(() => registry.register('effect', () => {})).toThrow('already registered')
  })

  it('returns false when dispatching an unregistered tag', async () => {
    const registry = new TagRegistry()
    await expect(registry.dispatch(
      { type: 'missing' },
      { engine: { id: 'tag-game' } as GameEngine, eventBus: new EventBus() },
    )).resolves.toBe(false)
  })
})
