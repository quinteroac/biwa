import { describe, expect, it } from 'bun:test'
import { DEFAULT_PLAYER_INPUT_MAP, mergePlayerInputMap, resolveKeyboardAction } from '../VnInputMap.ts'

describe('VnInputMap', () => {
  it('resolves default keyboard actions by priority', () => {
    expect(resolveKeyboardAction('Enter', DEFAULT_PLAYER_INPUT_MAP)).toBe('advance')
    expect(resolveKeyboardAction('b', DEFAULT_PLAYER_INPUT_MAP)).toBe('backlog')
    expect(resolveKeyboardAction('a', DEFAULT_PLAYER_INPUT_MAP)).toBe('auto')
    expect(resolveKeyboardAction('s', DEFAULT_PLAYER_INPUT_MAP)).toBe('skip')
    expect(resolveKeyboardAction('Escape', DEFAULT_PLAYER_INPUT_MAP)).toBe('saveLoad')
    expect(resolveKeyboardAction('m', DEFAULT_PLAYER_INPUT_MAP)).toBe('settings')
  })

  it('merges host overrides without dropping unspecified defaults', () => {
    const inputMap = mergePlayerInputMap({ auto: ['F8'], advance: ['x'] })
    expect(resolveKeyboardAction('F8', inputMap)).toBe('auto')
    expect(resolveKeyboardAction('x', inputMap)).toBe('advance')
    expect(resolveKeyboardAction('Escape', inputMap)).toBe('saveLoad')
  })

  it('returns null for unmapped keys', () => {
    expect(resolveKeyboardAction('z', DEFAULT_PLAYER_INPUT_MAP)).toBe(null)
  })
})
