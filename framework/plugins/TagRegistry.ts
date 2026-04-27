import type { GameEngine } from '../engine/GameEngine.ts'
import type { EventBus } from '../engine/EventBus.ts'
import type { TagCommand } from '../TagParser.ts'
import type { EngineEventMap } from '../types/events.d.ts'

export const CORE_TAGS = new Set([
  'scene',
  'bgm',
  'sfx',
  'ambience',
  'voice',
  'character',
  'transition',
  'minigame',
  'end_screen',
  'save',
  'unlock',
  'unlock_gallery',
  'unlock_music',
  'unlock_replay',
  'speaker',
  'volume',
])

const TAG_NAME_RE = /^[a-z][a-z0-9_-]*$/

export interface TagHandlerContext {
  engine: GameEngine
  eventBus: EventBus<EngineEventMap>
}

export type TagHandler = (tag: TagCommand, context: TagHandlerContext) => void | Promise<void>

export interface TagRecord {
  name: string
  pluginId?: string
  description?: string
  handler: TagHandler
}

export class TagRegistry {
  #records = new Map<string, TagRecord>()

  register(
    name: string,
    handler: TagHandler,
    options: { pluginId?: string; description?: string } = {},
  ): TagRecord {
    if (!TAG_NAME_RE.test(name)) {
      throw new Error(`Tag "${name}" must use lowercase letters, numbers, underscores or hyphens, and start with a letter.`)
    }
    if (CORE_TAGS.has(name)) throw new Error(`Tag "${name}" is reserved by the framework.`)
    if (this.#records.has(name)) throw new Error(`Tag "${name}" is already registered.`)
    const record: TagRecord = {
      name,
      handler,
      ...(options.pluginId ? { pluginId: options.pluginId } : {}),
      ...(options.description ? { description: options.description } : {}),
    }
    this.#records.set(name, record)
    return record
  }

  get(name: string): TagRecord | undefined {
    return this.#records.get(name)
  }

  has(name: string): boolean {
    return this.#records.has(name)
  }

  list(): TagRecord[] {
    return Array.from(this.#records.values())
  }

  async dispatch(tag: TagCommand, context: TagHandlerContext): Promise<boolean> {
    const record = this.#records.get(tag.type)
    if (!record) return false
    await record.handler(tag, context)
    return true
  }

  clear(): void {
    this.#records.clear()
  }
}

export const defaultTagRegistry = new TagRegistry()
