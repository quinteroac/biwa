import { describe, expect, it } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { VnBacklog } from '../VnBacklog.tsx'

describe('VnBacklog', () => {
  it('renders dialog entries in order with speakers', () => {
    const html = renderToStaticMarkup(createElement(VnBacklog, {
      isOpen: true,
      onClose: () => {},
      entries: [
        { index: 1, speaker: 'Kai', text: 'First line.', timestamp: 1 },
        { index: 2, speaker: 'Sara', text: 'Second line.', timestamp: 2 },
      ],
    }))

    expect(html.indexOf('First line.')).toBeLessThan(html.indexOf('Second line.'))
    expect(html).toContain('Kai')
    expect(html).toContain('Sara')
  })

  it('renders nothing while closed', () => {
    const html = renderToStaticMarkup(createElement(VnBacklog, {
      isOpen: false,
      onClose: () => {},
      entries: [],
    }))

    expect(html).toBe('')
  })
})
