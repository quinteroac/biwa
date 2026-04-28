import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createDoctorJsonReport, validateGame } from '../../manager/commands/doctor.ts'
import { officialPluginCatalog, VN_PLUGIN_API_VERSION } from '../../framework/plugins.ts'
import type { DoctorJsonReport } from '../../manager/commands/doctor.ts'
import type { VnPluginDescriptor } from '../../framework/plugins.ts'
import type {
  StudioPluginCatalogItem,
  StudioPluginMutationResponse,
  StudioPluginsResponse,
} from '../shared/types.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const GAMES_DIR = join(ROOT, 'games')

function assertGameId(gameId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(gameId)) throw new Error(`Invalid game id: ${gameId}`)
}

function configPath(gameId: string): string {
  assertGameId(gameId)
  return join(GAMES_DIR, gameId, 'game.config.ts')
}

function renderersRecord(value: VnPluginDescriptor['renderers'] | undefined): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [kind, renderers] of Object.entries(value ?? {})) {
    result[kind] = [...(renderers ?? [])]
  }
  return result
}

function pluginCompatible(plugin: VnPluginDescriptor): { compatible: boolean; message: string } {
  const pluginApi = plugin.compatibility?.pluginApi
  if (!pluginApi) return { compatible: false, message: 'Missing pluginApi compatibility.' }
  if (pluginApi !== VN_PLUGIN_API_VERSION) {
    return { compatible: false, message: `Requires ${pluginApi}; framework exposes ${VN_PLUGIN_API_VERSION}.` }
  }
  return { compatible: true, message: `Compatible with ${VN_PLUGIN_API_VERSION}.` }
}

function officialItem(installedImports: Set<string>, plugin: typeof officialPluginCatalog[number]): StudioPluginCatalogItem {
  return {
    id: plugin.id,
    name: plugin.name,
    category: plugin.category,
    status: plugin.status,
    contract: plugin.contract,
    description: plugin.description,
    capabilities: [...plugin.capabilities],
    renderers: renderersRecord(plugin.renderers),
    tags: [...(plugin.tags ?? [])],
    importName: String(plugin.importName),
    configExample: plugin.configExample,
    installed: installedImports.has(String(plugin.importName)),
    removable: true,
    compatible: true,
    compatibilityMessage: `Compatible with ${VN_PLUGIN_API_VERSION}.`,
  }
}

function localItem(plugin: VnPluginDescriptor): StudioPluginCatalogItem {
  const compatibility = pluginCompatible(plugin)
  return {
    id: plugin.id,
    name: plugin.name,
    category: 'local',
    status: 'local',
    contract: 'local',
    description: plugin.entry ? `Local plugin entry: ${plugin.entry}` : 'Local inline plugin declaration.',
    capabilities: [...plugin.capabilities],
    renderers: renderersRecord(plugin.renderers),
    tags: [...(plugin.tags ?? [])],
    importName: null,
    configExample: '',
    installed: true,
    removable: false,
    compatible: compatibility.compatible,
    compatibilityMessage: compatibility.message,
  }
}

function bracketRange(text: string, openIndex: number): { start: number; end: number } {
  let depth = 0
  let quote: string | null = null
  let escaped = false
  for (let index = openIndex; index < text.length; index++) {
    const char = text[index]!
    if (quote) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = null
      }
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '[') depth++
    if (char === ']') {
      depth--
      if (depth === 0) return { start: openIndex, end: index }
    }
  }
  throw new Error('Unable to find the end of the plugins array.')
}

function pluginsArrayRange(text: string): { start: number; end: number } | null {
  const match = /plugins\s*:\s*\[/.exec(text)
  if (!match) return null
  const openIndex = match.index + match[0].lastIndexOf('[')
  return bracketRange(text, openIndex)
}

function ensureOfficialImport(text: string): string {
  if (/import\s+\{[^}]*\bofficialPlugins\b[^}]*\}\s+from\s+['"][^'"]*framework\/plugins\.ts['"]/.test(text)) {
    return text
  }
  return `import { officialPlugins } from '../../framework/plugins.ts'\n${text}`
}

function insertPlugin(text: string, importName: string): string {
  const call = `officialPlugins.${importName}()`
  if (text.includes(call)) return text
  const withImport = ensureOfficialImport(text)
  const range = pluginsArrayRange(withImport)
  if (!range) {
    const marker = /minigames\s*:/.exec(withImport)
    const insertion = `\n  plugins: [\n    ${call},\n  ],\n`
    if (marker) return `${withImport.slice(0, marker.index)}${insertion}${withImport.slice(marker.index)}`
    const configStart = withImport.indexOf('const config')
    const objectStart = configStart >= 0 ? withImport.indexOf('{', configStart) : -1
    if (objectStart < 0) throw new Error('Unable to insert plugins array into game.config.ts.')
    return `${withImport.slice(0, objectStart + 1)}${insertion}${withImport.slice(objectStart + 1)}`
  }
  const content = withImport.slice(range.start + 1, range.end)
  const trimmed = content.trim()
  const nextContent = trimmed
    ? `${content.replace(/\s*$/, '')},\n    ${call},\n  `
    : `\n    ${call},\n  `
  return `${withImport.slice(0, range.start + 1)}${nextContent}${withImport.slice(range.end)}`
}

function removePlugin(text: string, importName: string): string {
  const call = `officialPlugins.${importName}()`
  const range = pluginsArrayRange(text)
  if (!range) return text
  const content = text.slice(range.start + 1, range.end)
  const exact = new RegExp(`\\n?\\s*officialPlugins\\.${importName}\\(\\),?`, 'g')
  const nextContent = content.replace(exact, '').replace(/,\s*,/g, ',')
  let next = `${text.slice(0, range.start + 1)}${nextContent}${text.slice(range.end)}`
  if (!next.includes('officialPlugins.')) {
    next = next.replace(/import\s+\{\s*officialPlugins\s*\}\s+from\s+['"][^'"]*framework\/plugins\.ts['"]\n?/, '')
  }
  return next
}

function officialPluginByImport(importName: string) {
  const plugin = officialPluginCatalog.find(item => item.importName === importName || item.id === importName)
  if (!plugin) throw new Error(`Unknown official plugin: ${importName}`)
  return plugin
}

async function diagnostics(gameId: string): Promise<DoctorJsonReport> {
  const { gameDir, issues } = await validateGame(gameId)
  return createDoctorJsonReport(gameId, gameDir, issues)
}

export async function listStudioPlugins(gameId: string): Promise<StudioPluginsResponse> {
  const { config } = await validateGame(gameId)
  const configText = existsSync(configPath(gameId)) ? readFileSync(configPath(gameId), 'utf8') : ''
  const installed = config.plugins ?? []
  const installedIds = new Set(installed.map(plugin => plugin.id))
  const installedImports = new Set(
    officialPluginCatalog
      .filter(plugin => configText.includes(`officialPlugins.${String(plugin.importName)}(`))
      .map(plugin => String(plugin.importName)),
  )
  const officialIds = new Set(officialPluginCatalog.map(plugin => plugin.id))
  const plugins = [
    ...officialPluginCatalog.map(plugin => officialItem(installedImports, plugin)),
    ...installed.filter(plugin => !officialIds.has(plugin.id)).map(localItem),
  ]
  return { plugins }
}

export async function installOfficialPlugin(gameId: string, importName: string): Promise<StudioPluginMutationResponse> {
  const plugin = officialPluginByImport(importName)
  const path = configPath(gameId)
  if (!existsSync(path)) throw new Error(`Game config not found for ${gameId}.`)
  const current = readFileSync(path, 'utf8')
  writeFileSync(path, insertPlugin(current, String(plugin.importName)))
  const response = await listStudioPlugins(gameId)
  return { plugins: response.plugins, diagnostics: await diagnostics(gameId) }
}

export async function removeOfficialPlugin(gameId: string, importName: string): Promise<StudioPluginMutationResponse> {
  const plugin = officialPluginByImport(importName)
  const path = configPath(gameId)
  if (!existsSync(path)) throw new Error(`Game config not found for ${gameId}.`)
  const current = readFileSync(path, 'utf8')
  writeFileSync(path, removePlugin(current, String(plugin.importName)))
  const response = await listStudioPlugins(gameId)
  return { plugins: response.plugins, diagnostics: await diagnostics(gameId) }
}
