import type { DialogOptions } from './VnDialog.tsx'

export const DIALOG_TYPE_MS = 30

export interface DialogRevealPlan {
  characters: string[]
  initialRevealedLen: number
  isTyping: boolean
  completionAdvanceMode: DialogOptions['advanceMode'] | null
}

/**
 * Build the initial reveal plan for a dialog line.
 *
 * @param text Dialog text to reveal.
 * @param advanceMode How the line should advance after reveal.
 * @returns The character list, initial reveal length, typing state, and completion mode.
 * @sideEffects None.
 */
export function createDialogRevealPlan(text: string, advanceMode: DialogOptions['advanceMode']): DialogRevealPlan {
  const characters = [...text]
  return {
    characters,
    initialRevealedLen: 0,
    isTyping: characters.length > 0,
    completionAdvanceMode: getDialogCompletionAdvanceMode(advanceMode),
  }
}

/**
 * Resolve which advance mode should fire when typing completes.
 *
 * @param advanceMode Requested dialog advance mode.
 * @returns The mode to send to the stage, or `null` when player input must advance.
 * @sideEffects None.
 */
export function getDialogCompletionAdvanceMode(
  advanceMode: DialogOptions['advanceMode'],
): DialogOptions['advanceMode'] | null {
  return advanceMode === 'choices' ? null : advanceMode
}
