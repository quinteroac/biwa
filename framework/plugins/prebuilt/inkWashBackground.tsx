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

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function selectVariant(
  background: Record<string, unknown>,
  requestedVariant: string | undefined,
): Record<string, unknown> {
  const variants = recordValue(background.variants)
  if (!variants) return {}
  const defaultVariant = typeof background.defaultVariant === 'string' ? background.defaultVariant : undefined
  const key = requestedVariant ?? defaultVariant ?? Object.keys(variants)[0]
  return key ? (recordValue(variants[key]) ?? {}) : {}
}

function InkWashBackground({ scene, background, resolveAsset }: BackgroundRendererProps) {
  const variant = selectVariant(background, scene?.variant)
  const imagePath = typeof variant.image === 'string' ? variant.image : background.image
  const texturePath = typeof variant.texture === 'string' ? variant.texture : background.texture
  const image = typeof imagePath === 'string' ? resolveAsset(imagePath) : null
  const texture = typeof texturePath === 'string' ? resolveAsset(texturePath) : null
  const position = color(variant.position ?? background.position, 'center')
  const fit = color(variant.fit ?? background.fit, 'cover')
  const tint = color(variant.tint ?? background.tint, 'rgba(23, 21, 20, 0.24)')
  const paper = color(variant.paper ?? background.paper, '#1f1d1b')
  const contrast = numberValue(variant.contrast ?? background.contrast, 1.08)
  const saturation = numberValue(variant.saturation ?? background.saturation, 0.74)
  const blur = numberValue(variant.blur ?? background.blur, 0)
  const grainOpacity = numberValue(variant.grainOpacity ?? background.grainOpacity, 0.12)

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: paper }}>
      {image && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("${image}")`,
            backgroundSize: fit,
            backgroundPosition: position,
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
