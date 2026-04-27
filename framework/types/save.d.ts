export interface SaveMeta {
  displayName: string
  sceneName: string
  playtime: number
  thumbnail?: string
}

export interface SavedSceneState {
  id: string
  variant?: string
}

export interface SavedCharacterState {
  id: string
  position: string
  expression: string
  exiting?: boolean
}

export interface SavedAudioState {
  bgm?: Record<string, unknown>
  ambience?: Record<string, unknown>
  voice?: Record<string, unknown>
}

export interface SavedVisualState {
  scene?: SavedSceneState
  characters: SavedCharacterState[]
  audio: SavedAudioState
  locale: string
}

/** Typed payload passed to `SaveManager.save()`. */
export interface GameSaveState {
  meta: SaveMeta
  /** Serialisable key-value game variables. */
  state: Record<string, unknown>
  /** Scene, visible characters, persistent audio and locale at save time. */
  visual?: SavedVisualState
}

/** Full serialised structure written to localStorage. */
export interface SaveData {
  version: number
  gameId?: string
  gameVersion?: string
  timestamp: number
  meta: SaveMeta
  state: Record<string, unknown>
  visual?: SavedVisualState
}

/** Typed object returned by `SaveManager.load()`. */
export interface SaveSlot {
  version: number
  gameId?: string
  gameVersion?: string
  timestamp: number
  /** Fully typed game payload with `meta` and `state` fields. */
  state: GameSaveState
}

/** A single entry returned by `SaveManager.listSlots()`. */
export interface SlotInfo {
  slot: number | 'auto'
  /** Save metadata including the timestamp of when the slot was saved. */
  meta: SaveMeta & { timestamp: number }
  /** Serialisable key-value game variables for this slot. */
  state: Record<string, unknown>
}
