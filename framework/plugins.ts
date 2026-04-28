export {
  createPluginContext,
  loadPluginDescriptor,
  PluginRegistry,
  PluginValidationError,
  validatePluginManifest,
  VN_PLUGIN_API_VERSION,
} from './plugins/PluginRegistry.ts'
export {
  CORE_TAGS,
  defaultTagRegistry,
  TagRegistry,
} from './plugins/TagRegistry.ts'
export type {
  TagHandler,
  TagHandlerContext,
  TagRecord,
} from './plugins/TagRegistry.ts'
export {
  defaultRendererRegistry,
  RendererRegistry,
} from './renderers/RendererRegistry.ts'
export type {
  BackgroundRendererProps,
  CharacterRendererProps,
  ExtrasRendererProps,
  OverlayRendererProps,
  RendererKind,
  RendererPropsByKind,
  RendererRecord,
  TransitionRendererProps,
} from './renderers/RendererRegistry.ts'
export {
  asepriteCharacterAtlasPlugin,
  atmosphereEffectsPlugin,
  backlogEnhancerPlugin,
  devtoolsPlugin,
  galleryUnlocksPlugin,
  inkWashBackgroundPlugin,
  musicRoomPlugin,
  officialPluginCatalog,
  officialPlugins,
  preferencesPanelPlugin,
  screenEffectsPlugin,
} from './plugins/prebuilt/index.ts'
export type {
  OfficialPluginCategory,
  OfficialPluginDefinition,
  OfficialPluginStatus,
} from './plugins/prebuilt/index.ts'
export type * from './types/plugins.d.ts'
