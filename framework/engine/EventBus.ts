type Handler<T = unknown> = (payload: T) => void
type EventMap = object
type WildcardPayload<TEvents extends EventMap> = {
  event: keyof TEvents & string
  payload: TEvents[keyof TEvents & string]
}

export class EventBus<TEvents extends EventMap = EventMap> {
  #listeners = new Map<string, Set<Handler>>()

  on<K extends keyof TEvents & string>(event: K, handler: Handler<TEvents[K]>): () => void
  on(event: '*', handler: Handler<WildcardPayload<TEvents>>): () => void
  on<T = unknown>(event: string, handler: Handler<T>): () => void
  on<T = unknown>(event: string, handler: Handler<T>): () => void {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set())
    this.#listeners.get(event)!.add(handler as Handler)
    return () => this.off(event, handler as Handler)
  }

  once<K extends keyof TEvents & string>(event: K, handler: Handler<TEvents[K]>): () => void
  once(event: '*', handler: Handler<WildcardPayload<TEvents>>): () => void
  once<T = unknown>(event: string, handler: Handler<T>): () => void
  once<T = unknown>(event: string, handler: Handler<T>): () => void {
    const wrapper = (payload: unknown) => {
      handler(payload as T)
      this.off(event, wrapper)
    }
    return this.on(event, wrapper)
  }

  off(event: string, handler: Handler): void {
    this.#listeners.get(event)?.delete(handler)
  }

  emit<K extends keyof TEvents & string>(event: K, payload: TEvents[K]): void
  emit(event: string, payload?: unknown): void
  emit(event: string, payload?: unknown): void {
    this.#listeners.get(event)?.forEach(h => h(payload))
    if (event !== '*') {
      this.#listeners.get('*')?.forEach(h => h({ event, payload }))
    }
  }
}
