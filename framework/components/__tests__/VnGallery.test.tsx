import { describe, expect, it } from 'bun:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { VnGallery } from '../VnGallery.tsx'

describe('VnGallery', () => {
  it('renders unlocked thumbnails and locked placeholders', () => {
    const html = renderToString(createElement(VnGallery, {
      isOpen: true,
      items: [
        { id: 'cg_001', title: 'Cafe CG', image: 'gallery/cafe.png', thumbnail: 'gallery/cafe_thumb.png' },
        { id: 'cg_002', title: 'Secret CG', image: 'gallery/secret.png' },
      ],
      unlockedIds: ['cg_001'],
      onClose: () => {},
    }))

    expect(html).toContain('CG Gallery')
    expect(html).toContain('./assets/gallery/cafe_thumb.png')
    expect(html).toContain('Locked')
  })

  it('renders nothing while closed', () => {
    const html = renderToString(createElement(VnGallery, {
      isOpen: false,
      items: [],
      unlockedIds: [],
      onClose: () => {},
    }))

    expect(html).toBe('')
  })
})
