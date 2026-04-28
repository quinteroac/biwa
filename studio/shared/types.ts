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
