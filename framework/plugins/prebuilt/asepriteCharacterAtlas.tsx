import { AsepriteSpritesheetRenderer } from '../../components/VnCharacter.tsx'
import type { CharacterRendererProps } from '../../renderers/RendererRegistry.ts'
import type { VnPluginDescriptor, VnPluginModule } from '../../types/plugins.d.ts'

export const ASEPRITE_CHARACTER_ATLAS_PLUGIN_ID = 'official-aseprite-character-atlas'
export const ASEPRITE_CHARACTER_ATLAS_TYPE = 'aseprite-character-atlas'

function stringRecord(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.some(([, item]) => typeof item !== 'string')) return null
  return Object.fromEntries(entries) as Record<string, string>
}

function AsepriteCharacterAtlasRenderer({ animation, expression, assetBase }: CharacterRendererProps) {
  const file = typeof animation.file === 'string' ? animation.file : null
  const atlas = typeof animation.atlas === 'string' ? animation.atlas : null
  const expressions = stringRecord(animation.expressions)

  if (!file || !atlas || !expressions) {
    return (
      <div data-testid="vn-aseprite-character-atlas-missing-data">
        Missing Aseprite atlas character data.
      </div>
    )
  }

  return (
    <AsepriteSpritesheetRenderer
      file={file}
      atlas={atlas}
      expression={expression}
      expressions={expressions}
      assetBase={assetBase}
    />
  )
}

export const asepriteCharacterAtlasModule: VnPluginModule = {
  setup({ rendererRegistry }) {
    rendererRegistry.register('character', ASEPRITE_CHARACTER_ATLAS_TYPE, AsepriteCharacterAtlasRenderer, {
      pluginId: ASEPRITE_CHARACTER_ATLAS_PLUGIN_ID,
    })
  },
}

export function asepriteCharacterAtlasPlugin(): VnPluginDescriptor {
  return {
    id: ASEPRITE_CHARACTER_ATLAS_PLUGIN_ID,
    name: 'Official Aseprite Character Atlas',
    version: '0.1.0',
    type: 'plugin',
    capabilities: ['renderer', 'asset-loader'],
    renderers: { character: [ASEPRITE_CHARACTER_ATLAS_TYPE] },
    compatibility: { pluginApi: 'vn-plugin-api-v1' },
    loader: () => asepriteCharacterAtlasModule,
  }
}
