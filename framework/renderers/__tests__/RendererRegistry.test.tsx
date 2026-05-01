import { afterEach, describe, expect, it } from 'bun:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { defaultRendererRegistry, RendererRegistry } from '../RendererRegistry.ts'
import { VnBackground } from '../../components/VnBackground.tsx'
import { VnCharacter } from '../../components/VnCharacter.tsx'
import { VnTransition } from '../../components/VnTransition.tsx'

describe('RendererRegistry', () => {
  afterEach(() => defaultRendererRegistry.clear())

  it('registers and lists renderer records by kind', () => {
    const registry = new RendererRegistry()
    const Component = () => createElement('div', null, 'custom')

    registry.register('background', 'custom-bg', Component)

    expect(registry.has('background', 'custom-bg')).toBe(true)
    expect(registry.get('background', 'custom-bg')?.component).toBe(Component)
    expect(registry.list('background').map(record => record.type)).toEqual(['custom-bg'])
    expect(() => registry.register('background', 'custom-bg', Component)).toThrow('already registered')
  })

  it('dispatches external background renderers by background type', () => {
    defaultRendererRegistry.register('background', 'custom-bg', ({ background }) => (
      createElement('div', { 'data-testid': 'custom-bg' }, String(background['label']))
    ))

    const html = renderToString(createElement(VnBackground, {
      scene: {
        id: 'scene-1',
        data: { background: { type: 'custom-bg', label: 'External BG' } as never },
      },
    }))

    expect(html).toContain('custom-bg')
    expect(html).toContain('External BG')
  })

  it('dispatches external character renderers by animation type', () => {
    defaultRendererRegistry.register('character', 'spine', ({ id, sheet, animationName }) => (
      createElement('div', { 'data-testid': 'custom-character' }, `${id}:${sheet}/${animationName}`)
    ))

    const html = renderToString(createElement(VnCharacter, {
      id: 'kai',
      charData: {
        animation: { type: 'spine' },
      },
      position: 'center',
      sheet: 'Chapter_01',
      animation: 'smile',
      exiting: false,
      onExited: () => {},
    }))

    expect(html).toContain('custom-character')
    expect(html).toContain('kai:Chapter_01/smile')
    expect(html).not.toContain('Unsupported character renderer')
  })

  it('dispatches external transition renderers by transition type', () => {
    defaultRendererRegistry.register('transition', 'iris', ({ config }) => (
      createElement('div', { 'data-testid': 'custom-transition' }, String(config['type']))
    ))

    const html = renderToString(createElement(VnTransition, {
      config: { type: 'iris' as never },
      onDone: () => {},
    }))

    expect(html).toContain('custom-transition')
    expect(html).toContain('iris')
  })
})
