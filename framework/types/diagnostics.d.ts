import type { EngineState } from '../engine/GameEngine.ts'

export interface RuntimeDiagnosticsScene {
  id: string | null
  variant: string | null
}

export interface RuntimeDiagnosticsCharacter {
  id: string
  position: string
  expression: string
  exiting?: boolean
}

export interface RuntimeDiagnosticsAudio {
  bgm?: Record<string, unknown>
  ambience?: Record<string, unknown>
  voice?: Record<string, unknown>
}

export interface RuntimeDiagnosticsPlugin {
  id: string
  name: string
  version: string
  active: boolean
  capabilities: string[]
  renderers: Record<string, string[]>
  tags: string[]
}

export interface RuntimeDiagnosticsRenderer {
  kind: string
  type: string
  pluginId?: string
}

export interface RuntimeDiagnosticsSnapshot {
  state: EngineState
  scene: RuntimeDiagnosticsScene
  variables: Record<string, unknown>
  characters: RuntimeDiagnosticsCharacter[]
  audio: RuntimeDiagnosticsAudio
  plugins: RuntimeDiagnosticsPlugin[]
  renderers: RuntimeDiagnosticsRenderer[]
}
