export interface PlayerPreferencesState {
  textSpeedMs: number
  autoBaseDelayMs: number
  autoPerCharacterDelayMs: number
  autoMode: boolean
  skipMode: boolean
  skipReadOnly: boolean
  textScale: number
  highContrast: boolean
  reduceMotion: boolean
}

export type PlayerPreferencesPatch = Partial<PlayerPreferencesState>

const DEFAULT_PREFERENCES: PlayerPreferencesState = {
  textSpeedMs: 30,
  autoBaseDelayMs: 900,
  autoPerCharacterDelayMs: 18,
  autoMode: false,
  skipMode: false,
  skipReadOnly: true,
  textScale: 1,
  highContrast: false,
  reduceMotion: false,
}

export function getDefaultPlayerPreferences(): PlayerPreferencesState {
  return { ...DEFAULT_PREFERENCES }
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function normalizePreferences(value: unknown): PlayerPreferencesState {
  const source = (value && typeof value === 'object') ? value as Partial<PlayerPreferencesState> : {}
  return {
    textSpeedMs: clampNumber(source.textSpeedMs, DEFAULT_PREFERENCES.textSpeedMs, 0, 120),
    autoBaseDelayMs: clampNumber(source.autoBaseDelayMs, DEFAULT_PREFERENCES.autoBaseDelayMs, 0, 10000),
    autoPerCharacterDelayMs: clampNumber(source.autoPerCharacterDelayMs, DEFAULT_PREFERENCES.autoPerCharacterDelayMs, 0, 250),
    autoMode: readBoolean(source.autoMode, DEFAULT_PREFERENCES.autoMode),
    skipMode: readBoolean(source.skipMode, DEFAULT_PREFERENCES.skipMode),
    skipReadOnly: readBoolean(source.skipReadOnly, DEFAULT_PREFERENCES.skipReadOnly),
    textScale: clampNumber(source.textScale, DEFAULT_PREFERENCES.textScale, 0.8, 1.6),
    highContrast: readBoolean(source.highContrast, DEFAULT_PREFERENCES.highContrast),
    reduceMotion: readBoolean(source.reduceMotion, DEFAULT_PREFERENCES.reduceMotion),
  }
}

function readLegacyBoolean(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return raw === 'true'
  } catch {
    return fallback
  }
}

export class PlayerPreferences {
  readonly gameId: string

  constructor(gameId: string) {
    this.gameId = gameId
  }

  get storageKey(): string {
    return `vn:${this.gameId}:player:preferences`
  }

  load(): PlayerPreferencesState {
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (raw !== null) return normalizePreferences(JSON.parse(raw))
    } catch {
      // Ignore malformed or unavailable storage and fall back to defaults.
    }

    const legacy = getDefaultPlayerPreferences()
    legacy.autoMode = readLegacyBoolean(`vn:${this.gameId}:player:auto`, legacy.autoMode)
    legacy.skipMode = readLegacyBoolean(`vn:${this.gameId}:player:skip`, legacy.skipMode)
    legacy.skipReadOnly = readLegacyBoolean(`vn:${this.gameId}:player:skip-read-only`, legacy.skipReadOnly)
    return legacy
  }

  save(next: PlayerPreferencesState): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(normalizePreferences(next)))
    } catch {
      // Non-fatal: preferences are convenience state.
    }
  }

  update(patch: PlayerPreferencesPatch): PlayerPreferencesState {
    const next = normalizePreferences({ ...this.load(), ...patch })
    this.save(next)
    return next
  }

  reset(): PlayerPreferencesState {
    const next = getDefaultPlayerPreferences()
    this.save(next)
    return next
  }
}
