export type PlayerInputAction =
  | 'advance'
  | 'backlog'
  | 'auto'
  | 'skip'
  | 'saveLoad'
  | 'settings'
  | 'gallery'
  | 'musicRoom'

export type PlayerInputMap = Record<PlayerInputAction, string[]>

export const DEFAULT_PLAYER_INPUT_MAP: PlayerInputMap = {
  advance: [' ', 'Enter', 'ArrowRight'],
  backlog: ['b', 'B'],
  auto: ['a', 'A'],
  skip: ['s', 'S'],
  saveLoad: ['Escape'],
  settings: ['m', 'M'],
  gallery: ['g', 'G'],
  musicRoom: ['r', 'R'],
}

const INPUT_PRIORITY: PlayerInputAction[] = [
  'saveLoad',
  'settings',
  'gallery',
  'musicRoom',
  'backlog',
  'auto',
  'skip',
  'advance',
]

export function mergePlayerInputMap(overrides?: Partial<PlayerInputMap>): PlayerInputMap {
  return {
    advance: overrides?.advance ?? DEFAULT_PLAYER_INPUT_MAP.advance,
    backlog: overrides?.backlog ?? DEFAULT_PLAYER_INPUT_MAP.backlog,
    auto: overrides?.auto ?? DEFAULT_PLAYER_INPUT_MAP.auto,
    skip: overrides?.skip ?? DEFAULT_PLAYER_INPUT_MAP.skip,
    saveLoad: overrides?.saveLoad ?? DEFAULT_PLAYER_INPUT_MAP.saveLoad,
    settings: overrides?.settings ?? DEFAULT_PLAYER_INPUT_MAP.settings,
    gallery: overrides?.gallery ?? DEFAULT_PLAYER_INPUT_MAP.gallery,
    musicRoom: overrides?.musicRoom ?? DEFAULT_PLAYER_INPUT_MAP.musicRoom,
  }
}

export function resolveKeyboardAction(key: string, inputMap: PlayerInputMap): PlayerInputAction | null {
  for (const action of INPUT_PRIORITY) {
    if (inputMap[action].includes(key)) return action
  }
  return null
}
