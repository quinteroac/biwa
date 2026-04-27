import type { EventBus } from '../engine/EventBus.ts'
import type { GameEngine } from '../engine/GameEngine.ts'
import { defaultRendererRegistry } from '../renderers/RendererRegistry.ts'
import type { EngineEventMap } from '../types/events.d.ts'
import type {
  VnPluginContext,
  VnPluginDescriptor,
  VnPluginManifest,
  VnPluginModule,
  VnPluginRecord,
} from '../types/plugins.d.ts'

const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9-]*$/
const KNOWN_CAPABILITIES = new Set(['renderer', 'stage', 'overlay', 'engine-event', 'asset-loader'])

export class PluginValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PluginValidationError'
  }
}

export class PluginRegistry {
  #records = new Map<string, VnPluginRecord>()

  register(manifest: VnPluginManifest, module: VnPluginModule): VnPluginRecord {
    validatePluginManifest(manifest)
    if (this.#records.has(manifest.id)) {
      throw new PluginValidationError(`Plugin "${manifest.id}" is already registered.`)
    }
    const record: VnPluginRecord = { manifest, module, active: false }
    this.#records.set(manifest.id, record)
    return record
  }

  get(id: string): VnPluginRecord | undefined {
    return this.#records.get(id)
  }

  list(): VnPluginRecord[] {
    return Array.from(this.#records.values())
  }

  async setupAll(context: VnPluginContext): Promise<void> {
    for (const record of this.#records.values()) {
      if (record.active) continue
      await record.module.setup?.(context)
      record.active = true
    }
  }

  async disposeAll(): Promise<void> {
    for (const record of Array.from(this.#records.values()).reverse()) {
      if (!record.active) continue
      await record.module.dispose?.()
      record.active = false
    }
  }
}

export async function loadPluginDescriptor(descriptor: VnPluginDescriptor): Promise<{ manifest: VnPluginManifest; module: VnPluginModule }> {
  validatePluginManifest(descriptor)
  const loader = descriptor.loader ?? descriptor.module
  if (!loader && descriptor.entry) {
    throw new PluginValidationError(`Plugin "${descriptor.id}" declares entry "${descriptor.entry}" but no runtime loader.`)
  }
  const loaded = typeof loader === 'function' ? await loader() : loader
  const module = normalizePluginModule(loaded)
  return { manifest: descriptor, module }
}

function normalizePluginModule(value: unknown): VnPluginModule {
  const source = value && typeof value === 'object' && 'default' in value
    ? (value as { default?: unknown }).default
    : value
  if (!source || typeof source !== 'object') {
    throw new PluginValidationError('Plugin module must export an object.')
  }
  const module = source as VnPluginModule
  if (module.setup !== undefined && typeof module.setup !== 'function') {
    throw new PluginValidationError('Plugin module setup must be a function.')
  }
  if (module.dispose !== undefined && typeof module.dispose !== 'function') {
    throw new PluginValidationError('Plugin module dispose must be a function.')
  }
  return module
}

export function validatePluginManifest(manifest: VnPluginManifest): void {
  if (!manifest || typeof manifest !== 'object') throw new PluginValidationError('Plugin manifest must be an object.')
  if (!PLUGIN_ID_RE.test(manifest.id)) throw new PluginValidationError('Plugin id must use lowercase letters, numbers and hyphens.')
  if (typeof manifest.name !== 'string' || manifest.name.length === 0) throw new PluginValidationError(`Plugin "${manifest.id}" is missing name.`)
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) throw new PluginValidationError(`Plugin "${manifest.id}" is missing version.`)
  if (manifest.type !== 'plugin') throw new PluginValidationError(`Plugin "${manifest.id}" must use type "plugin".`)
  if (!Array.isArray(manifest.capabilities)) throw new PluginValidationError(`Plugin "${manifest.id}" capabilities must be an array.`)
  for (const capability of manifest.capabilities) {
    if (!KNOWN_CAPABILITIES.has(capability)) {
      throw new PluginValidationError(`Plugin "${manifest.id}" declares unknown capability "${capability}".`)
    }
  }
  if (manifest.renderers !== undefined && !manifest.capabilities.includes('renderer')) {
    throw new PluginValidationError(`Plugin "${manifest.id}" declares renderers without the "renderer" capability.`)
  }
  if (manifest.renderers) {
    for (const [kind, values] of Object.entries(manifest.renderers)) {
      if (!['background', 'character', 'transition', 'overlay', 'extras'].includes(kind)) {
        throw new PluginValidationError(`Plugin "${manifest.id}" declares unknown renderer kind "${kind}".`)
      }
      if (!Array.isArray(values) || values.some(value => typeof value !== 'string' || value.length === 0)) {
        throw new PluginValidationError(`Plugin "${manifest.id}" renderer declarations must be non-empty string arrays.`)
      }
    }
  }
}

export function createPluginContext(engine: GameEngine, bus: EventBus<EngineEventMap>, assetBase = './assets/'): VnPluginContext {
  return {
    gameId: engine.id,
    engine,
    eventBus: bus,
    rendererRegistry: defaultRendererRegistry,
    assetBase,
    logger: {
      info: (message, ...args) => console.info(`[plugin] ${message}`, ...args),
      warn: (message, ...args) => console.warn(`[plugin] ${message}`, ...args),
      error: (message, ...args) => console.error(`[plugin] ${message}`, ...args),
    },
  }
}
