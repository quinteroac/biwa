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
          file: 'characters/antagonist/antagonist.skel',
          atlas: 'characters/antagonist/antagonist.atlas',
          expressions: { neutral: 'idle' },
        },
      },
      position: 'center',
      expression: 'neutral',
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
          type: 'sprites',
          sprites: { neutral: 'characters/kai/neutral.png' },
        },
      },
      position: 'center',
      expression: 'neutral',
      exiting: false,
      onExited: () => {},
    }))

    expect(html).toContain('calc(50% + 12px)')
    expect(html).toContain('scale(1.2)')
  })
})
