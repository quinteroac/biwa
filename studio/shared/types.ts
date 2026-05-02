import type { DoctorJsonReport } from '../../manager/commands/doctor.ts'

export type StudioProjectStatus = 'ok' | 'warning' | 'error'

export interface StudioProjectCounts {
  storyFiles: number
  characterFiles: number
  sceneFiles: number
  assetFiles: number
  plugins: number
}

export interface StudioProjectSummary {
  id: string
  title: string
  version: string
  description: string
  coverPath: string
  coverUrl: string | null
  defaultLocale: string
  locales: string[]
  pluginIds: string[]
  status: StudioProjectStatus
  counts: StudioProjectCounts
  diagnostics: DoctorJsonReport
}

export interface StudioProjectsResponse {
  projects: StudioProjectSummary[]
}

export interface StudioProjectResponse {
  project: StudioProjectSummary
}

export interface StudioProjectCreateRequest {
  gameId: string
  title?: string
}

export interface StudioProjectCreateResponse {
  project: StudioProjectSummary
}

export interface StudioProjectIdentityDraft {
  title: string
  description: string
  coverPath: string
}

export interface StudioProjectCoverUploadResponse {
  coverPath: string
  coverUrl: string | null
}

export interface StudioArtStyleSlot {
  index: number
  path: string | null
  url: string | null
  size: number | null
}

export interface StudioArtStyleResponse {
  slots: StudioArtStyleSlot[]
}

export interface StudioArtStyleMutationResponse {
  slot: StudioArtStyleSlot
  slots: StudioArtStyleSlot[]
  revisedPrompt?: string
}

export interface StudioDoctorResponse {
  diagnostics: DoctorJsonReport
}

export interface StudioStoryFile {
  path: string
  locale: string
}

export interface StudioStoryFolder {
  path: string
  locale: string
}

export interface StudioStoryPreviewLine {
  line: number
  kind: 'knot' | 'choice' | 'dialogue'
  text: string
}

export interface StudioStoryListResponse {
  files: StudioStoryFile[]
  folders: StudioStoryFolder[]
}

export interface StudioStoryResponse {
  file: StudioStoryFile
  content: string
  preview: StudioStoryPreviewLine[]
  tagSuggestions: string[]
}

export type StudioAssetKind = 'characters' | 'scenes' | 'audio' | 'gallery' | 'music' | 'spritesheets' | 'other'
export type StudioAsepriteAtlasKind = 'Visual Novel' | 'Animation'

export interface StudioAssetItem {
  path: string
  kind: StudioAssetKind
  extension: string
  size: number
  previewUrl: string | null
}

export interface StudioAssetsResponse {
  assets: StudioAssetItem[]
}

export interface StudioSceneItem {
  path: string
  id: string
  displayName: string
  description: string
  location: string
  timeOfDay: string
  weather: string
  mood: string
  prompt: string
  thumbnail: string
  background?: Record<string, unknown>
  audio?: Record<string, unknown>
  previewUrl: string | null
  backgroundFolders: string[]
  backgrounds: StudioSceneBackgroundAsset[]
  body: string
}

export interface StudioSceneFolder {
  path: string
}

export interface StudioSceneBackgroundAsset {
  folder: string
  path: string
  url: string | null
  size: number
  isActive: boolean
}

export interface StudioSceneDraft {
  id: string
  displayName: string
  description: string
  location: string
  timeOfDay: string
  weather: string
  mood: string
  prompt: string
  thumbnail: string
  background: Record<string, unknown>
  audio: Record<string, unknown>
  body?: string
}

export interface StudioScenesResponse {
  scenes: StudioSceneItem[]
  folders: StudioSceneFolder[]
}

export interface StudioSceneResponse {
  scene: StudioSceneItem
}

export interface StudioSceneBackgroundFolderResponse {
  folder: string
  scene: StudioSceneItem
}

export interface StudioSceneBackgroundUploadResponse {
  path: string
  url: string | null
  scene: StudioSceneItem
}

export interface StudioSceneBackgroundGenerateRequest {
  folder: string
  prompt?: string
}

export interface StudioSceneBackgroundGenerateResponse {
  path: string
  url: string | null
  revisedPrompt: string
  scene: StudioSceneItem
}

export interface StudioSceneBackgroundEditResponse {
  path: string
  url: string | null
  revisedPrompt: string
  sourcePath: string
  scene: StudioSceneItem
}

export interface StudioSceneBackgroundDeleteResponse {
  deletedPath: string
  scene: StudioSceneItem
}

export interface StudioSceneFolderResponse {
  folder: string
  scenes: StudioSceneItem[]
  folders: StudioSceneFolder[]
}

export interface StudioSceneFileMutationResponse {
  scene: StudioSceneItem
  scenes: StudioSceneItem[]
  folders: StudioSceneFolder[]
}

export interface StudioSceneGenerateRequest {
  folder: string
  prompt: string
}

export interface StudioCharacterOffset {
  x?: number
  y?: number
}

export interface StudioCharacterAtlasSummary {
  path: string
  atlasKind: StudioAsepriteAtlasKind
  spritesheetType: string
  frameCount: number
  frameNames: string[]
  tags: string[]
  frames: Array<{
    key: string
    name: string
    x: number
    y: number
    w: number
    h: number
    duration: number
  }>
  frameTags: Array<{
    name: string
    from: number
    to: number
    direction: string
  }>
  sheetSize: {
    w: number
    h: number
  }
  previewFrame: {
    name: string
    x: number
    y: number
    w: number
    h: number
  } | null
}

export interface StudioCharacterSpritesheetAsset {
  folder: string
  path: string
  atlasPath: string
  url: string | null
  atlas: StudioCharacterAtlasSummary | null
  isActive: boolean
}

export interface StudioCharacterSheetAssets {
  main: string
  concepts: string[]
  generated: string[]
}

export interface StudioCharacterSheetAssetUrls {
  main: string | null
  concepts: string[]
  generated: string[]
}

export interface StudioCharacterItem {
  path: string
  id: string
  displayName: string
  role: string
  age: string
  gender: string
  tags: string[]
  physicalDescription: string
  expressionsText: string[]
  personality: string
  traits: string[]
  motivations: string
  fears: string
  internalConflict: string
  backstory: string
  keyEvents: string[]
  arcInitial: string
  arcBreak: string
  arcFinal: string
  relationships: string[]
  authorNotes: string
  palette: string
  outfit: string
  prompt: string
  nameColor: string
  isNarrator: boolean
  defaultPosition: string
  defaultExpression: string
  scale: number
  offset: StudioCharacterOffset
  animation: Record<string, unknown>
  expressions: string[]
  atlasPath: string
  previewUrl: string | null
  atlas: StudioCharacterAtlasSummary | null
  spritesheetFolders: string[]
  spritesheets: StudioCharacterSpritesheetAsset[]
  characterSheet: StudioCharacterSheetAssets
  characterSheetUrls: StudioCharacterSheetAssetUrls
  body: string
}

export interface StudioCharacterDraft {
  id: string
  displayName: string
  role: string
  age?: string
  gender?: string
  tags?: string[]
  physicalDescription: string
  expressionsText?: string[]
  personality: string
  traits?: string[]
  motivations?: string
  fears?: string
  internalConflict?: string
  backstory?: string
  keyEvents?: string[]
  arcInitial?: string
  arcBreak?: string
  arcFinal?: string
  relationships?: string[]
  authorNotes?: string
  palette: string
  outfit: string
  prompt: string
  nameColor: string
  isNarrator: boolean
  defaultPosition: string
  defaultExpression: string
  scale: number
  offset: StudioCharacterOffset
  animation: Record<string, unknown>
  expressions: string[]
  characterSheet?: StudioCharacterSheetAssets
  body?: string
}

export interface StudioCharactersResponse {
  characters: StudioCharacterItem[]
}

export interface StudioCharacterResponse {
  character: StudioCharacterItem
}

export interface StudioCharacterDeleteResponse {
  deletedPath: string
  characters: StudioCharacterItem[]
}

export interface StudioCharacterAtlasResponse {
  atlas: StudioCharacterAtlasSummary
  character: StudioCharacterItem
}

export interface StudioCharacterSpritesheetDeleteResponse {
  deletedPath: string
  character: StudioCharacterItem
}

export interface StudioCharacterSpritesheetUploadResponse {
  path: string
  url: string | null
  character: StudioCharacterItem
}

export interface StudioCharacterSpritesheetFolderResponse {
  folder: string
  character: StudioCharacterItem
}

export type StudioSpritesheetLayoutDirection = 'Horizontal' | 'Vertical' | 'Grid'

export interface StudioCharacterSpritesheetGenerateRequest {
  atlasKind?: StudioAsepriteAtlasKind
  size: StudioOpenAiImageSize
  spritesheetType: string
  spriteCount: number
  layoutDirection: StudioSpritesheetLayoutDirection
  columns: number
  spriteNames: string[]
  animationFramesPerTag?: number
  animationTags?: Array<{
    name: string
    from: number
    to: number
    direction: string
    color?: string
  }>
  frameDuration: number
  folder: string
  prompt: string
}

export interface StudioCharacterSpritesheetGenerateResponse {
  path: string
  atlasPath: string
  url: string | null
  revisedPrompt: string
  character: StudioCharacterItem
}

export interface StudioCharacterSheetUploadResponse {
  path: string
  url: string | null
  character: StudioCharacterItem
}

export interface StudioCharacterSheetGenerateRequest {
  path: string
  character: StudioCharacterDraft
  prompt?: string
  artTypes?: StudioCharacterSheetArtType[]
}

export type StudioCharacterSheetArtType = 'silhouetteSketch' | 'conceptArt' | 'characterSheet' | 'actionPoses'

export interface StudioGeneratedCharacterSheetImage {
  artType: StudioCharacterSheetArtType
  path: string
  url: string | null
  revisedPrompt: string
  referencePath: string | null
}

export interface StudioCharacterSheetGenerateResponse {
  path: string
  url: string | null
  revisedPrompt: string
  generated: StudioGeneratedCharacterSheetImage[]
  character: StudioCharacterItem
}

export interface StudioCharacterSheetEditResponse {
  path: string
  url: string | null
  revisedPrompt: string
  sourcePath: string
  character: StudioCharacterItem
}

export interface StudioCharacterSheetDeleteResponse {
  deletedPath: string
  character: StudioCharacterItem
}

export type StudioOpenAiImageQuality = 'low' | 'medium' | 'high' | 'auto'
export type StudioOpenAiImageFormat = 'png' | 'webp' | 'jpeg'
export type StudioOpenAiImageModeration = 'auto' | 'low'
export type StudioOpenAiImageSize =
  | '1024x1024'
  | '1536x1024'
  | '1024x1536'
  | '2048x1024'
  | '1024x2048'
  | '2048x2048'
  | '3072x1024'
  | '1024x3072'
  | '3840x1280'
  | '1280x3840'
  | '3840x2160'
  | '2160x3840'
export type StudioOpenAiImageResolution = StudioOpenAiImageSize | 'auto'

export interface StudioOpenAiImagesSettings {
  apiKey: string
  baseUrl: string
  imageGenerationPath: string
  model: string
  quality: StudioOpenAiImageQuality
  outputFormat: StudioOpenAiImageFormat
  moderation: StudioOpenAiImageModeration
  characterSheetResolution: StudioOpenAiImageResolution
  spritesheetBackgroundRemovalEnabled: boolean
  spritesheetBackgroundRemovalCommand: string
  spritesheetBackgroundRemovalTimeoutSeconds: number
  imageGenerationTimeoutSeconds: number
}

export interface StudioOpenAiImagesSettingsView extends StudioOpenAiImagesSettings {
  apiKeyConfigured: boolean
}

export interface StudioSettings {
  openaiImages: StudioOpenAiImagesSettingsView
}

export interface StudioSettingsResponse {
  settings: StudioSettings
}

export type StudioPluginCategory = 'renderer' | 'effects' | 'player' | 'devtools' | 'asset'
export type StudioPluginStatus = 'stable' | 'experimental' | 'planned'
export type StudioPluginContract = 'runtime' | 'profile' | 'local'

export interface StudioPluginCatalogItem {
  id: string
  name: string
  category: StudioPluginCategory | 'local'
  status: StudioPluginStatus | 'local'
  contract: StudioPluginContract
  description: string
  capabilities: string[]
  renderers: Record<string, string[]>
  tags: string[]
  importName: string | null
  configExample: string
  installed: boolean
  removable: boolean
  compatible: boolean
  compatibilityMessage: string
}

export interface StudioPluginsResponse {
  plugins: StudioPluginCatalogItem[]
}

export interface StudioPluginMutationResponse {
  plugins: StudioPluginCatalogItem[]
  diagnostics: DoctorJsonReport
}

export type StudioBuildMode = 'standalone' | 'static' | 'portal' | 'embedded'
export type StudioBuildStatus = 'success' | 'error'

export interface StudioBuildRecord {
  id: string
  gameId: string
  mode: StudioBuildMode
  status: StudioBuildStatus
  createdAt: string
  durationMs: number
  distPath: string
  previewUrl: string | null
  manifestUrl: string | null
  manifest: Record<string, unknown> | null
  error: string | null
}

export interface StudioBuildsResponse {
  builds: StudioBuildRecord[]
  latest: StudioBuildRecord | null
  manifest: Record<string, unknown> | null
  previewUrl: string | null
  manifestUrl: string | null
}

export interface StudioBuildResponse {
  build: StudioBuildRecord
  builds: StudioBuildRecord[]
}

export interface StudioManifestResponse {
  manifest: Record<string, unknown> | null
  manifestUrl: string | null
}

export type StudioAuthoringNodeKind = 'root' | 'knot'
export type StudioAuthoringEdgeKind = 'choice' | 'divert'
export type StudioSearchKind = 'dialogue' | 'speaker' | 'tag' | 'variable' | 'asset' | 'data' | 'script'

export interface StudioAuthoringNode {
  id: string
  kind: StudioAuthoringNodeKind
  locale: string
  path: string
  line: number
  title: string
}

export interface StudioAuthoringEdge {
  from: string
  to: string
  target: string
  label: string
  kind: StudioAuthoringEdgeKind
  locale: string
  path: string
  line: number
  resolved: boolean
}

export interface StudioAuthoringCoverage {
  totalKnots: number
  reachableKnots: number
  unreachableKnots: StudioAuthoringNode[]
  unresolvedEdges: StudioAuthoringEdge[]
}

export interface StudioAuthoringSearchResult {
  path: string
  line: number
  kind: StudioSearchKind
  snippet: string
}

export interface StudioAuthoringNote {
  path: string
  line: number
  tag: string
  text: string
}

export interface StudioAuthoringLocaleSummary {
  locale: string
  storyFiles: number
  knots: number
  choices: number
  dialogueLines: number
  missingFiles: string[]
  extraFiles: string[]
}

export interface StudioAuthoringBranchStep {
  node: string
  via: string
  kind: StudioAuthoringEdgeKind
}

export interface StudioAuthoringBranchPath {
  id: string
  steps: StudioAuthoringBranchStep[]
  terminal: string
  stoppedBy: 'end' | 'cycle' | 'depth'
}

export interface StudioAuthoringDebugState {
  diagnostics: DoctorJsonReport['summary']
  buildStatus: StudioBuildStatus | 'none'
  buildMode: StudioBuildMode | null
  manifestUrl: string | null
}

export interface StudioAuthoringAnalysisResponse {
  graph: {
    nodes: StudioAuthoringNode[]
    edges: StudioAuthoringEdge[]
  }
  coverage: StudioAuthoringCoverage
  search: StudioAuthoringSearchResult[]
  notes: StudioAuthoringNote[]
  localization: StudioAuthoringLocaleSummary[]
  branches: StudioAuthoringBranchPath[]
  debug: StudioAuthoringDebugState
}
