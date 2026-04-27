import { describe, expect, it } from 'bun:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { getDefaultPlayerPreferences } from '../../player/PlayerPreferences.ts'
import { VnSettings } from '../VnSettings.tsx'

describe('VnSettings', () => {
  it('renders player preference controls while open', () => {
    const html = renderToString(createElement(VnSettings, {
      isOpen: true,
      preferences: getDefaultPlayerPreferences(),
      onChange: () => {},
      onReset: () => {},
      onClose: () => {},
    }))

    expect(html).toContain('Player settings')
    expect(html).toContain('Text speed')
    expect(html).toContain('Auto delay')
    expect(html).toContain('Text size')
    expect(html).toContain('Read Only')
  })

  it('renders nothing while closed', () => {
    const html = renderToString(createElement(VnSettings, {
      isOpen: false,
      preferences: getDefaultPlayerPreferences(),
      onChange: () => {},
      onReset: () => {},
      onClose: () => {},
    }))

    expect(html).toBe('')
  })
})
