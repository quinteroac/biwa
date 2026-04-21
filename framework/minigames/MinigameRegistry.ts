import type { MinigameBase } from './MinigameBase.ts'

type MinigameLoader = (() => Promise<Record<string, unknown>>) | string

type MinigameConstructor = new () => MinigameBase

export class MinigameRegistry {
  #loaders = new Map<string, MinigameLoader>()
  #classes = new Map<string, MinigameConstructor>()

  register(id: string, loader: MinigameLoader): void {
    this.#loaders.set(id, loader)
  }

  async get(id: string): Promise<MinigameBase> {
    if (!this.#loaders.has(id)) {
      throw new Error(`[MinigameRegistry] Minigame "${id}" is not registered`)
    }

    if (!this.#classes.has(id)) {
      const loader = this.#loaders.get(id)!
      let mod: Record<string, unknown>
      if (typeof loader === 'function') {
        mod = await loader()
      } else {
        mod = await import(loader) as Record<string, unknown>
      }
      const Class = (mod['default'] ?? Object.values(mod).find(v => typeof v === 'function')) as MinigameConstructor | undefined
      if (!Class) throw new Error(`[MinigameRegistry] No class found in module for "${id}"`)
      this.#classes.set(id, Class)
    }

    const Class = this.#classes.get(id)!
    return new Class()
  }
}
