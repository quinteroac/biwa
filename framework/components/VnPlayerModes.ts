export interface PlayerAdvanceModeState {
  hasDialog: boolean
  hasChoices: boolean
  hasBlockingOverlay: boolean
  isTyping: boolean
  dialogSeenBefore?: boolean | undefined
}

export type PlayerAdvanceModeAction = 'idle' | 'reveal' | 'advance' | 'stop-skip'

export function getAutoModeAction(state: PlayerAdvanceModeState): PlayerAdvanceModeAction {
  if (!state.hasDialog || state.hasChoices || state.hasBlockingOverlay) return 'idle'
  return state.isTyping ? 'idle' : 'advance'
}

export function getSkipModeAction(state: PlayerAdvanceModeState, readOnly: boolean): PlayerAdvanceModeAction {
  if (!state.hasDialog || state.hasChoices || state.hasBlockingOverlay) return 'idle'
  if (readOnly && state.dialogSeenBefore === false) return 'stop-skip'
  return state.isTyping ? 'reveal' : 'advance'
}

export function getAutoDelayMs(text: string, baseMs = 900, perCharacterMs = 18): number {
  return Math.max(0, baseMs + (text.length * perCharacterMs))
}
