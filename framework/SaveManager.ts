import type { GameSaveState, SaveData, SaveSlot, SlotInfo } from './types/save.d.ts'

const SCHEMA_VERSION = 1

type MigrationFn = (data: SaveData) => SaveData

interface SaveManagerOptions {
  gameId: string
  slots?: number
  autoSave?: boolean
}

export class SaveManager {
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
   * @param fn - Pure function that transforms the old `SaveData` shape into the new one.
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
      version: SCHEMA_VERSION,
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
   *   the slot is empty, the stored JSON is unparseable, or localStorage is unavailable.
   */
  load(slot: number | 'auto'): SaveSlot | null {
    try {
      const raw = localStorage.getItem(this.#key(slot))
      if (!raw) return null
      let data = JSON.parse(raw) as SaveData
      let v = data.version
      while (v < SCHEMA_VERSION) {
        const migrate = this.#migrations.get(v)
        if (migrate) data = migrate(data)
        v++
      }
      const gameState: GameSaveState = { meta: data.meta, state: data.state }
      return { version: data.version, timestamp: data.timestamp, state: gameState }
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
   * @returns Array of `SlotInfo` for every slot that contains data.
   */
  listSlots(): SlotInfo[] {
    const result: SlotInfo[] = []
    const slotIds: (number | 'auto')[] = ['auto', ...Array.from({ length: this.#slots }, (_, i) => i + 1)]
    for (const slot of slotIds) {
      const data = this.load(slot)
      if (data) result.push({ slot, data })
    }
    return result
  }

  /**
   * Remove a save from localStorage.
   * @param slot - Slot to delete.
   */
  delete(slot: number | 'auto'): void {
    localStorage.removeItem(this.#key(slot))
  }
}
