import type { EventBus } from '../engine/EventBus.ts'
import type { GameEngine } from '../engine/GameEngine.ts'
import type { EngineEventMap } from './events.d.ts'

export type VnPluginCapability = 'renderer' | 'stage' | 'overlay' | 'engine-event' | 'asset-loader'

export interface VnPluginCompatibility {
  framework?: string
}

export interface VnPluginManifest {
  id: string
  name: string
  version: string
  type: 'plugin'
  entry?: string
  capabilities: VnPluginCapability[]
  compatibility?: VnPluginCompatibility
}

export interface VnPluginLogger {
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

export interface VnPluginContext {
  gameId: string
  engine: GameEngine
  eventBus: EventBus<EngineEventMap>
  assetBase: string
  logger: VnPluginLogger
}

export interface VnPluginModule {
  setup?: (context: VnPluginContext) => void | Promise<void>
  dispose?: () => void | Promise<void>
}

export interface VnPluginDescriptor extends VnPluginManifest {
  module?: VnPluginModule | { default?: VnPluginModule }
  loader?: () => Promise<VnPluginModule | { default?: VnPluginModule }> | VnPluginModule | { default?: VnPluginModule }
}

export interface VnPluginRecord {
  manifest: VnPluginManifest
  module: VnPluginModule
  active: boolean
}
