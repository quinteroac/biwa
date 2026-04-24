import { describe, expect, it } from 'bun:test'
import {
  DIALOG_TYPE_MS,
  createDialogRevealPlan,
  getDialogCompletionAdvanceMode,
} from '../DialogReveal.ts'

describe('DialogReveal - US-001 choice-preface dialog', () => {
  it('AC01: choices advance mode starts hidden instead of fully revealed', () => {
    const plan = createDialogRevealPlan('Choose carefully.', 'choices')

    expect(plan.initialRevealedLen).toBe(0)
    expect(plan.characters.join('')).toBe('Choose carefully.')
    expect(plan.isTyping).toBe(true)
  })

  it('AC02: choices dialog uses the normal typing cadence', () => {
    expect(DIALOG_TYPE_MS).toBe(30)
    expect(createDialogRevealPlan('Normal line.', 'none').isTyping).toBe(true)
    expect(createDialogRevealPlan('Choice line.', 'choices').isTyping).toBe(true)
  })

  it('AC03: choices completion requires a separate player advance', () => {
    expect(getDialogCompletionAdvanceMode('choices')).toBeNull()
  })

  it('AC04: non-choice completion modes also require player input', () => {
    expect(getDialogCompletionAdvanceMode('none')).toBeNull()
    expect(getDialogCompletionAdvanceMode('next')).toBeNull()
  })
})
