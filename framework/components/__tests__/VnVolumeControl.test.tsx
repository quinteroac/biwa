import { describe, it, expect } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { VnVolumeControl } from '../VnVolumeControl.tsx'
import type { AudioChannel } from '../../engine/VolumeController.ts'
import type { VnVolumeControlProps } from '../VnVolumeControl.tsx'

// --- helpers -------------------------------------------------------------

type VCProps = VnVolumeControlProps

function render(overrides: Partial<VCProps> = {}): string {
  return renderToString(
    createElement(VnVolumeControl, {
      onVolumeChange: () => {},
      ...overrides,
    }),
  )
}

// --- tests ---------------------------------------------------------------

describe('VnVolumeControl', () => {
  // US-003-AC01: VnVolumeControl component exists and is a named function export
  it('AC01: VnVolumeControl is a named function export', () => {
    expect(typeof VnVolumeControl).toBe('function')
  })

  it('AC01: mounts with required props without throwing', () => {
    expect(() =>
      render({ onVolumeChange: () => {} }),
    ).not.toThrow()
  })

  // US-003-AC02: renders a slider for each channel: master, BGM, ambience, SFX, voice
  it('AC02: renders five range inputs (one per channel)', () => {
    const html = render()
    const rangeInputs = html.match(/type="range"/g)
    expect(rangeInputs).not.toBeNull()
    expect(rangeInputs!.length).toBe(5)
  })

  it('AC02: renders a slider for master channel', () => {
    const html = render()
    expect(html).toContain('Master')
    expect(html).toContain('aria-label="Master volume"')
  })

  it('AC02: renders a slider for BGM channel', () => {
    const html = render()
    expect(html).toContain('BGM')
    expect(html).toContain('aria-label="BGM volume"')
  })

  it('AC02: renders a slider for Ambience channel', () => {
    const html = render()
    expect(html).toContain('Ambience')
    expect(html).toContain('aria-label="Ambience volume"')
  })

  it('AC02: renders a slider for SFX channel', () => {
    const html = render()
    expect(html).toContain('SFX')
    expect(html).toContain('aria-label="SFX volume"')
  })

  it('AC02: renders a slider for Voice channel', () => {
    const html = render()
    expect(html).toContain('Voice')
    expect(html).toContain('aria-label="Voice volume"')
  })

  // US-003-AC03: each slider shows channel label and current volume percentage
  it('AC03: each slider has a visible channel label', () => {
    const html = render()
    expect(html).toContain('Master')
    expect(html).toContain('BGM')
    expect(html).toContain('Ambience')
    expect(html).toContain('SFX')
    expect(html).toContain('Voice')
  })

  it('AC03: each slider shows current volume percentage (defaults to 100%)', () => {
    const html = render()
    // All channels default to 1.0 → 100%. Check for explicit "100%" in display spans.
    // We verify the aria-valuenow is 100 for each slider (5 sliders × aria-valuenow=100).
    const valuenowMatches = html.match(/aria-valuenow="100"/g)
    expect(valuenowMatches).not.toBeNull()
    expect(valuenowMatches!.length).toBe(5)
  })

  it('AC03: shows correct percentage for custom volumes', () => {
    const volumes: Record<AudioChannel, number> = {
      master: 0.8,
      bgm: 0.5,
      ambience: 0.25,
      sfx: 1.0,
      voice: 0.0,
    }
    const html = render({ volumes, onVolumeChange: () => {} })
    expect(html).toContain('80%')
    expect(html).toContain('50%')
    expect(html).toContain('25%')
    expect(html).toContain('100%')
    expect(html).toContain('0%')
  })

  // US-003-AC04: all sliders use CSS custom properties for styling
  it('AC04: labels use CSS custom properties for color', () => {
    const html = render()
    expect(html).toContain('var(--vn-vol-label-color')
  })

  it('AC04: labels use CSS custom properties for font', () => {
    const html = render()
    expect(html).toContain('var(--vn-vol-label-font')
  })

  it('AC04: value text uses CSS custom properties for color', () => {
    const html = render()
    expect(html).toContain('var(--vn-vol-value-color')
  })

  it('AC04: slider track uses CSS custom properties', () => {
    const html = render()
    expect(html).toContain('var(--vn-vol-track-fill')
    expect(html).toContain('var(--vn-vol-track-bg')
  })

  it('AC04: container uses CSS custom properties for background', () => {
    const html = render()
    expect(html).toContain('var(--vn-vol-container-bg')
  })

  it('AC04: no hardcoded color literals in styles', () => {
    const html = render()
    // Ensure no direct hex color values (like #c084fc, #f8f8f8) appear
    // CSS variable references contain "var(--" so we check for bare hex codes
    // that aren't inside var() fallbacks
    const bareHexPattern = /#[0-9a-fA-F]{3,8}(?![^"]*"\))/g
    const matches = html.match(bareHexPattern)
    expect(matches).toBeNull()
  })

  // US-003-AC05: component accepts onVolumeChange callback prop
  it('AC05: onVolumeChange is a required prop', () => {
    const props: VnVolumeControlProps = {
      onVolumeChange: (_ch: AudioChannel, _vol: number) => {},
    }
    expect(typeof props.onVolumeChange).toBe('function')
  })

  it('AC05: component mounts with onVolumeChange callback', () => {
    const calls: Array<{ channel: AudioChannel; volume: number }> = []
    const html = render({
      onVolumeChange: (channel, volume) => {
        calls.push({ channel, volume })
      },
    })
    // SSR render should succeed; callback presence verified by type
    expect(html).toBeTruthy()
    expect(calls.length).toBe(0) // no user interaction during SSR
  })

  it('AC05: volumes prop accepts partial volume overrides', () => {
    const html = render({
      volumes: { master: 0.5 },
      onVolumeChange: () => {},
    })
    expect(html).toBeTruthy()
  })
})
