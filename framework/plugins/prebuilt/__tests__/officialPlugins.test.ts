import { describe, expect, it } from 'bun:test'
import { EventBus } from '../../../engine/EventBus.ts'
import { createPluginContext, loadPluginDescriptor } from '../../PluginRegistry.ts'
import { officialPluginCatalog, officialPlugins } from '../index.ts'
import { RendererRegistry } from '../../../renderers/RendererRegistry.ts'
import { TagRegistry } from '../../TagRegistry.ts'
import type { GameEngine } from '../../../engine/GameEngine.ts'
import type { EngineEventMap, EngineEffectEvent } from '../../../types/events.d.ts'
import type { RuntimeDiagnosticsSnapshot } from '../../../types/diagnostics.d.ts'

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
      expect(['runtime', 'profile']).toContain(plugin.contract)
      expect(plugin.capabilities.length).toBeGreaterThan(0)
      expect(plugin.configExample).toContain('officialPlugins.')
      expect(plugin.configExample).toContain('<framework/plugins>')
      expect(plugin.fixture.length).toBeGreaterThan(0)
      expect(plugin.stableCriteria.length).toBeGreaterThan(0)
      expect(typeof plugin.factory).toBe('function')
      expect(plugin.factory().id).toBe(plugin.id)
    }
  })

  it('documents stable plugins with runtime contracts and fixture coverage', () => {
    const stable = officialPluginCatalog.filter(plugin => plugin.status === 'stable')
    expect(stable.map(plugin => plugin.id).sort()).toEqual([
      'official-aseprite-character-atlas',
      'official-atmosphere-effects',
      'official-ink-wash-background',
      'official-screen-effects',
    ])
    for (const plugin of stable) {
      expect(plugin.contract).toBe('runtime')
      expect(plugin.fixture).not.toContain('profile')
      expect(plugin.stableCriteria.join('\n')).toContain('Covered')
    }
  })

  it('keeps player experience plugins explicit as preset profiles', () => {
    const player = officialPluginCatalog.filter(plugin => plugin.category === 'player')
    expect(player.length).toBe(4)
    for (const plugin of player) {
      expect(plugin.status).toBe('experimental')
      expect(plugin.contract).toBe('profile')
      expect(plugin.fixture).toContain('profile')
      expect(plugin.stableCriteria.join('\n')).toContain('extension point')
    }
  })

  it('keeps reserved overlay and extras renderers out of official public renderer declarations', () => {
    for (const plugin of officialPluginCatalog) {
      expect(plugin.renderers?.overlay ?? []).toEqual([])
      expect(plugin.renderers?.extras ?? []).toEqual([])
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

  it('runs minimum runtime/profile fixtures for every official plugin', async () => {
    const covered = new Set<string>()

    for (const definition of officialPluginCatalog) {
      const descriptor = definition.factory()
      const { manifest, module } = await loadPluginDescriptor(descriptor)
      const eventBus = new EventBus<EngineEventMap>()
      const engine = {
        id: 'prebuilt-fixture-game',
        getDiagnosticsSnapshot: () => ({
          state: 'IDLE',
          scene: { id: null, variant: null },
          variables: {},
          characters: [],
          audio: {},
          plugins: [],
          renderers: [],
        }) satisfies RuntimeDiagnosticsSnapshot,
      } as unknown as GameEngine
      const context = {
        ...createPluginContext(engine, eventBus),
        rendererRegistry: new RendererRegistry(),
        tags: new TagRegistry(),
      }

      if (definition.contract === 'runtime') {
        await module.setup?.(context)
        for (const [kind, types] of Object.entries(definition.renderers ?? {})) {
          for (const type of types ?? []) {
            expect(context.rendererRegistry.has(kind as never, type)).toBe(true)
          }
        }
        for (const tag of definition.tags ?? []) {
          expect(context.tags.has(tag)).toBe(true)
        }
        if (definition.id === 'official-screen-effects') {
          const effects: EngineEffectEvent[] = []
          eventBus.on('engine:effect', payload => {
            effects.push(payload)
          })
          await context.tags.dispatch({ type: 'effect', id: 'shake', intensity: 0.4 }, context)
          const effect = effects[0]
          expect(effect?.id).toBe('shake')
          expect(effect?.effect.pluginId).toBe(definition.id)
        }
        if (definition.id === 'official-atmosphere-effects') {
          const effects: EngineEffectEvent[] = []
          eventBus.on('engine:effect', payload => {
            effects.push(payload)
          })
          await context.tags.dispatch({ type: 'atmosphere', id: 'rain', opacity: 0.3 }, context)
          const effect = effects[0]
          expect(effect?.id).toBe('rain')
          expect(effect?.effect.pluginId).toBe(definition.id)
        }
        if (definition.id === 'official-devtools') {
          let emitted = false
          eventBus.on('engine:diagnostics', () => {
            emitted = true
          })
          eventBus.emit('engine:diagnostics:request', {})
          expect(emitted).toBe(true)
          await module.dispose?.()
        }
      } else {
        expect(manifest.capabilities).toEqual(['overlay', 'engine-event'])
        expect(typeof module.setup).toBe('function')
      }

      covered.add(definition.id)
    }

    expect(covered.size).toBe(officialPluginCatalog.length)
  })
})
