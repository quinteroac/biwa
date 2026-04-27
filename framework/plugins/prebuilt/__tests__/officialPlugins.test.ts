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
