import type { PlayerUnlockState, UnlockKind } from '../types/extras.d.ts'

const UNLOCK_KINDS: UnlockKind[] = ['gallery', 'music', 'replay']

export function getDefaultPlayerUnlocks(): PlayerUnlockState {
  return { gallery: [], music: [], replay: [] }
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0)))
}

export function normalizePlayerUnlocks(value: unknown): PlayerUnlockState {
  const source = (value && typeof value === 'object') ? value as Partial<PlayerUnlockState> : {}
  return {
    gallery: uniqueStrings(source.gallery),
    music: uniqueStrings(source.music),
    replay: uniqueStrings(source.replay),
  }
}

export class PlayerUnlocks {
  readonly gameId: string

  constructor(gameId: string) {
    this.gameId = gameId
  }

  get storageKey(): string {
    return `vn:${this.gameId}:player:unlocks`
  }

  load(): PlayerUnlockState {
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (raw !== null) return normalizePlayerUnlocks(JSON.parse(raw))
    } catch {
      // Unlocks are convenience state; malformed or unavailable storage is non-fatal.
    }
    return getDefaultPlayerUnlocks()
  }

  save(next: PlayerUnlockState): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(normalizePlayerUnlocks(next)))
    } catch {
      // Non-fatal: unlocks can be earned again during play.
    }
  }

  unlock(kind: UnlockKind, id: string): PlayerUnlockState {
    const next = this.load()
    if (!UNLOCK_KINDS.includes(kind) || id.length === 0) return next
    if (!next[kind].includes(id)) {
      next[kind] = [...next[kind], id]
      this.save(next)
    }
    return next
  }

  reset(): PlayerUnlockState {
    const next = getDefaultPlayerUnlocks()
    this.save(next)
    return next
  }
}
