import { inkWashBackgroundPlugin } from './inkWashBackground.tsx'
import type { RendererKind } from '../../renderers/RendererRegistry.ts'
import type { VnPluginDescriptor } from '../../types/plugins.d.ts'
import type { VnPluginCapability } from '../../types/plugins.d.ts'

export type OfficialPluginCategory = 'renderer' | 'player' | 'devtools' | 'asset'
export type OfficialPluginStatus = 'stable' | 'experimental' | 'planned'

export interface OfficialPluginDefinition {
  id: string
  name: string
  category: OfficialPluginCategory
  status: OfficialPluginStatus
  description: string
  capabilities: VnPluginCapability[]
  renderers?: Partial<Record<RendererKind, string[]>>
  importName: keyof typeof officialPlugins
  configExample: string
  factory: () => VnPluginDescriptor
}

export const officialPlugins = {
  inkWashBackground: inkWashBackgroundPlugin,
}

export const officialPluginCatalog: OfficialPluginDefinition[] = [
  {
    id: 'official-ink-wash-background',
    name: 'Ink Wash Background',
    category: 'renderer',
    status: 'experimental',
    description: 'Background renderer with tint, contrast and paper grain controls.',
    capabilities: ['renderer'],
    renderers: { background: ['ink-wash'] },
    importName: 'inkWashBackground',
    configExample: `import { officialPlugins } from '<framework/plugins/prebuilt>'

plugins: [
  officialPlugins.inkWashBackground(),
]`,
    factory: inkWashBackgroundPlugin,
  },
]

export { inkWashBackgroundPlugin } from './inkWashBackground.tsx'
