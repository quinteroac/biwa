import type { GameSaveState, SaveData, SlotInfo } from './types/save.d.ts'

interface SaveManagerOptions {
  gameId: string
  slots?: number
  autoSave?: boolean
}

export class SaveManager {
  #gameId: string
  #slots: number
  #autoSaveEnabled: boolean

  constructor({ gameId, slots = 5, autoSave = true }: SaveManagerOptions) {
    this.#gameId = gameId
    this.#slots = slots
    this.#autoSaveEnabled = autoSave
  }

  #key(slot: number | 'auto'): string {
    return `vn:${this.#gameId}:save:${slot}`
  }

  /**
   * Persist a typed game-state snapshot to localStorage.
   * @param slot - Numeric slot index or `'auto'` for the auto-save slot.
   * @param state - Fully typed `GameSaveState` payload (meta + game variables).
   * @returns void. Emits `console.warn` and swallows the error if localStorage is unavailable.
   */
  save(slot: number | 'auto', state: GameSaveState): void {
    const data: SaveData = {
      version: 1,
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
   * Load a previously persisted save from localStorage.
   * @param slot - Slot to load.
   * @returns The `SaveData` object, or `null` if the slot is empty or unreadable.
   */
  load(slot: number | 'auto'): SaveData | null {
    try {
      const raw = localStorage.getItem(this.#key(slot))
      if (!raw) return null
      return JSON.parse(raw) as SaveData
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
