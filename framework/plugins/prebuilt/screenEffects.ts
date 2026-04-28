import type { VnPluginDescriptor, VnPluginModule } from '../../types/plugins.d.ts'

export const SCREEN_EFFECTS_PLUGIN_ID = 'official-screen-effects'
export const ATMOSPHERE_EFFECTS_PLUGIN_ID = 'official-atmosphere-effects'

function createEffectModule(pluginId: string, tagName: 'effect' | 'atmosphere'): VnPluginModule {
  return {
    setup({ tags, eventBus }) {
      tags.register(tagName, (tag) => {
        const id = typeof tag.id === 'string' ? tag.id : undefined
        eventBus.emit('engine:effect', {
          id,
          effect: {
            ...tag,
            pluginId,
            type: id ?? tag.type,
          },
        })
      }, {
        pluginId,
        description: 'Runs visual effect commands from Ink.',
      })
    },
  }
}

export function screenEffectsPlugin(): VnPluginDescriptor {
  return {
    id: SCREEN_EFFECTS_PLUGIN_ID,
    name: 'Official Screen Effects',
    version: '0.1.0',
    type: 'plugin',
    capabilities: ['ink-tag'],
    tags: ['effect'],
    compatibility: { pluginApi: 'vn-plugin-api-v1' },
    loader: () => createEffectModule(SCREEN_EFFECTS_PLUGIN_ID, 'effect'),
  }
}

export function atmosphereEffectsPlugin(): VnPluginDescriptor {
  return {
    id: ATMOSPHERE_EFFECTS_PLUGIN_ID,
    name: 'Official Atmosphere Effects',
    version: '0.1.0',
    type: 'plugin',
    capabilities: ['ink-tag'],
    tags: ['atmosphere'],
    compatibility: { pluginApi: 'vn-plugin-api-v1' },
    loader: () => createEffectModule(ATMOSPHERE_EFFECTS_PLUGIN_ID, 'atmosphere'),
  }
}
