import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, relative, resolve } from 'path'
import { pathToFileURL } from 'url'
import { officialPluginCatalog, validatePluginManifest } from '../../framework/plugins.ts'
import type { OfficialPluginCategory, OfficialPluginStatus, VnPluginDescriptor, VnPluginManifest } from '../../framework/plugins.ts'
import type { GameConfig } from '../../framework/types.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')

interface ParsedArgs {
  positional: string[]
  flags: Record<string, string | boolean>
}

function usage(): string {
  return `Usage:
  bun manager/cli.ts plugins official [--category renderer|effects|player|devtools|asset] [--status stable|experimental|planned]
  bun manager/cli.ts plugins list <gameId>
  bun manager/cli.ts plugins validate <path|gameId>
  bun manager/cli.ts plugins scaffold <pluginId> [--out <dir>] [--template feature|renderer|ui]`
}

function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const key = arg.slice(2)
    const next = args[i + 1]
    if (!next || next.startsWith('--')) {
      flags[key] = true
      continue
    }
    flags[key] = next
    i++
  }
  return { positional, flags }
}

function pluginIdIsValid(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(id)
}

function strFlag(flags: Record<string, string | boolean>, key: string, fallback: string): string {
  const value = flags[key]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function pluginTitle(pluginId: string): string {
  return pluginId.split('-').map(part => part[0]?.toUpperCase() + part.slice(1)).join(' ')
}

async function loadGameConfig(gameId: string): Promise<{ gameDir: string; config: GameConfig }> {
  const gameDir = join(ROOT, 'games', gameId)
  const configPath = join(gameDir, 'game.config.ts')
  if (!existsSync(configPath)) throw new Error(`Game "${gameId}" does not exist or has no game.config.ts.`)
  const mod = await import(pathToFileURL(configPath).href) as { default?: GameConfig }
  if (!mod.default) throw new Error(`No default export found in ${configPath}`)
  return { gameDir, config: mod.default }
}

async function loadPluginConfig(pathArg: string): Promise<{ dir: string; manifest: VnPluginManifest }> {
  const input = resolve(ROOT, pathArg)
  const configPath = existsSync(input) && !input.endsWith('.ts')
    ? join(input, 'plugin.config.ts')
    : input
  if (!existsSync(configPath)) throw new Error(`Plugin config not found: ${pathArg}`)
  const mod = await import(pathToFileURL(configPath).href) as { default?: VnPluginManifest }
  if (!mod.default) throw new Error(`No default export found in ${configPath}`)
  return { dir: configPath.replace(/\/plugin\.config\.ts$/, ''), manifest: mod.default }
}

function validatePluginEntry(baseDir: string, plugin: VnPluginDescriptor): string {
  validatePluginManifest(plugin)
  if (!plugin.entry) return 'ok'
  if (/^https?:\/\//.test(plugin.entry)) return 'remote-entry-blocked'
  const entryPath = resolve(baseDir, plugin.entry)
  if (!entryPath.startsWith(resolve(baseDir))) return 'outside-game-blocked'
  return existsSync(entryPath) ? 'ok' : 'missing-entry'
}

function rendererSummary(plugin: VnPluginDescriptor): string {
  const renderers = plugin.renderers ?? {}
  const parts = Object.entries(renderers).flatMap(([kind, values]) =>
    (values ?? []).map((value: string) => `${kind}:${value}`),
  )
  return parts.length > 0 ? parts.join(',') : '—'
}

function tagSummary(plugin: VnPluginDescriptor): string {
  return plugin.tags && plugin.tags.length > 0 ? plugin.tags.join(',') : '—'
}

function rendererDefinitionSummary(renderers: VnPluginDescriptor['renderers']): string {
  const parts = Object.entries(renderers ?? {}).flatMap(([kind, values]) =>
    (values ?? []).map((value: string) => `${kind}:${value}`),
  )
  return parts.length > 0 ? parts.join(',') : '—'
}

function tagDefinitionSummary(tags: string[] | undefined): string {
  return tags && tags.length > 0 ? tags.join(',') : '—'
}

type PluginTemplate = 'feature' | 'renderer' | 'ui'

function parseTemplate(value: string): PluginTemplate {
  if (value === 'feature' || value === 'renderer' || value === 'ui') return value
  throw new Error('Invalid plugin template. Use feature, renderer or ui.')
}

function scaffoldFiles(pluginId: string, template: PluginTemplate): { config: string; indexName: string; index: string; test: string } {
  const title = pluginTitle(pluginId)
  const rendererType = `${pluginId}-background`
  if (template === 'renderer') {
    return {
      indexName: 'index.tsx',
      config: `import type { VnPluginManifest } from '../../framework/plugins.ts'

const manifest: VnPluginManifest = {
  id: '${pluginId}',
  name: '${title}',
  version: '0.1.0',
  type: 'plugin',
  entry: './index.tsx',
  capabilities: ['renderer'],
  renderers: { background: ['${rendererType}'] },
  compatibility: { pluginApi: 'vn-plugin-api-v1' },
}

export default manifest
`,
      index: `import type { BackgroundRendererProps, VnPluginModule } from '../../framework/plugins.ts'

function ${title.replace(/[^A-Za-z0-9]/g, '')}Background({ background, resolveAsset }: BackgroundRendererProps) {
  const image = typeof background.image === 'string' ? resolveAsset(background.image) : null
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#111', overflow: 'hidden' }}>
      {image && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: \`url("\${image}")\`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
    </div>
  )
}

const plugin: VnPluginModule = {
  setup({ rendererRegistry }) {
    rendererRegistry.register('background', '${rendererType}', ${title.replace(/[^A-Za-z0-9]/g, '')}Background, {
      pluginId: '${pluginId}',
    })
  },
}

export default plugin
`,
      test: `import { describe, expect, it } from 'bun:test'
import manifest from './plugin.config.ts'

describe('${pluginId}', () => {
  it('declares its background renderer', () => {
    expect(manifest.renderers?.background).toContain('${rendererType}')
  })
})
`,
    }
  }

  if (template === 'ui') {
    return {
      indexName: 'index.tsx',
      config: `import type { VnPluginManifest } from '../../framework/plugins.ts'

const manifest: VnPluginManifest = {
  id: '${pluginId}',
  name: '${title}',
  version: '0.1.0',
  type: 'plugin',
  entry: './index.tsx',
  capabilities: ['renderer', 'overlay'],
  renderers: { overlay: ['${pluginId}-overlay'] },
  compatibility: { pluginApi: 'vn-plugin-api-v1' },
}

export default manifest
`,
      index: `import type { OverlayRendererProps, VnPluginModule } from '../../framework/plugins.ts'

function ${title.replace(/[^A-Za-z0-9]/g, '')}Overlay({ id }: OverlayRendererProps) {
  return (
    <div data-plugin-overlay={id} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
  )
}

const plugin: VnPluginModule = {
  setup({ rendererRegistry }) {
    rendererRegistry.register('overlay', '${pluginId}-overlay', ${title.replace(/[^A-Za-z0-9]/g, '')}Overlay, {
      pluginId: '${pluginId}',
    })
  },
}

export default plugin
`,
      test: `import { describe, expect, it } from 'bun:test'
import manifest from './plugin.config.ts'

describe('${pluginId}', () => {
  it('declares its overlay renderer', () => {
    expect(manifest.renderers?.overlay).toContain('${pluginId}-overlay')
  })
})
`,
    }
  }

  return {
    indexName: 'index.ts',
    config: `import type { VnPluginManifest } from '../../framework/plugins.ts'

const manifest: VnPluginManifest = {
  id: '${pluginId}',
  name: '${title}',
  version: '0.1.0',
  type: 'plugin',
  entry: './index.ts',
  capabilities: ['engine-event'],
  compatibility: { pluginApi: 'vn-plugin-api-v1' },
}

export default manifest
`,
    index: `import type { VnPluginModule } from '../../framework/plugins.ts'

const plugin: VnPluginModule = {
  setup(context) {
    context.logger.info('${pluginId} loaded')
  },

  dispose() {
    // Release plugin resources here.
  },
}

export default plugin
`,
    test: `import { describe, expect, it } from 'bun:test'
import manifest from './plugin.config.ts'

describe('${pluginId}', () => {
  it('declares a valid plugin id', () => {
    expect(manifest.id).toBe('${pluginId}')
  })
})
`,
  }
}

export function scaffoldPlugin(pluginId: string, flags: Record<string, string | boolean> = {}): string {
  if (!pluginIdIsValid(pluginId)) throw new Error('Invalid pluginId. Use lowercase letters, numbers and hyphens.')
  const outRoot = strFlag(flags, 'out', 'plugins')
  const template = parseTemplate(strFlag(flags, 'template', 'feature'))
  const pluginDir = join(ROOT, outRoot, pluginId)
  mkdirSync(pluginDir, { recursive: true })
  const files = scaffoldFiles(pluginId, template)

  writeFileSync(join(pluginDir, 'plugin.config.ts'), files.config)
  writeFileSync(join(pluginDir, files.indexName), files.index)
  writeFileSync(join(pluginDir, `${pluginId}.test.ts`), files.test)
  return relative(ROOT, pluginDir)
}

function parseOfficialCategory(value: string | boolean | undefined): OfficialPluginCategory | null {
  if (value === undefined) return null
  if (value === 'renderer' || value === 'effects' || value === 'player' || value === 'devtools' || value === 'asset') return value
  throw new Error('Invalid official plugin category. Use renderer, effects, player, devtools or asset.')
}

function parseOfficialStatus(value: string | boolean | undefined): OfficialPluginStatus | null {
  if (value === undefined) return null
  if (value === 'stable' || value === 'experimental' || value === 'planned') return value
  throw new Error('Invalid official plugin status. Use stable, experimental or planned.')
}

function listOfficialPlugins(flags: Record<string, string | boolean> = {}): void {
  const category = parseOfficialCategory(flags['category'])
  const status = parseOfficialStatus(flags['status'])
  const plugins = officialPluginCatalog.filter(plugin =>
    (!category || plugin.category === category) &&
    (!status || plugin.status === status),
  )

  console.log('\nOfficial prebuilt plugins:\n')
  if (plugins.length === 0) {
    console.log('No official plugins match the selected filters.\n')
    return
  }
  console.log(`${'ID'.padEnd(34)} ${'Category'.padEnd(10)} ${'Status'.padEnd(13)} ${'Contract'.padEnd(9)} ${'Renderers'.padEnd(24)} ${'Tags'.padEnd(16)} Description`)
  console.log('─'.repeat(132))
  for (const plugin of plugins) {
    console.log(`${plugin.id.padEnd(34)} ${plugin.category.padEnd(10)} ${plugin.status.padEnd(13)} ${plugin.contract.padEnd(9)} ${rendererDefinitionSummary(plugin.renderers).padEnd(24)} ${tagDefinitionSummary(plugin.tags).padEnd(16)} ${plugin.description}`)
  }
  console.log('\nImport from framework/plugins.ts and declare the factory in game.config.ts.\n')
}

async function listPlugins(gameId: string): Promise<void> {
  const { gameDir, config } = await loadGameConfig(gameId)
  const plugins = config.plugins ?? []
  if (plugins.length === 0) {
    console.log(`No plugins declared for ${gameId}.`)
    return
  }

  console.log(`\nPlugins for ${gameId}:\n`)
  console.log(`${'ID'.padEnd(22)} ${'Version'.padEnd(10)} ${'Capabilities'.padEnd(28)} ${'Renderers'.padEnd(28)} ${'Tags'.padEnd(18)} Status`)
  console.log('─'.repeat(122))
  for (const plugin of plugins) {
    let status = 'ok'
    try {
      status = validatePluginEntry(gameDir, plugin)
    } catch (e) {
      status = e instanceof Error ? e.message : String(e)
    }
    console.log(`${plugin.id.padEnd(22)} ${plugin.version.padEnd(10)} ${plugin.capabilities.join(',').padEnd(28)} ${rendererSummary(plugin).padEnd(28)} ${tagSummary(plugin).padEnd(18)} ${status}`)
  }
  console.log('')
}

async function validateTarget(target: string): Promise<void> {
  const gameDir = join(ROOT, 'games', target)
  if (existsSync(join(gameDir, 'game.config.ts'))) {
    const { config } = await loadGameConfig(target)
    const ids = new Set<string>()
    for (const plugin of config.plugins ?? []) {
      validatePluginManifest(plugin)
      if (ids.has(plugin.id)) throw new Error(`Duplicate plugin id "${plugin.id}".`)
      ids.add(plugin.id)
      const status = validatePluginEntry(gameDir, plugin)
      if (status === 'missing-entry') throw new Error(`Plugin entry not found: ${plugin.entry}`)
      if (status === 'remote-entry-blocked') throw new Error(`Remote plugin entries are not allowed: ${plugin.entry}`)
      if (status === 'outside-game-blocked') throw new Error(`Plugin entry must stay inside the game directory: ${plugin.entry}`)
    }
    console.log(`Plugins valid for ${target}: ${config.plugins?.length ?? 0}`)
    return
  }

  const { dir, manifest } = await loadPluginConfig(target)
  const status = validatePluginEntry(dir, manifest)
  if (status === 'missing-entry') throw new Error(`Plugin entry not found: ${manifest.entry}`)
  if (status === 'remote-entry-blocked') throw new Error(`Remote plugin entries are not allowed: ${manifest.entry}`)
  if (status === 'outside-game-blocked') throw new Error(`Plugin entry must stay inside the plugin directory: ${manifest.entry}`)
  console.log(`Plugin valid: ${manifest.id}`)
}

export async function plugins(...args: string[]): Promise<void> {
  const [subcommand, ...rest] = args
  if (!subcommand || subcommand === 'help') {
    console.log(usage())
    process.exit(subcommand ? 1 : 0)
  }

  const parsed = parseArgs(rest)
  if (subcommand === 'official') {
    if (parsed.positional.length > 0) throw new Error(`Unexpected plugins argument: ${parsed.positional[0]}`)
    listOfficialPlugins(parsed.flags)
    return
  }

  if (subcommand === 'list') {
    const [gameId, ...extra] = parsed.positional
    if (!gameId) throw new Error(`Missing gameId.\n\n${usage()}`)
    if (extra.length > 0) throw new Error(`Unexpected plugins argument: ${extra[0]}`)
    await listPlugins(gameId)
    return
  }

  if (subcommand === 'validate') {
    const [target, ...extra] = parsed.positional
    if (!target) throw new Error(`Missing path or gameId.\n\n${usage()}`)
    if (extra.length > 0) throw new Error(`Unexpected plugins argument: ${extra[0]}`)
    await validateTarget(target)
    return
  }

  if (subcommand === 'scaffold') {
    const [pluginId, ...extra] = parsed.positional
    if (!pluginId) throw new Error(`Missing pluginId.\n\n${usage()}`)
    if (extra.length > 0) throw new Error(`Unexpected plugins argument: ${extra[0]}`)
    const dir = scaffoldPlugin(pluginId, parsed.flags)
    console.log(`Plugin "${pluginId}" scaffolded at ${dir}`)
    return
  }

  throw new Error(`Unknown plugins subcommand: ${subcommand}\n\n${usage()}`)
}
