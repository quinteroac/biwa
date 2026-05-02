import { describe, expect, it } from 'bun:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { VnCharacter } from '../VnCharacter.tsx'

describe('VnCharacter', () => {
  it('renders an explicit fallback for unsupported animation renderers', () => {
    const html = renderToString(createElement(VnCharacter, {
      id: 'antagonist',
      charData: {
        displayName: 'Antagonist',
        animation: {
          type: 'spine',
        },
      },
      position: 'center',
      sheet: 'Main',
      animation: 'neutral',
      exiting: false,
      onExited: () => {},
    }))

    expect(html).toContain('vn-character-renderer-fallback')
    expect(html).toContain('Unsupported character renderer:')
    expect(html).toContain('spine')
  })

  it('applies scale and offset from character data to wrapper styles', () => {
    const html = renderToString(createElement(VnCharacter, {
      id: 'kai',
      charData: {
        displayName: 'Kai',
        scale: 1.2,
        offset: { x: 12, y: -8 },
        animation: {
          type: 'spritesheet-library',
          defaultStateSheet: 'Main',
          defaultAnimationSheet: 'Main',
          defaultState: 'neutral',
          defaultAction: '',
          states: {},
          animationSheets: {},
        },
      },
      position: 'center',
      sheet: 'Main',
      animation: 'neutral',
      exiting: false,
      onExited: () => {},
    }))

    expect(html).toContain('calc(50% + 12px)')
    expect(html).toContain('scale(1.2)')
  })

  it('applies scale and offset props over character data defaults', () => {
    const html = renderToString(createElement(VnCharacter, {
      id: 'kai',
      charData: {
        displayName: 'Kai',
        scale: 1.2,
        offset: { x: 12, y: -8 },
        animation: {
          type: 'spritesheet-library',
          defaultStateSheet: 'Main',
          defaultAnimationSheet: 'Main',
          defaultState: 'neutral',
          defaultAction: '',
          states: {},
          animationSheets: {},
        },
      },
      position: 'center',
      sheet: 'Main',
      animation: 'neutral',
      scale: 0.2,
      offset: { x: -24, y: 16 },
      exiting: false,
      onExited: () => {},
    }))

    expect(html).toContain('calc(50% + -24px)')
    expect(html).toContain('translateY(36px) scale(0.2)')
  })
})
