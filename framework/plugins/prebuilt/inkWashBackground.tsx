import type { BackgroundRendererProps } from '../../renderers/RendererRegistry.ts'
import type { VnPluginDescriptor, VnPluginModule } from '../../types/plugins.d.ts'

export const INK_WASH_BACKGROUND_PLUGIN_ID = 'official-ink-wash-background'
export const INK_WASH_BACKGROUND_TYPE = 'ink-wash'

function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function InkWashBackground({ background, resolveAsset }: BackgroundRendererProps) {
  const image = typeof background.image === 'string' ? resolveAsset(background.image) : null
  const texture = typeof background.texture === 'string' ? resolveAsset(background.texture) : null
  const tint = color(background.tint, 'rgba(23, 21, 20, 0.24)')
  const paper = color(background.paper, '#1f1d1b')
  const contrast = numberValue(background.contrast, 1.08)
  const saturation = numberValue(background.saturation, 0.74)
  const blur = numberValue(background.blur, 0)
  const grainOpacity = numberValue(background.grainOpacity, 0.12)

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: paper }}>
      {image && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("${image}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: `contrast(${contrast}) saturate(${saturation}) blur(${blur}px)`,
            transform: blur > 0 ? 'scale(1.01)' : undefined,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: tint,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: grainOpacity,
          pointerEvents: 'none',
          backgroundImage: texture
            ? `url("${texture}")`
            : 'radial-gradient(circle at 20% 30%, rgba(255,255,255,.9) 0 1px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(0,0,0,.85) 0 1px, transparent 1px)',
          backgroundSize: texture ? 'cover' : '18px 18px, 22px 22px',
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  )
}

export const inkWashBackgroundModule: VnPluginModule = {
  setup({ rendererRegistry }) {
    rendererRegistry.register('background', INK_WASH_BACKGROUND_TYPE, InkWashBackground, {
      pluginId: INK_WASH_BACKGROUND_PLUGIN_ID,
    })
  },
}

export function inkWashBackgroundPlugin(): VnPluginDescriptor {
  return {
    id: INK_WASH_BACKGROUND_PLUGIN_ID,
    name: 'Official Ink Wash Background',
    version: '0.1.0',
    type: 'plugin',
    capabilities: ['renderer'],
    renderers: { background: [INK_WASH_BACKGROUND_TYPE] },
    compatibility: { pluginApi: 'vn-plugin-api-v1' },
    loader: () => inkWashBackgroundModule,
  }
}
