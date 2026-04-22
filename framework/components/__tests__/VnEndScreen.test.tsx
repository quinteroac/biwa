import { describe, it, expect } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { VnEndScreen } from '../VnEndScreen.tsx'

describe('VnEndScreen – US-001-AC04', () => {
  it('AC04: renders without throwing', () => {
    expect(() => renderToString(createElement(VnEndScreen, {}))).not.toThrow()
  })

  it('AC04: renders with data-testid="vn-end-screen"', () => {
    const html = renderToString(createElement(VnEndScreen, {}))
    expect(html).toContain('data-testid="vn-end-screen"')
  })

  it('AC04: defaults title to "The End" when no title prop given', () => {
    const html = renderToString(createElement(VnEndScreen, {}))
    expect(html).toContain('The End')
  })

  it('AC04: renders provided title text', () => {
    const html = renderToString(createElement(VnEndScreen, { title: 'Fin' }))
    expect(html).toContain('Fin')
    expect(html).not.toContain('>The End<')
  })

  it('AC04: renders optional message when provided', () => {
    const html = renderToString(createElement(VnEndScreen, { title: 'The End', message: 'Thank you for playing.' }))
    expect(html).toContain('Thank you for playing.')
  })

  it('AC04: does not render message element when message is omitted', () => {
    const html = renderToString(createElement(VnEndScreen, { title: 'The End' }))
    expect(html).not.toContain('<p')
  })

  it('AC04: full-screen dark background applied (position fixed, inset 0, background #000)', () => {
    const html = renderToString(createElement(VnEndScreen, {}))
    expect(html).toContain('position:fixed')
    expect(html).toContain('#000')
  })

  it('AC04: renders an h1 element for the title', () => {
    const html = renderToString(createElement(VnEndScreen, { title: 'The End' }))
    expect(html).toMatch(/<h1[^>]*>/)
  })
})
