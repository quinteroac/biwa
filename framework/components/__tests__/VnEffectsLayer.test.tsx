import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { effectDurationMs, VnEffectsLayer } from '../VnEffectsLayer.tsx'

describe('VnEffectsLayer', () => {
  it('renders stacked screen and atmosphere effects', () => {
    const html = renderToStaticMarkup(
      <VnEffectsLayer
        effects={[
          { key: 'flash', type: 'flash', params: { color: '#fff', intensity: 0.2 } },
          { key: 'rain', type: 'rain', persistent: true, params: { opacity: 0.3 } },
        ]}
      />,
    )

    expect(html).toContain('data-testid="vn-effects-layer"')
    expect(html).toContain('data-vn-effect="flash"')
    expect(html).toContain('data-vn-effect="rain"')
  })

  it('normalizes second and millisecond durations', () => {
    expect(effectDurationMs({ duration: '0.3' })).toBe(300)
    expect(effectDurationMs({ duration: '300' })).toBe(300)
  })
})
