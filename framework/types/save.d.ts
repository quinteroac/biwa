export interface SaveMeta {
  displayName: string
  sceneName: string
  playtime: number
}

/** Typed payload passed to `SaveManager.save()`. */
export interface GameSaveState {
  meta: SaveMeta
  /** Serialisable key-value game variables. */
  state: Record<string, unknown>
}

/** Full serialised structure written to localStorage. */
export interface SaveData {
  version: number
  timestamp: number
  meta: SaveMeta
  state: Record<string, unknown>
}

/** Typed object returned by `SaveManager.load()`. */
export interface SaveSlot {
  version: number
  timestamp: number
  /** Fully typed game payload with `meta` and `state` fields. */
  state: GameSaveState
}

export interface SlotInfo {
  slot: number | 'auto'
  data: SaveSlot
}
