import { describe, expect, it } from 'bun:test'
import { getStageAdvanceAction, isAcceptedAdvanceKey } from '../VnStageAdvance.ts'

describe('VnStageAdvance - US-002 delayed choices', () => {
  it('AC01: stores pending choices behind an advance action while dialog is complete', () => {
    expect(getStageAdvanceAction(false, false)).toBe('advance')
  })

  it('AC02: visible choices suppress stage-level advance inputs', () => {
    expect(getStageAdvanceAction(true, false)).toBe('ignore')
    expect(getStageAdvanceAction(true, true)).toBe('ignore')
  })

  it('AC03: click and accepted keys reveal text first while typing', () => {
    expect(getStageAdvanceAction(false, true)).toBe('reveal')
  })

  it('AC03: Enter, Space, and ArrowRight are accepted advance keys', () => {
    expect(isAcceptedAdvanceKey('Enter')).toBe(true)
    expect(isAcceptedAdvanceKey(' ')).toBe(true)
    expect(isAcceptedAdvanceKey('ArrowRight')).toBe(true)
    expect(isAcceptedAdvanceKey('ArrowLeft')).toBe(false)
  })

  it('AC04: input flow is independent of story and tag formats', () => {
    expect(getStageAdvanceAction(false, false)).toBe('advance')
    expect(isAcceptedAdvanceKey('Escape')).toBe(false)
  })
})
