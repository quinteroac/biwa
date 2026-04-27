export type UnlockKind = 'gallery' | 'music' | 'replay'

export type PlayerUnlockState = Record<UnlockKind, string[]>

export interface GalleryItem {
  id: string
  title?: string
  image: string
  thumbnail?: string
  description?: string
}

export interface MusicRoomTrack {
  id: string
  title?: string
  file?: string
  description?: string
  loop?: boolean
  volume?: number
}

export interface ReplayScene {
  id: string
  title?: string
  sceneId?: string
  storyPath?: string
  thumbnail?: string
  description?: string
}
