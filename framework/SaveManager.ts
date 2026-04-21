import type { GameSaveState, SaveData, SaveSlot, SlotInfo } from './types/save.d.ts'

type MigrationFn = (oldData: unknown) => GameSaveState

interface SaveManagerOptions {
  gameId: string
  slots?: number
  autoSave?: boolean
}

export class SaveManager {
  static readonly CURRENT_VERSION = 2

  #gameId: string
  #slots: number
  #autoSaveEnabled: boolean
  #migrations: Map<number, MigrationFn> = new Map()

  constructor({ gameId, slots = 5, autoSave = true }: SaveManagerOptions) {
    this.#gameId = gameId
    this.#slots = slots
    this.#autoSaveEnabled = autoSave
  }

  #key(slot: number | 'auto'): string {
    return `vn:${this.#gameId}:save:${slot}`
  }

  /**
   * Register a migration function that upgrades data from `fromVersion` to `fromVersion + 1`.
   * Called automatically by `load()` when stored data is at an older schema version.
   * @param fromVersion - The version the migration reads from.
   * @param fn - Function that accepts the old (unknown-shaped) save data and returns a `GameSaveState`.
   */
  registerMigration(fromVersion: number, fn: MigrationFn): void {
    this.#migrations.set(fromVersion, fn)
  }

  /**
   * Persist a typed game-state snapshot to localStorage.
   * @param slot - Numeric slot index or `'auto'` for the auto-save slot.
   * @param state - Fully typed `GameSaveState` payload (meta + game variables).
   * @returns void. Emits `console.warn` and swallows the error if localStorage is unavailable.
   */
  save(slot: number | 'auto', state: GameSaveState): void {
    const data: SaveData = {
      version: SaveManager.CURRENT_VERSION,
      timestamp: Date.now(),
      meta: state.meta,
      state: state.state,
    }
    try {
      localStorage.setItem(this.#key(slot), JSON.stringify(data))
    } catch (e) {
      console.warn('[SaveManager] Failed to save slot', slot, e)
    }
  }

  /**
   * Load a previously persisted save from localStorage, applying schema migrations if needed.
   * @param slot - Slot to load.
   * @returns A `SaveSlot` whose `state` field is typed as `GameSaveState`, or `null` if
   *   the slot is empty, the stored JSON is unparseable, no migration is registered for an
   *   old version, or localStorage is unavailable.
   */
  load(slot: number | 'auto'): SaveSlot | null {
    try {
      const raw = localStorage.getItem(this.#key(slot))
      if (!raw) return null
      const parsed = JSON.parse(raw) as SaveData
      const { version: storedVersion, timestamp } = parsed

      if (storedVersion === SaveManager.CURRENT_VERSION) {
        return {
          version: storedVersion,
          timestamp,
          state: { meta: parsed.meta, state: parsed.state },
        }
      }

      let v = storedVersion
      let current: unknown = parsed
      while (v < SaveManager.CURRENT_VERSION) {
        const migrate = this.#migrations.get(v)
        if (!migrate) {
          console.warn(`[SaveManager] No migration registered for version ${v} → ${v + 1}. Cannot load slot.`)
          return null
        }
        current = migrate(current)
        v++
      }

      return {
        version: SaveManager.CURRENT_VERSION,
        timestamp,
        state: current as GameSaveState,
      }
    } catch {
      return null
    }
  }

  /**
   * Persist to the auto-save slot if auto-save is enabled.
   * @param state - Fully typed `GameSaveState` payload.
   */
  autoSave(state: GameSaveState): void {
    if (!this.#autoSaveEnabled) return
    this.save('auto', state)
  }

  /**
   * List all occupied save slots.
   * @returns Array of `SlotInfo` for every slot that contains data, ordered with
   *   `'auto'` first followed by numeric slots in ascending order. Empty slots are omitted.
   */
  listSlots(): SlotInfo[] {
    const result: SlotInfo[] = []
    const slotIds: (number | 'auto')[] = ['auto', ...Array.from({ length: this.#slots }, (_, i) => i + 1)]
    for (const slot of slotIds) {
      const loaded = this.load(slot)
      if (loaded) {
        result.push({
          slot,
          meta: { ...loaded.state.meta, timestamp: loaded.timestamp },
          state: loaded.state.state,
        })
      }
    }
    return result
  }

  /**
   * Remove a save from localStorage. Safe to call on an already-empty slot.
   * @param slot - Slot to delete.
   */
  deleteSlot(slot: number | 'auto'): void {
    localStorage.removeItem(this.#key(slot))
  }

  /**
   * @deprecated Use `deleteSlot(slot)` instead.
   * Remove a save from localStorage.
   * @param slot - Slot to delete.
   */
  delete(slot: number | 'auto'): void {
    console.warn('[SaveManager] delete() is deprecated — use deleteSlot() instead.')
    this.deleteSlot(slot)
  }
}
