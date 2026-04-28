import { asepriteCharacterAtlasPlugin } from './asepriteCharacterAtlas.tsx'
import { devtoolsPlugin } from './devtools.ts'
import { inkWashBackgroundPlugin } from './inkWashBackground.tsx'
import { backlogEnhancerPlugin, galleryUnlocksPlugin, musicRoomPlugin, preferencesPanelPlugin } from './playerExperience.ts'
import { atmosphereEffectsPlugin, screenEffectsPlugin } from './screenEffects.ts'
import type { RendererKind } from '../../renderers/RendererRegistry.ts'
import type { VnPluginDescriptor } from '../../types/plugins.d.ts'
import type { VnPluginCapability } from '../../types/plugins.d.ts'

export type OfficialPluginCategory = 'renderer' | 'effects' | 'player' | 'devtools' | 'asset'
export type OfficialPluginStatus = 'stable' | 'experimental' | 'planned'
export type OfficialPluginContract = 'runtime' | 'profile'

export interface OfficialPluginDefinition {
  id: string
  name: string
  category: OfficialPluginCategory
  status: OfficialPluginStatus
  contract: OfficialPluginContract
  description: string
  capabilities: VnPluginCapability[]
  renderers?: Partial<Record<RendererKind, string[]>>
  tags?: string[]
  importName: keyof typeof officialPlugins
  configExample: string
  fixture: string
  stableCriteria: string[]
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
  devtools: devtoolsPlugin,
  asepriteCharacterAtlas: asepriteCharacterAtlasPlugin,
}

export const officialPluginCatalog: OfficialPluginDefinition[] = [
  {
    id: 'official-ink-wash-background',
    name: 'Ink Wash Background',
    category: 'renderer',
    status: 'stable',
    contract: 'runtime',
    description: 'Background renderer with tint, contrast and paper grain controls.',
    capabilities: ['renderer'],
    renderers: { background: ['ink-wash'] },
    importName: 'inkWashBackground',
    configExample: `import { officialPlugins } from '<framework/plugins>'

plugins: [
  officialPlugins.inkWashBackground(),
]`,
    fixture: 'renderer:ink-wash-background',
    stableCriteria: [
      'Registers a background renderer at runtime.',
      'Has documented scene data options and variant behavior.',
      'Covered by catalog, setup and fixture tests.',
    ],
    factory: inkWashBackgroundPlugin,
  },
  {
    id: 'official-screen-effects',
    name: 'Screen Effects',
    category: 'effects',
    status: 'stable',
    contract: 'runtime',
    description: 'Ink-triggered screen effects such as shake, flash, vignette, blur and pulse.',
    capabilities: ['ink-tag'],
    tags: ['effect'],
    importName: 'screenEffects',
    configExample: `import { officialPlugins } from '<framework/plugins>'

plugins: [
  officialPlugins.screenEffects(),
]`,
    fixture: 'effects:screen-effects',
    stableCriteria: [
      'Registers plugin-owned Ink tags without core parser changes.',
      'Emits typed engine effect events from tag dispatch.',
      'Covered by catalog, dispatch and effects-layer tests.',
    ],
    factory: screenEffectsPlugin,
  },
  {
    id: 'official-atmosphere-effects',
    name: 'Atmosphere Effects',
    category: 'effects',
    status: 'stable',
    contract: 'runtime',
    description: 'Atmospheric overlays such as rain, snow, fog and dust.',
    capabilities: ['ink-tag'],
    tags: ['atmosphere'],
    importName: 'atmosphereEffects',
    configExample: `import { officialPlugins } from '<framework/plugins>'

plugins: [
  officialPlugins.atmosphereEffects(),
]`,
    fixture: 'effects:atmosphere-effects',
    stableCriteria: [
      'Registers plugin-owned Ink tags without core parser changes.',
      'Emits typed engine effect events from tag dispatch.',
      'Covered by catalog, dispatch and effects-layer tests.',
    ],
    factory: atmosphereEffectsPlugin,
  },
  {
    id: 'official-backlog-enhancer',
    name: 'Backlog Enhancer',
    category: 'player',
    status: 'experimental',
    contract: 'profile',
    description: 'Enhanced backlog controls with search, speaker filters and voice replay when entries include voice metadata.',
    capabilities: ['overlay', 'engine-event'],
    importName: 'backlogEnhancer',
    configExample: `import { officialPlugins } from '<framework/plugins>'

plugins: [
  officialPlugins.backlogEnhancer(),
]`,
    fixture: 'player:backlog-enhancer-profile',
    stableCriteria: [
      'Promote when backlog exposes a plugin-owned extension point or this remains documented as a preset profile.',
      'Keep search, speaker filters and voice replay covered by component tests.',
    ],
    factory: backlogEnhancerPlugin,
  },
  {
    id: 'official-gallery-unlocks',
    name: 'Gallery Unlocks',
    category: 'player',
    status: 'experimental',
    contract: 'profile',
    description: 'Player CG gallery profile backed by the framework extras and unlock contracts.',
    capabilities: ['overlay', 'engine-event'],
    importName: 'galleryUnlocks',
    configExample: `import { officialPlugins } from '<framework/plugins>'

plugins: [
  officialPlugins.galleryUnlocks(),
]`,
    fixture: 'player:gallery-unlocks-profile',
    stableCriteria: [
      'Promote when gallery exposes a plugin-owned extension point or this remains documented as a preset profile.',
      'Keep unlock storage and gallery rendering covered by engine/component tests.',
    ],
    factory: galleryUnlocksPlugin,
  },
  {
    id: 'official-music-room',
    name: 'Music Room',
    category: 'player',
    status: 'experimental',
    contract: 'profile',
    description: 'Music room and replay profile backed by extras metadata, unlocked track ids and preview playback.',
    capabilities: ['overlay', 'engine-event'],
    importName: 'musicRoom',
    configExample: `import { officialPlugins } from '<framework/plugins>'

plugins: [
  officialPlugins.musicRoom(),
]`,
    fixture: 'player:music-room-profile',
    stableCriteria: [
      'Promote when music room exposes a plugin-owned extension point or this remains documented as a preset profile.',
      'Keep unlock storage and music room rendering covered by engine/component tests.',
    ],
    factory: musicRoomPlugin,
  },
  {
    id: 'official-preferences-panel',
    name: 'Preferences Panel',
    category: 'player',
    status: 'experimental',
    contract: 'profile',
    description: 'Player preferences profile for reading speed, auto/skip behavior, text scale, contrast and reduced motion.',
    capabilities: ['overlay', 'engine-event'],
    importName: 'preferencesPanel',
    configExample: `import { officialPlugins } from '<framework/plugins>'

plugins: [
  officialPlugins.preferencesPanel(),
]`,
    fixture: 'player:preferences-panel-profile',
    stableCriteria: [
      'Promote when preferences exposes a plugin-owned extension point or this remains documented as a preset profile.',
      'Keep preference persistence and settings rendering covered by service/component tests.',
    ],
    factory: preferencesPanelPlugin,
  },
  {
    id: 'official-devtools',
    name: 'Runtime Devtools',
    category: 'devtools',
    status: 'experimental',
    contract: 'runtime',
    description: 'Development-only runtime inspector for scene, variables, active characters, audio, plugins and renderers.',
    capabilities: ['overlay', 'engine-event'],
    importName: 'devtools',
    configExample: `import { officialPlugins } from '<framework/plugins>'

plugins: [
  officialPlugins.devtools(),
]`,
    fixture: 'devtools:runtime-inspector',
    stableCriteria: [
      'Promote after keyboard toggling, filtering and snapshot export land.',
      'Keep diagnostics event emission and default inspector rendering covered by tests.',
    ],
    factory: devtoolsPlugin,
  },
  {
    id: 'official-aseprite-character-atlas',
    name: 'Aseprite Character Atlas',
    category: 'asset',
    status: 'stable',
    contract: 'runtime',
    description: 'Character renderer profile for CLI-generated ComfyUI GameAssetsMaker Aseprite atlas JSON.',
    capabilities: ['renderer', 'asset-loader'],
    renderers: { character: ['aseprite-character-atlas'] },
    importName: 'asepriteCharacterAtlas',
    configExample: `import { officialPlugins } from '<framework/plugins>'

plugins: [
  officialPlugins.asepriteCharacterAtlas(),
]`,
    fixture: 'asset:aseprite-character-atlas',
    stableCriteria: [
      'Registers a character renderer at runtime.',
      'Matches the ComfyUI GameAssetsMaker atlas contract used by the CLI.',
      'Covered by catalog, setup and atlas validation tests.',
    ],
    factory: asepriteCharacterAtlasPlugin,
  },
]

export { asepriteCharacterAtlasPlugin } from './asepriteCharacterAtlas.tsx'
export { devtoolsPlugin } from './devtools.ts'
export { inkWashBackgroundPlugin } from './inkWashBackground.tsx'
export { backlogEnhancerPlugin, galleryUnlocksPlugin, musicRoomPlugin, preferencesPanelPlugin } from './playerExperience.ts'
export { atmosphereEffectsPlugin, screenEffectsPlugin } from './screenEffects.ts'
