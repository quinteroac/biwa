import { describe, expect, it } from 'bun:test'
import { EventBus } from '../../../engine/EventBus.ts'
import { createPluginContext, loadPluginDescriptor } from '../../PluginRegistry.ts'
import { officialPluginCatalog, officialPlugins } from '../index.ts'
import { RendererRegistry } from '../../../renderers/RendererRegistry.ts'
import type { GameEngine } from '../../../engine/GameEngine.ts'

describe('official prebuilt plugins', () => {
  it('exposes a catalog of explicit plugin factories', () => {
    expect(officialPluginCatalog.map(plugin => plugin.id)).toContain('official-ink-wash-background')
  })

  it('keeps catalog metadata complete and unique', () => {
    const ids = new Set<string>()
    for (const plugin of officialPluginCatalog) {
      expect(ids.has(plugin.id)).toBe(false)
      ids.add(plugin.id)
      expect(plugin.name.length).toBeGreaterThan(0)
      expect(plugin.description.length).toBeGreaterThan(0)
      expect(['renderer', 'player', 'devtools', 'asset']).toContain(plugin.category)
      expect(['stable', 'experimental', 'planned']).toContain(plugin.status)
      expect(plugin.capabilities.length).toBeGreaterThan(0)
      expect(plugin.configExample).toContain('officialPlugins.')
      expect(typeof plugin.factory).toBe('function')
      expect(plugin.factory().id).toBe(plugin.id)
    }
  })

  it('keeps catalog renderer metadata aligned with plugin manifests', () => {
    for (const plugin of officialPluginCatalog) {
      const descriptor = plugin.factory()
      expect(descriptor.capabilities).toEqual(plugin.capabilities)
      expect(descriptor.renderers ?? {}).toEqual(plugin.renderers ?? {})
    }
  })

  it('loads the ink wash background renderer without local entry files', async () => {
    const descriptor = officialPlugins.inkWashBackground()
    const { module } = await loadPluginDescriptor(descriptor)
    const engine = { id: 'prebuilt-game' } as GameEngine
    const context = {
      ...createPluginContext(engine, new EventBus()),
      rendererRegistry: new RendererRegistry(),
    }

    await module.setup?.(context)

    expect(context.rendererRegistry.has('background', 'ink-wash')).toBe(true)
    expect(context.rendererRegistry.get('background', 'ink-wash')?.pluginId).toBe('official-ink-wash-background')
  })
})
