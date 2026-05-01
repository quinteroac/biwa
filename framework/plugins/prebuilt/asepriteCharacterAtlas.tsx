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

function AsepriteCharacterAtlasRenderer({ animation, sheet, animationName, assetBase }: CharacterRendererProps) {
  const animationSheets = animation.animationSheets && typeof animation.animationSheets === 'object' && !Array.isArray(animation.animationSheets)
    ? animation.animationSheets as Record<string, Record<string, unknown>>
    : {}
  const stateSheets = animation.states && typeof animation.states === 'object' && !Array.isArray(animation.states)
    ? animation.states as Record<string, Record<string, unknown>>
    : {}
  const selectedAnimationSheet = animationSheets[sheet]
    ?? (typeof animation.defaultAnimationSheet === 'string' ? animationSheets[animation.defaultAnimationSheet] : undefined)
    ?? animationSheets['Main']
    ?? Object.values(animationSheets)[0]
  const selectedStateSheet = stateSheets[sheet]
    ?? (typeof animation.defaultStateSheet === 'string' ? stateSheets[animation.defaultStateSheet] : undefined)
    ?? stateSheets['Main']
    ?? Object.values(stateSheets)[0]
  const actionMapping = stringRecord(selectedAnimationSheet?.actions)
  const selectedSheet = actionMapping?.[animationName] || !selectedStateSheet ? selectedAnimationSheet : selectedStateSheet
  const file = typeof selectedSheet?.file === 'string' ? selectedSheet.file : null
  const atlas = typeof selectedSheet?.atlas === 'string' ? selectedSheet.atlas : null
  const animations = stringRecord(selectedSheet?.actions) ?? stringRecord(selectedSheet?.sprites)

  if (!file || !atlas || !animations) {
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
      animation={animationName}
      animations={animations}
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
