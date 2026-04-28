import { describe, expect, it } from 'bun:test'
import {
  overlayButtonStyle,
  overlayHeaderStyle,
  overlayInputStyle,
  overlayListRowStyle,
  overlayPanelStyle,
  overlaySurfaceStyle,
} from '../OverlayPrimitives.ts'

describe('OverlayPrimitives', () => {
  it('exports shared overlay tokens for prebuilt panels', () => {
    expect(overlaySurfaceStyle.background).toBe('rgba(0,0,0,0.72)')
    expect(overlayPanelStyle.borderRadius).toBe(0)
    expect(overlayHeaderStyle.borderBottom).toContain('rgba(255,255,255')
    expect(overlayButtonStyle.textTransform).toBe('uppercase')
    expect(overlayInputStyle.boxSizing).toBe('border-box')
    expect(overlayListRowStyle.minHeight).toBe(66)
  })
})
