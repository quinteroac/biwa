import { describe, expect, it, mock } from 'bun:test'
import { EventBus } from '../../engine/EventBus.ts'
import { PluginRegistry, createPluginContext, loadPluginDescriptor, validatePluginManifest } from '../PluginRegistry.ts'
import type { GameEngine } from '../../engine/GameEngine.ts'

const manifest = {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  type: 'plugin' as const,
  capabilities: ['engine-event' as const],
}

describe('PluginRegistry', () => {
  it('validates plugin manifests and rejects unknown capabilities', () => {
    expect(() => validatePluginManifest(manifest)).not.toThrow()
    expect(() => validatePluginManifest({ ...manifest, capabilities: ['wat' as never] })).toThrow('unknown capability')
  })

  it('rejects reserved ids and unsupported plugin API versions', () => {
    expect(() => validatePluginManifest({ ...manifest, id: 'vn-core' })).toThrow('reserved')
    expect(() => validatePluginManifest({
      ...manifest,
      compatibility: { pluginApi: 'future-api' },
    })).toThrow('unsupported plugin API')
  })

  it('registers plugins once and rejects duplicate ids', () => {
    const registry = new PluginRegistry()
    registry.register(manifest, {})
    expect(registry.list().map(record => record.manifest.id)).toEqual(['test-plugin'])
    expect(() => registry.register(manifest, {})).toThrow('already registered')
  })

  it('runs setup and dispose lifecycle hooks', async () => {
    const setup = mock(() => {})
    const dispose = mock(() => {})
    const registry = new PluginRegistry()
    registry.register(manifest, { setup, dispose })

    const engine = { id: 'plugin-game' } as GameEngine
    const context = createPluginContext(engine, new EventBus())
    await registry.setupAll(context)
    await registry.disposeAll()

    expect(setup).toHaveBeenCalledTimes(1)
    expect((setup.mock.calls[0] as unknown[])[0]).toMatchObject({ gameId: 'plugin-game' })
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('loads descriptors through runtime loader objects', async () => {
    const loaded = await loadPluginDescriptor({
      ...manifest,
      loader: async () => ({ default: { setup: () => {} } }),
    })

    expect(loaded.manifest.id).toBe('test-plugin')
    expect(typeof loaded.module.setup).toBe('function')
  })
})
