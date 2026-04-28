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

export interface StudioDoctorResponse {
  diagnostics: DoctorJsonReport
}

export interface StudioStoryFile {
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
}

export interface StudioStoryResponse {
  file: StudioStoryFile
  content: string
  preview: StudioStoryPreviewLine[]
  tagSuggestions: string[]
}

export type StudioAssetKind = 'characters' | 'scenes' | 'audio' | 'gallery' | 'music' | 'spritesheets' | 'other'

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
  previewUrl: string | null
  body: string
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
  body?: string
}

export interface StudioScenesResponse {
  scenes: StudioSceneItem[]
}

export interface StudioSceneResponse {
  scene: StudioSceneItem
}

export interface StudioCharacterOffset {
  x?: number
  y?: number
}

export interface StudioCharacterAtlasSummary {
  path: string
  frameCount: number
  frameNames: string[]
  tags: string[]
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

export interface StudioCharacterItem {
  path: string
  id: string
  displayName: string
  role: string
  physicalDescription: string
  personality: string
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
  body: string
}

export interface StudioCharacterDraft {
  id: string
  displayName: string
  role: string
  physicalDescription: string
  personality: string
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
  body?: string
}

export interface StudioCharactersResponse {
  characters: StudioCharacterItem[]
}

export interface StudioCharacterResponse {
  character: StudioCharacterItem
}

export interface StudioCharacterAtlasResponse {
  atlas: StudioCharacterAtlasSummary
  character: StudioCharacterItem
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
