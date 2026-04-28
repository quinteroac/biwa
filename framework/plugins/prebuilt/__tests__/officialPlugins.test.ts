import { describe, expect, it } from 'bun:test'
import { EventBus } from '../../../engine/EventBus.ts'
import { createPluginContext, loadPluginDescriptor } from '../../PluginRegistry.ts'
import { officialPluginCatalog, officialPlugins } from '../index.ts'
import { RendererRegistry } from '../../../renderers/RendererRegistry.ts'
import { TagRegistry } from '../../TagRegistry.ts'
import type { GameEngine } from '../../../engine/GameEngine.ts'

describe('official prebuilt plugins', () => {
  it('exposes a catalog of explicit plugin factories', () => {
    expect(officialPluginCatalog.map(plugin => plugin.id)).toContain('official-ink-wash-background')
    expect(officialPluginCatalog.map(plugin => plugin.id)).toContain('official-backlog-enhancer')
    expect(officialPluginCatalog.map(plugin => plugin.id)).toContain('official-devtools')
    expect(officialPluginCatalog.map(plugin => plugin.id)).toContain('official-aseprite-character-atlas')
  })

  it('keeps catalog metadata complete and unique', () => {
    const ids = new Set<string>()
    for (const plugin of officialPluginCatalog) {
      expect(ids.has(plugin.id)).toBe(false)
      ids.add(plugin.id)
      expect(plugin.name.length).toBeGreaterThan(0)
      expect(plugin.description.length).toBeGreaterThan(0)
      expect(['renderer', 'effects', 'player', 'devtools', 'asset']).toContain(plugin.category)
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
      expect(descriptor.tags ?? []).toEqual(plugin.tags ?? [])
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

  it('loads effect plugins and registers their Ink tags', async () => {
    const engine = { id: 'prebuilt-game' } as GameEngine
    const screen = await loadPluginDescriptor(officialPlugins.screenEffects())
    const atmosphere = await loadPluginDescriptor(officialPlugins.atmosphereEffects())
    const context = {
      ...createPluginContext(engine, new EventBus()),
      tags: new TagRegistry(),
    }

    await screen.module.setup?.(context)
    await atmosphere.module.setup?.(context)

    expect(context.tags.has('effect')).toBe(true)
    expect(context.tags.has('atmosphere')).toBe(true)
  })

  it('loads player experience plugins as opt-in overlays', async () => {
    const descriptors = [
      officialPlugins.backlogEnhancer(),
      officialPlugins.galleryUnlocks(),
      officialPlugins.musicRoom(),
      officialPlugins.preferencesPanel(),
    ]

    for (const descriptor of descriptors) {
      const { manifest, module } = await loadPluginDescriptor(descriptor)
      expect(manifest.capabilities).toEqual(['overlay', 'engine-event'])
      expect(typeof module.setup).toBe('function')
    }
  })

  it('loads runtime devtools as a devtools catalog plugin', async () => {
    const { manifest, module } = await loadPluginDescriptor(officialPlugins.devtools())

    expect(manifest.id).toBe('official-devtools')
    expect(manifest.capabilities).toEqual(['overlay', 'engine-event'])
    expect(typeof module.setup).toBe('function')
  })

  it('loads the Aseprite character atlas renderer', async () => {
    const descriptor = officialPlugins.asepriteCharacterAtlas()
    const { module } = await loadPluginDescriptor(descriptor)
    const engine = { id: 'prebuilt-game' } as GameEngine
    const context = {
      ...createPluginContext(engine, new EventBus()),
      rendererRegistry: new RendererRegistry(),
    }

    await module.setup?.(context)

    expect(context.rendererRegistry.has('character', 'aseprite-character-atlas')).toBe(true)
    expect(context.rendererRegistry.get('character', 'aseprite-character-atlas')?.pluginId).toBe('official-aseprite-character-atlas')
  })
})
