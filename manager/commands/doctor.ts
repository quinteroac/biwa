import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import { pathToFileURL } from 'url'
import yaml from 'js-yaml'
import { TagParser } from '../../framework/TagParser.ts'
import type { GameConfig } from '../../framework/types/game-config.d.ts'
import type { TagCommand } from '../../framework/TagParser.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')

type Severity = 'error' | 'warning'

interface Issue {
  severity: Severity
  path: string
  message: string
}

interface DataMaps {
  characters: Map<string, Record<string, unknown>>
  scenes: Map<string, Record<string, unknown>>
  audio: Map<string, Record<string, unknown>>
  minigames: Map<string, Record<string, unknown>>
}

function detectGameId(): string | null {
  const gamesDir = join(ROOT, 'games')
  try {
    const entries = readdirSync(gamesDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
    return entries.length === 1 ? entries[0]! : null
  } catch {
    return null
  }
}

function walkFiles(dir: string, ext: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, ext))
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath)
    }
  }
  return results
}

function parseFrontmatter(filePath: string, issues: Issue[]): Record<string, unknown> | null {
  const text = readFileSync(filePath, 'utf8')
  const match = text.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    issues.push({ severity: 'error', path: filePath, message: 'Missing YAML frontmatter block.' })
    return null
  }
  try {
    const data = yaml.load(match[1]!) as unknown
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      issues.push({ severity: 'error', path: filePath, message: 'Frontmatter must be an object.' })
      return null
    }
    return data as Record<string, unknown>
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    issues.push({ severity: 'error', path: filePath, message: `Invalid YAML frontmatter: ${err.message}` })
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function resolveAsset(gameDir: string, path: string): string {
  if (path.startsWith('./')) return join(gameDir, path)
  if (path.startsWith('assets/')) return join(gameDir, path)
  return join(gameDir, 'assets', path)
}

function checkAsset(gameDir: string, filePath: string, ref: unknown, issues: Issue[], label: string): void {
  if (typeof ref !== 'string' || ref.length === 0) return
  if (/^https?:\/\//.test(ref)) return
  const resolved = resolveAsset(gameDir, ref)
  if (!existsSync(resolved)) {
    issues.push({
      severity: 'warning',
      path: filePath,
      message: `${label} not found: ${ref}`,
    })
  }
}

function addDataFile(
  map: Map<string, Record<string, unknown>>,
  filePath: string,
  data: Record<string, unknown>,
  issues: Issue[],
): void {
  const id = data['id']
  if (typeof id !== 'string' || id.length === 0) {
    issues.push({ severity: 'error', path: filePath, message: 'Missing required string field: id.' })
    return
  }
  const expected = filePath.split('/').pop()!.replace(/\.md$/, '')
  if (expected !== id) {
    issues.push({ severity: 'warning', path: filePath, message: `File name "${expected}" does not match id "${id}".` })
  }
  if (map.has(id)) {
    issues.push({ severity: 'error', path: filePath, message: `Duplicate id: ${id}.` })
    return
  }
  map.set(id, data)
}

function loadDataMaps(gameDir: string, config: GameConfig, issues: Issue[]): DataMaps {
  const maps: DataMaps = {
    characters: new Map(),
    scenes: new Map(),
    audio: new Map(),
    minigames: new Map(),
  }

  const dataConfig = config.data ?? {}
  const dirs = {
    characters: dataConfig.characters,
    scenes: dataConfig.scenes,
    audio: dataConfig.audio,
    minigames: dataConfig.minigames,
  } as const

  for (const [kind, configuredDir] of Object.entries(dirs)) {
    if (!configuredDir) continue
    const dir = join(gameDir, configuredDir)
    if (!existsSync(dir)) {
      issues.push({ severity: 'error', path: dir, message: `Configured ${kind} directory does not exist.` })
      continue
    }
    for (const filePath of walkFiles(dir, '.md')) {
      const data = parseFrontmatter(filePath, issues)
      if (!data) continue
      addDataFile(maps[kind as keyof DataMaps], filePath, data, issues)
      validateDataFile(kind as keyof DataMaps, gameDir, filePath, data, issues)
    }
  }

  return maps
}

function validateDataFile(
  kind: keyof DataMaps,
  gameDir: string,
  filePath: string,
  data: Record<string, unknown>,
  issues: Issue[],
): void {
  if (kind === 'characters') {
    const animation = asRecord(data['animation'])
    if (!animation && !Array.isArray(data['layers'])) {
      issues.push({ severity: 'warning', path: filePath, message: 'Character has no animation or layers.' })
    }
    if (animation) {
      checkAsset(gameDir, filePath, animation['file'], issues, 'Character animation file')
      checkAsset(gameDir, filePath, animation['atlas'], issues, 'Character atlas')
      const sprites = asRecord(animation['sprites'])
      if (sprites) {
        for (const [name, ref] of Object.entries(sprites)) {
          checkAsset(gameDir, filePath, ref, issues, `Character sprite "${name}"`)
        }
      }
    }
  }

  if (kind === 'scenes') {
    const background = asRecord(data['background'])
    if (!background) {
      issues.push({ severity: 'error', path: filePath, message: 'Scene missing required background object.' })
      return
    }
    checkAsset(gameDir, filePath, background['image'], issues, 'Scene background image')
    checkAsset(gameDir, filePath, background['file'] ?? background['src'], issues, 'Scene background file')
    checkAsset(gameDir, filePath, background['poster'], issues, 'Scene video poster')
    const variants = asRecord(background['variants'])
    if (variants) {
      for (const [name, rawVariant] of Object.entries(variants)) {
        const variant = asRecord(rawVariant)
        checkAsset(gameDir, filePath, variant?.['image'], issues, `Scene variant "${name}" image`)
      }
    }
    const layers = Array.isArray(background['layers']) ? background['layers'] : []
    for (const [idx, rawLayer] of layers.entries()) {
      const layer = asRecord(rawLayer)
      checkAsset(gameDir, filePath, layer?.['image'], issues, `Scene parallax layer ${idx} image`)
    }
    checkAsset(gameDir, filePath, data['thumbnail'], issues, 'Scene thumbnail')
  }

  if (kind === 'audio') {
    checkAsset(gameDir, filePath, data['file'], issues, 'Audio file')
    if (typeof data['loop'] === 'string') checkAsset(gameDir, filePath, data['loop'], issues, 'Audio loop file')
    checkAsset(gameDir, filePath, data['intro'], issues, 'Audio intro file')
    const layers = Array.isArray(data['layers']) ? data['layers'] : []
    for (const [idx, rawLayer] of layers.entries()) {
      const layer = asRecord(rawLayer)
      checkAsset(gameDir, filePath, layer?.['file'], issues, `Audio layer ${idx} file`)
      checkAsset(gameDir, filePath, layer?.['intro'], issues, `Audio layer ${idx} intro`)
      checkAsset(gameDir, filePath, layer?.['loop'], issues, `Audio layer ${idx} loop`)
    }
  }

  if (kind === 'minigames') {
    if (typeof data['entry'] !== 'string') {
      issues.push({ severity: 'error', path: filePath, message: 'Minigame missing required string field: entry.' })
    } else {
      const entry = data['entry']
      const sourceEntry = entry.endsWith('.js') ? entry.replace(/\.js$/, '.ts') : entry
      if (!existsSync(join(gameDir, sourceEntry)) && !existsSync(join(gameDir, entry))) {
        issues.push({ severity: 'warning', path: filePath, message: `Minigame entry not found: ${entry}` })
      }
    }
    if (!asRecord(data['results'])) {
      issues.push({ severity: 'error', path: filePath, message: 'Minigame missing required results object.' })
    }
  }
}

function validateStoryReferences(gameDir: string, maps: DataMaps, issues: Issue[]): void {
  const storyFiles = walkFiles(join(gameDir, 'story'), '.ink')
  for (const filePath of storyFiles) {
    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)
    for (const [idx, line] of lines.entries()) {
      const trimmed = line.trim()
      if (trimmed.startsWith('#')) {
        const tag = TagParser.parseOne(trimmed)
        if (tag) validateTagReference(filePath, idx + 1, tag, maps, issues)
      }
      const minigameMatch = trimmed.match(/launch_minigame\("([^"]+)"\)/)
      if (minigameMatch) {
        const id = minigameMatch[1]!
        if (!maps.minigames.has(id)) {
          issues.push({ severity: 'error', path: `${filePath}:${idx + 1}`, message: `Unknown minigame id "${id}".` })
        }
      }
    }
  }
}

function validateTagReference(
  filePath: string,
  line: number,
  tag: TagCommand,
  maps: DataMaps,
  issues: Issue[],
): void {
  if (!tag.id || tag.exit) return
  const refs: Partial<Record<string, Map<string, Record<string, unknown>>>> = {
    scene: maps.scenes,
    character: maps.characters,
    bgm: maps.audio,
    sfx: maps.audio,
    ambience: maps.audio,
    voice: maps.audio,
    minigame: maps.minigames,
  }
  const map = refs[tag.type]
  if (map && !map.has(tag.id)) {
    issues.push({ severity: 'error', path: `${filePath}:${line}`, message: `Unknown ${tag.type} id "${tag.id}".` })
  }
}

async function loadConfig(gameDir: string): Promise<GameConfig> {
  const configPath = join(gameDir, 'game.config.ts')
  const mod = await import(pathToFileURL(configPath).href) as { default?: GameConfig }
  if (!mod.default) throw new Error(`No default export found in ${configPath}`)
  return mod.default
}

function validateConfig(gameDir: string, config: GameConfig, issues: Issue[]): void {
  if (!config.id) issues.push({ severity: 'error', path: 'game.config.ts', message: 'Missing config.id.' })
  if (!config.title) issues.push({ severity: 'error', path: 'game.config.ts', message: 'Missing config.title.' })
  if (!config.story?.defaultLocale) issues.push({ severity: 'error', path: 'game.config.ts', message: 'Missing story.defaultLocale.' })
  const locales = config.story?.locales ?? {}
  for (const [locale, storyPath] of Object.entries(locales)) {
    const fullPath = join(gameDir, storyPath)
    if (!existsSync(fullPath)) {
      issues.push({ severity: 'error', path: 'game.config.ts', message: `Story path for locale "${locale}" does not exist: ${storyPath}` })
    }
  }
  const defaultStory = locales[config.story?.defaultLocale ?? '']
  if (!defaultStory) {
    issues.push({ severity: 'error', path: 'game.config.ts', message: `No story path for default locale "${config.story?.defaultLocale}".` })
  }
}

function printIssues(gameDir: string, issues: Issue[]): void {
  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')
  for (const issue of issues) {
    const rel = issue.path.startsWith(ROOT) ? relative(gameDir, issue.path) : issue.path
    const label = issue.severity === 'error' ? 'ERROR' : 'WARN'
    console.log(`  [${label}] ${rel}: ${issue.message}`)
  }
  console.log(`\nDoctor summary: ${errors.length} error(s), ${warnings.length} warning(s).`)
}

export async function doctor(gameId?: string): Promise<void> {
  if (!gameId) {
    gameId = detectGameId() ?? undefined
    if (!gameId) {
      console.error('Please specify a gameId: bun manager/cli.ts doctor <gameId>')
      process.exit(1)
    }
  }

  const gameDir = join(ROOT, 'games', gameId)
  const issues: Issue[] = []
  if (!existsSync(gameDir)) {
    console.error(`Game "${gameId}" does not exist at games/${gameId}/`)
    process.exit(1)
  }

  console.log(`\nVisual Novel Doctor: ${gameId}\n`)
  const config = await loadConfig(gameDir)
  validateConfig(gameDir, config, issues)
  const maps = loadDataMaps(gameDir, config, issues)
  validateStoryReferences(gameDir, maps, issues)
  printIssues(gameDir, issues)

  if (issues.some(issue => issue.severity === 'error')) {
    process.exit(1)
  }
}
