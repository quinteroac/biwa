import { describe, expect, it } from 'bun:test'
import { getAutoDelayMs, getAutoModeAction, getSkipModeAction } from '../VnPlayerModes.ts'

describe('VnPlayerModes', () => {
  it('auto mode advances only after dialog reveal completes and no blocker is active', () => {
    expect(getAutoModeAction({ hasDialog: true, hasChoices: false, hasBlockingOverlay: false, isTyping: false })).toBe('advance')
    expect(getAutoModeAction({ hasDialog: true, hasChoices: false, hasBlockingOverlay: false, isTyping: true })).toBe('idle')
    expect(getAutoModeAction({ hasDialog: true, hasChoices: true, hasBlockingOverlay: false, isTyping: false })).toBe('idle')
    expect(getAutoModeAction({ hasDialog: true, hasChoices: false, hasBlockingOverlay: true, isTyping: false })).toBe('idle')
  })

  it('skip mode reveals typing text and stops on unseen lines in read-only mode', () => {
    expect(getSkipModeAction({ hasDialog: true, hasChoices: false, hasBlockingOverlay: false, isTyping: true, dialogSeenBefore: true }, true)).toBe('reveal')
    expect(getSkipModeAction({ hasDialog: true, hasChoices: false, hasBlockingOverlay: false, isTyping: false, dialogSeenBefore: true }, true)).toBe('advance')
    expect(getSkipModeAction({ hasDialog: true, hasChoices: false, hasBlockingOverlay: false, isTyping: false, dialogSeenBefore: false }, true)).toBe('stop-skip')
    expect(getSkipModeAction({ hasDialog: true, hasChoices: false, hasBlockingOverlay: false, isTyping: false, dialogSeenBefore: false }, false)).toBe('advance')
  })

  it('calculates auto delay from base and line length', () => {
    expect(getAutoDelayMs('abcd', 100, 10)).toBe(140)
  })
})
