export type StageAdvanceAction = 'ignore' | 'reveal' | 'advance'

/**
 * Resolve what a stage-level player advance input should do.
 *
 * @param hasChoices Whether choices are currently visible.
 * @param isTyping Whether the active dialog is still revealing text.
 * @returns The stage action for the input.
 * @sideEffects None.
 */
export function getStageAdvanceAction(hasChoices: boolean, isTyping: boolean): StageAdvanceAction {
  if (hasChoices) return 'ignore'
  return isTyping ? 'reveal' : 'advance'
}

/**
 * Check whether a keyboard event key is accepted as dialog advance input.
 *
 * @param key KeyboardEvent.key value to test.
 * @returns True when the key advances visual novel dialog.
 * @sideEffects None.
 */
export function isAcceptedAdvanceKey(key: string): boolean {
  return key === ' ' || key === 'Enter' || key === 'ArrowRight'
}
