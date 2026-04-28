import { describe, expect, it } from 'bun:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { VnDevtoolsOverlay } from '../VnDevtoolsOverlay.tsx'
import type { RuntimeDiagnosticsSnapshot } from '../../types/diagnostics.d.ts'

const snapshot: RuntimeDiagnosticsSnapshot = {
  state: 'DIALOG',
  scene: { id: 'cafe', variant: 'night' },
  variables: { trust: 2 },
  characters: [{ id: 'kai', position: 'left', expression: 'neutral' }],
  audio: { bgm: { id: 'theme' } },
  plugins: [{
    id: 'official-devtools',
    name: 'Runtime Devtools',
    version: '0.1.0',
    active: true,
    capabilities: ['overlay', 'engine-event'],
    renderers: {},
    tags: [],
  }],
  renderers: [{ kind: 'background', type: 'ink-wash', pluginId: 'official-ink-wash-background' }],
}

describe('VnDevtoolsOverlay', () => {
  it('renders a compact devtools dock', () => {
    const html = renderToString(createElement(VnDevtoolsOverlay, {
      snapshot,
      onRefresh: () => {},
    }))

    expect(html).toContain('data-testid="vn-devtools"')
    expect(html).toContain('Dev')
  })

  it('renders author tooling controls when open', () => {
    const html = renderToString(createElement(VnDevtoolsOverlay, {
      snapshot,
      onRefresh: () => {},
      defaultOpen: true,
    }))

    expect(html).toContain('Search variables')
    expect(html).toContain('Copy JSON')
    expect(html).toContain('Recent')
    expect(html).toContain('trust')
  })
})
