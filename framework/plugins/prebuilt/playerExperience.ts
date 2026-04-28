import type { VnPluginDescriptor, VnPluginModule } from '../../types/plugins.d.ts'

export const BACKLOG_ENHANCER_PLUGIN_ID = 'official-backlog-enhancer'
export const GALLERY_UNLOCKS_PLUGIN_ID = 'official-gallery-unlocks'
export const MUSIC_ROOM_PLUGIN_ID = 'official-music-room'
export const PREFERENCES_PANEL_PLUGIN_ID = 'official-preferences-panel'

const playerExperienceModule: VnPluginModule = {
  setup({ logger }) {
    logger.info('Player experience plugin enabled.')
  },
}

function playerExperiencePlugin(id: string, name: string): VnPluginDescriptor {
  return {
    id,
    name,
    version: '0.1.0',
    type: 'plugin',
    capabilities: ['overlay', 'engine-event'],
    compatibility: { pluginApi: 'vn-plugin-api-v1' },
    loader: () => playerExperienceModule,
  }
}

export function backlogEnhancerPlugin(): VnPluginDescriptor {
  return playerExperiencePlugin(BACKLOG_ENHANCER_PLUGIN_ID, 'Official Backlog Enhancer')
}

export function galleryUnlocksPlugin(): VnPluginDescriptor {
  return playerExperiencePlugin(GALLERY_UNLOCKS_PLUGIN_ID, 'Official Gallery Unlocks')
}

export function musicRoomPlugin(): VnPluginDescriptor {
  return playerExperiencePlugin(MUSIC_ROOM_PLUGIN_ID, 'Official Music Room')
}

export function preferencesPanelPlugin(): VnPluginDescriptor {
  return playerExperiencePlugin(PREFERENCES_PANEL_PLUGIN_ID, 'Official Preferences Panel')
}
