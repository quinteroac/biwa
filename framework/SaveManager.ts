interface SaveManagerOptions {
  gameId: string
  slots?: number
  autoSave?: boolean
}

interface SaveData {
  version: number
  timestamp: number
  state: unknown
}

interface SlotInfo {
  slot: number | 'auto'
  data: SaveData
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

  save(slot: number | 'auto', state: unknown): void {
    const data: SaveData = {
      version: 1,
      timestamp: Date.now(),
      state,
    }
    try {
      localStorage.setItem(this.#key(slot), JSON.stringify(data))
    } catch (e) {
      console.warn('[SaveManager] Failed to save slot', slot, e)
    }
  }

  load(slot: number | 'auto'): SaveData | null {
    try {
      const raw = localStorage.getItem(this.#key(slot))
      if (!raw) return null
      return JSON.parse(raw) as SaveData
    } catch {
      return null
    }
  }

  autoSave(state: unknown): void {
    if (!this.#autoSaveEnabled) return
    this.save('auto', state)
  }

  listSlots(): SlotInfo[] {
    const result: SlotInfo[] = []
    const slotIds: (number | 'auto')[] = ['auto', ...Array.from({ length: this.#slots }, (_, i) => i + 1)]
    for (const slot of slotIds) {
      const data = this.load(slot)
      if (data) result.push({ slot, data })
    }
    return result
  }

  delete(slot: number | 'auto'): void {
    localStorage.removeItem(this.#key(slot))
  }
}
