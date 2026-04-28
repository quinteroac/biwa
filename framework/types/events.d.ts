import type { TagCommand } from '../TagParser.ts'
import type { EngineState } from '../engine/GameEngine.ts'
import type { PlayerUnlockState, UnlockKind } from './extras.d.ts'
import type { BacklogEntry } from './save.d.ts'

export interface EngineDialogEvent {
  text: string
  speaker?: string
  nameColor: string | null
  canContinue: boolean
  advanceMode: 'none' | 'next' | 'choices'
  backlogIndex?: number
  seenBefore?: boolean
}

export interface EngineChoice {
  text: string
  index: number
}

export interface EngineChoicesEvent {
  choices: EngineChoice[]
}

export interface EngineSceneEvent extends TagCommand {
  type: 'scene'
  data?: Record<string, unknown>
}

export interface EngineCharacterEvent extends TagCommand {
  type: 'character'
}

export interface EngineAudioEvent extends TagCommand {
  type: 'bgm' | 'sfx' | 'ambience' | 'voice'
}

export interface EngineTransitionEvent {
  config: Record<string, unknown>
  done: () => void
}

export interface EngineMinigameStartEvent {
  id: string
  tag: Record<string, unknown>
}

export interface EngineMinigameEndEvent {
  id: string
  result: unknown
  error?: string
}

export interface EngineUnlocksEvent {
  unlocks: PlayerUnlockState
  kind: UnlockKind
  id: string
}

export interface EngineUnknownTagEvent {
  tag: TagCommand
}

export interface EngineEffectEvent {
  id?: string
  effect: Record<string, unknown>
}

export interface EndScreenEvent {
  title?: string
  message?: string
}

export interface EngineEventMap {
  'engine:state': EngineState
  'engine:dialog': EngineDialogEvent
  'engine:backlog': { entries: BacklogEntry[] }
  'engine:choices': EngineChoicesEvent
  'engine:scene': EngineSceneEvent
  'engine:character': EngineCharacterEvent
  'engine:bgm': EngineAudioEvent
  'engine:sfx': EngineAudioEvent
  'engine:ambience': EngineAudioEvent
  'engine:voice': EngineAudioEvent
  'engine:transition': EngineTransitionEvent
  'engine:minigame:start': EngineMinigameStartEvent
  'engine:minigame:end': EngineMinigameEndEvent
  'engine:unlocks': EngineUnlocksEvent
  'engine:tag:unknown': EngineUnknownTagEvent
  'engine:effect': EngineEffectEvent
  'engine:end': Record<string, never>
  end_screen: EndScreenEvent
}

export interface WildcardEvent<TEvents extends Record<string, unknown> = EngineEventMap> {
  event: keyof TEvents & string
  payload: TEvents[keyof TEvents]
}
