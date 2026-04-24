import { describe, expect, it } from 'bun:test'
import { getDialogCompletionAdvanceMode } from '../DialogReveal.ts'

describe('DialogReveal - US-002 delayed choices', () => {
  it('AC02: choices are not advanced from dialog completion callback', () => {
    expect(getDialogCompletionAdvanceMode('choices')).toBeNull()
  })

  it('AC03: non-choice completion modes also wait for explicit advance input', () => {
    expect(getDialogCompletionAdvanceMode('next')).toBeNull()
    expect(getDialogCompletionAdvanceMode('none')).toBeNull()
  })
})
