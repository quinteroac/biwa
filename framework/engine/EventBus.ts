type Handler<T = unknown> = (payload: T) => void

export class EventBus {
  #listeners = new Map<string, Set<Handler>>()

  on<T = unknown>(event: string, handler: Handler<T>): () => void {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set())
    this.#listeners.get(event)!.add(handler as Handler)
    return () => this.off(event, handler as Handler)
  }

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

  emit(event: string, payload?: unknown): void {
    this.#listeners.get(event)?.forEach(h => h(payload))
    if (event !== '*') {
      this.#listeners.get('*')?.forEach(h => h({ event, payload }))
    }
  }
}
