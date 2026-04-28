import { inkWashBackgroundPlugin } from './inkWashBackground.tsx'
import { backlogEnhancerPlugin, galleryUnlocksPlugin, musicRoomPlugin, preferencesPanelPlugin } from './playerExperience.ts'
import { atmosphereEffectsPlugin, screenEffectsPlugin } from './screenEffects.ts'
import type { RendererKind } from '../../renderers/RendererRegistry.ts'
import type { VnPluginDescriptor } from '../../types/plugins.d.ts'
import type { VnPluginCapability } from '../../types/plugins.d.ts'

export type OfficialPluginCategory = 'renderer' | 'effects' | 'player' | 'devtools' | 'asset'
export type OfficialPluginStatus = 'stable' | 'experimental' | 'planned'

export interface OfficialPluginDefinition {
  id: string
  name: string
  category: OfficialPluginCategory
  status: OfficialPluginStatus
  description: string
  capabilities: VnPluginCapability[]
  renderers?: Partial<Record<RendererKind, string[]>>
  tags?: string[]
  importName: keyof typeof officialPlugins
  configExample: string
  factory: () => VnPluginDescriptor
}

export const officialPlugins = {
  inkWashBackground: inkWashBackgroundPlugin,
  screenEffects: screenEffectsPlugin,
  atmosphereEffects: atmosphereEffectsPlugin,
  backlogEnhancer: backlogEnhancerPlugin,
  galleryUnlocks: galleryUnlocksPlugin,
  musicRoom: musicRoomPlugin,
  preferencesPanel: preferencesPanelPlugin,
}

export const officialPluginCatalog: OfficialPluginDefinition[] = [
  {
    id: 'official-ink-wash-background',
    name: 'Ink Wash Background',
    category: 'renderer',
    status: 'experimental',
    description: 'Background renderer with tint, contrast and paper grain controls.',
    capabilities: ['renderer'],
    renderers: { background: ['ink-wash'] },
    importName: 'inkWashBackground',
    configExample: `import { officialPlugins } from '<framework/plugins/prebuilt>'

plugins: [
  officialPlugins.inkWashBackground(),
]`,
    factory: inkWashBackgroundPlugin,
  },
  {
    id: 'official-screen-effects',
    name: 'Screen Effects',
    category: 'effects',
    status: 'experimental',
    description: 'Ink-triggered screen effects such as shake, flash, vignette, blur and pulse.',
    capabilities: ['ink-tag'],
    tags: ['effect'],
    importName: 'screenEffects',
    configExample: `import { officialPlugins } from '<framework/plugins/prebuilt>'

plugins: [
  officialPlugins.screenEffects(),
]`,
    factory: screenEffectsPlugin,
  },
  {
    id: 'official-atmosphere-effects',
    name: 'Atmosphere Effects',
    category: 'effects',
    status: 'experimental',
    description: 'Atmospheric overlays such as rain, snow, fog and dust.',
    capabilities: ['ink-tag'],
    tags: ['atmosphere'],
    importName: 'atmosphereEffects',
    configExample: `import { officialPlugins } from '<framework/plugins/prebuilt>'

plugins: [
  officialPlugins.atmosphereEffects(),
]`,
    factory: atmosphereEffectsPlugin,
  },
  {
    id: 'official-backlog-enhancer',
    name: 'Backlog Enhancer',
    category: 'player',
    status: 'experimental',
    description: 'Enhanced backlog controls with search, speaker filters and voice replay when entries include voice metadata.',
    capabilities: ['overlay', 'engine-event'],
    importName: 'backlogEnhancer',
    configExample: `import { officialPlugins } from '<framework/plugins/prebuilt>'

plugins: [
  officialPlugins.backlogEnhancer(),
]`,
    factory: backlogEnhancerPlugin,
  },
  {
    id: 'official-gallery-unlocks',
    name: 'Gallery Unlocks',
    category: 'player',
    status: 'experimental',
    description: 'Player CG gallery profile backed by the framework extras and unlock contracts.',
    capabilities: ['overlay', 'engine-event'],
    importName: 'galleryUnlocks',
    configExample: `import { officialPlugins } from '<framework/plugins/prebuilt>'

plugins: [
  officialPlugins.galleryUnlocks(),
]`,
    factory: galleryUnlocksPlugin,
  },
  {
    id: 'official-music-room',
    name: 'Music Room',
    category: 'player',
    status: 'experimental',
    description: 'Music room and replay profile backed by extras metadata, unlocked track ids and preview playback.',
    capabilities: ['overlay', 'engine-event'],
    importName: 'musicRoom',
    configExample: `import { officialPlugins } from '<framework/plugins/prebuilt>'

plugins: [
  officialPlugins.musicRoom(),
]`,
    factory: musicRoomPlugin,
  },
  {
    id: 'official-preferences-panel',
    name: 'Preferences Panel',
    category: 'player',
    status: 'experimental',
    description: 'Player preferences profile for reading speed, auto/skip behavior, text scale, contrast and reduced motion.',
    capabilities: ['overlay', 'engine-event'],
    importName: 'preferencesPanel',
    configExample: `import { officialPlugins } from '<framework/plugins/prebuilt>'

plugins: [
  officialPlugins.preferencesPanel(),
]`,
    factory: preferencesPanelPlugin,
  },
]

export { inkWashBackgroundPlugin } from './inkWashBackground.tsx'
export { backlogEnhancerPlugin, galleryUnlocksPlugin, musicRoomPlugin, preferencesPanelPlugin } from './playerExperience.ts'
export { atmosphereEffectsPlugin, screenEffectsPlugin } from './screenEffects.ts'
