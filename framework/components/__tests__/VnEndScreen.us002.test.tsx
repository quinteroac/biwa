import { describe, it, expect } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { VnEndScreen } from '../VnEndScreen.tsx'
import type { GameConfig } from '../../types/game-config.d.ts'

// --- AC01: GameConfig accepts endScreen field ----------------------------

describe('GameConfig – US-002-AC01: endScreen field', () => {
  it('AC01: GameConfig type accepts optional endScreen with title and message', () => {
    const config: GameConfig = {
      id:      'test-game',
      title:   'Test Game',
      version: '1.0.0',
      story:   { defaultLocale: 'en', locales: { en: 'story.json' } },
      endScreen: { title: 'Game Over', message: 'Thanks for playing!' },
    }
    expect(config.endScreen?.title).toBe('Game Over')
    expect(config.endScreen?.message).toBe('Thanks for playing!')
  })

  it('AC01: GameConfig type accepts endScreen with only title (message omitted)', () => {
    const config: GameConfig = {
      id:      'test-game',
      title:   'Test Game',
      version: '1.0.0',
      story:   { defaultLocale: 'en', locales: { en: 'story.json' } },
      endScreen: { title: 'Fin' },
    }
    expect(config.endScreen?.title).toBe('Fin')
    expect(config.endScreen?.message).toBeUndefined()
  })

  it('AC01: GameConfig type accepts endScreen omitted entirely', () => {
    const config: GameConfig = {
      id:      'test-game',
      title:   'Test Game',
      version: '1.0.0',
      story:   { defaultLocale: 'en', locales: { en: 'story.json' } },
    }
    expect(config.endScreen).toBeUndefined()
  })
})

// --- AC02: VnEndScreen renders config-sourced title as heading -----------

describe('VnEndScreen – US-002-AC02: displays config title', () => {
  it('AC02: renders config-supplied title in an h1 element', () => {
    const html = renderToString(createElement(VnEndScreen, { title: 'Chapter Closed' }))
    expect(html).toContain('Chapter Closed')
    expect(html).toMatch(/<h1[^>]*>/)
  })

  it('AC02: falls back to "The End" when title is not provided', () => {
    const html = renderToString(createElement(VnEndScreen, {}))
    expect(html).toContain('The End')
    expect(html).toMatch(/<h1[^>]*>/)
  })

  it('AC02: config title overrides default "The End"', () => {
    const config: GameConfig = {
      id: 'g', title: 'G', version: '1', story: { defaultLocale: 'en', locales: { en: 'x' } },
      endScreen: { title: 'Custom Title' },
    }
    const html = renderToString(createElement(VnEndScreen, { title: config.endScreen?.title }))
    expect(html).toContain('Custom Title')
    expect(html).not.toContain('>The End<')
  })
})

// --- AC03: VnEndScreen renders config message or omits the element -------

describe('VnEndScreen – US-002-AC03: config message present / absent', () => {
  it('AC03: renders config-supplied message as subtitle', () => {
    const config: GameConfig = {
      id: 'g', title: 'G', version: '1', story: { defaultLocale: 'en', locales: { en: 'x' } },
      endScreen: { title: 'The End', message: 'Your journey is complete.' },
    }
    const html = renderToString(
      createElement(VnEndScreen, { title: config.endScreen?.title, message: config.endScreen?.message }),
    )
    expect(html).toContain('Your journey is complete.')
    expect(html).toMatch(/<p[^>]*>/)
  })

  it('AC03: message element is absent when config.endScreen.message is omitted', () => {
    const config: GameConfig = {
      id: 'g', title: 'G', version: '1', story: { defaultLocale: 'en', locales: { en: 'x' } },
      endScreen: { title: 'The End' },
    }
    const html = renderToString(
      createElement(VnEndScreen, { title: config.endScreen?.title }),
    )
    expect(html).not.toContain('<p')
  })

  it('AC03: message element is absent when config.endScreen is omitted entirely', () => {
    const config: GameConfig = {
      id: 'g', title: 'G', version: '1', story: { defaultLocale: 'en', locales: { en: 'x' } },
    }
    const html = renderToString(
      createElement(VnEndScreen, { title: config.endScreen?.title }),
    )
    expect(html).not.toContain('<p')
    // Falls back to "The End" default
    expect(html).toContain('The End')
  })
})
