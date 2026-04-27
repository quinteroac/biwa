import { inkWashBackgroundPlugin } from './inkWashBackground.tsx'
import type { VnPluginDescriptor } from '../../types/plugins.d.ts'

export interface OfficialPluginDefinition {
  id: string
  name: string
  description: string
  factory: () => VnPluginDescriptor
}

export const officialPluginCatalog: OfficialPluginDefinition[] = [
  {
    id: 'official-ink-wash-background',
    name: 'Ink Wash Background',
    description: 'Background renderer with tint, contrast and paper grain controls.',
    factory: inkWashBackgroundPlugin,
  },
]

export const officialPlugins = {
  inkWashBackground: inkWashBackgroundPlugin,
}

export { inkWashBackgroundPlugin } from './inkWashBackground.tsx'
