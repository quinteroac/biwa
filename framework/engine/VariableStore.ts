type WatchHandler<T = unknown> = (value: T, prev: T) => void
type WildcardWatchHandler = (key: string, value: unknown, prev: unknown) => void

export class VariableStore {
  #store = new Map<string, unknown>()
  #watchers = new Map<string, Set<(value: unknown, prev: unknown) => void>>()

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
    this.#watchers.get(key)!.add(handler as (v: unknown, p: unknown) => void)
    return () => this.#unwatch(key, handler as (v: unknown, p: unknown) => void)
  }

  watchAll(handler: WildcardWatchHandler): () => void {
    if (!this.#watchers.has('*')) this.#watchers.set('*', new Set())
    const h = (key: unknown, value: unknown, prev: unknown) =>
      handler(key as string, value, prev)
    this.#watchers.get('*')!.add(h as (v: unknown, p: unknown) => void)
    return () => this.#unwatch('*', h as (v: unknown, p: unknown) => void)
  }

  #unwatch(key: string, handler: (v: unknown, p: unknown) => void): void {
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
