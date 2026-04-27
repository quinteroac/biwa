type WatchHandler<T = unknown> = (value: T, prev: T) => void
type WildcardWatchHandler = (key: string, value: unknown, prev: unknown) => void
type StoredWatchHandler = (...args: unknown[]) => void

export class VariableStore {
  #store = new Map<string, unknown>()
  #watchers = new Map<string, Set<StoredWatchHandler>>()

  get<T = unknown>(key: string): T | undefined {
    return this.#store.get(key) as T | undefined
  }

  set(key: string, value: unknown): void {
    const prev = this.#store.get(key)
    if (prev === value) return
    this.#store.set(key, value)
    this.#watchers.get(key)?.forEach(h => h(value, prev))
    this.#watchers.get('*')?.forEach(h => h(key, value, prev))
  }

  watch<T = unknown>(key: string, handler: WatchHandler<T>): () => void {
    if (!this.#watchers.has(key)) this.#watchers.set(key, new Set())
    this.#watchers.get(key)!.add(handler as StoredWatchHandler)
    return () => this.#unwatch(key, handler as StoredWatchHandler)
  }

  watchAll(handler: WildcardWatchHandler): () => void {
    if (!this.#watchers.has('*')) this.#watchers.set('*', new Set())
    const h = (key: unknown, value: unknown, prev: unknown) =>
      handler(key as string, value, prev)
    this.#watchers.get('*')!.add(h)
    return () => this.#unwatch('*', h)
  }

  #unwatch(key: string, handler: StoredWatchHandler): void {
    this.#watchers.get(key)?.delete(handler)
  }

  snapshot(): Record<string, unknown> {
    return Object.fromEntries(this.#store)
  }

  restore(snapshot: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(snapshot)) {
      this.set(key, value)
    }
  }
}
