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
