import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import { pathToFileURL } from 'url'
import yaml from 'js-yaml'
import { TagParser } from '../../framework/TagParser.ts'
import { validateAsepriteAtlas } from '../../framework/engine/AsepriteAtlas.ts'
import { validateJsonSchema } from '../schemaValidator.ts'
import type { GameConfig } from '../../framework/types/game-config.d.ts'
import type { TagCommand } from '../../framework/TagParser.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const GAME_CONFIG_SCHEMA_PATH = join(ROOT, 'framework', 'schemas', 'game.config.schema.json')

export type Severity = 'error' | 'warning' | 'info'

export interface Issue {
  severity: Severity
  path: string
  message: string
  code?: string
  suggestion?: string
  suppressed?: boolean
  suppressionReason?: string
}

export interface DoctorOptions {
  json?: boolean
}

export interface DoctorJsonIssue {
  severity: Severity
  path: string
  message: string
  code: string
  suggestion?: string
  suppressed?: boolean
  suppressionReason?: string
}

export interface DoctorJsonReport {
  gameId: string
  summary: ReturnType<typeof summarizeIssues>
  issues: DoctorJsonIssue[]
}

interface DataMaps {
  characters: Map<string, Record<string, unknown>>
  scenes: Map<string, Record<string, unknown>>
  audio: Map<string, Record<string, unknown>>
  minigames: Map<string, Record<string, unknown>>
  gallery: Map<string, Record<string, unknown>>
  music: Map<string, Record<string, unknown>>
  replay: Map<string, Record<string, unknown>>
}

interface DiagnosticSuppression {
  code?: string
  path?: string
  message?: string
  reason: string
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
    issues.push({
      severity: 'error',
      path: filePath,
      message: 'Missing YAML frontmatter block.',
      suggestion: 'Add a frontmatter block delimited by --- at the top of the file.',
    })
    return null
  }
  try {
    const data = yaml.load(match[1]!) as unknown
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      issues.push({
        severity: 'error',
        path: filePath,
        message: 'Frontmatter must be an object.',
        suggestion: 'Use key/value YAML, for example: id: example',
      })
      return null
    }
    return data as Record<string, unknown>
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    issues.push({
      severity: 'error',
      path: filePath,
      message: `Invalid YAML frontmatter: ${err.message}`,
      suggestion: 'Check indentation, quotes and list syntax in the YAML block.',
    })
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
      code: 'asset_missing',
      message: `${label} not found: ${ref}`,
      suggestion: `Add the file under assets/ or update the ${label.toLowerCase()} path.`,
    })
  }
}

function validateAtlasAsset(gameDir: string, filePath: string, ref: unknown, issues: Issue[], requireAnimationTags = false): void {
  if (typeof ref !== 'string' || ref.length === 0 || /^https?:\/\//.test(ref)) return
  const resolved = resolveAsset(gameDir, ref)
  if (!existsSync(resolved)) return
  try {
    const atlas = JSON.parse(readFileSync(resolved, 'utf8')) as unknown
    for (const issue of validateAsepriteAtlas(atlas, { requireAnimationTags })) {
      issues.push({
        severity: issue.code === 'atlas_version_unsupported' ? 'error' : 'warning',
        path: filePath,
        code: issue.code,
        message: `${issue.message} (${ref})`,
        suggestion: 'Regenerate the atlas with `bun manager/cli.ts assets character-atlas` or align it with aseprite-atlas-v1.',
      })
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    issues.push({
      severity: 'error',
      path: filePath,
      code: 'atlas_json_invalid',
      message: `Invalid character atlas JSON: ${ref}: ${err.message}`,
      suggestion: 'Regenerate the atlas with `bun manager/cli.ts assets character-atlas` or fix the JSON syntax.',
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
    issues.push({
      severity: 'error',
      path: filePath,
      message: 'Missing required string field: id.',
      suggestion: `Add id: ${expectedIdFromPath(filePath)} to the frontmatter.`,
    })
    return
  }
  const expected = filePath.split('/').pop()!.replace(/\.md$/, '')
  if (expected !== id) {
    issues.push({ severity: 'warning', path: filePath, code: 'id_filename_mismatch', message: `File name "${expected}" does not match id "${id}".` })
  }
  if (map.has(id)) {
    issues.push({
      severity: 'error',
      path: filePath,
      message: `Duplicate id: ${id}.`,
      suggestion: 'Rename one file/id pair so every content id is unique.',
    })
    return
  }
  map.set(id, data)
}

function expectedIdFromPath(filePath: string): string {
  return filePath.split('/').pop()!.replace(/\.md$/, '')
}

function loadDataMaps(gameDir: string, config: GameConfig, issues: Issue[]): DataMaps {
  const maps: DataMaps = {
    characters: new Map(),
    scenes: new Map(),
    audio: new Map(),
    minigames: new Map(),
    gallery: new Map(),
    music: new Map(),
    replay: new Map(),
  }

  const dataConfig = config.data ?? {}
  const dirs = {
    characters: dataConfig.characters,
    scenes: dataConfig.scenes,
    audio: dataConfig.audio,
    minigames: dataConfig.minigames,
    gallery: dataConfig.gallery,
    music: dataConfig.music,
    replay: dataConfig.replay,
  } as const

  for (const [kind, configuredDir] of Object.entries(dirs)) {
    if (!configuredDir) continue
    const dir = join(gameDir, configuredDir)
    if (!existsSync(dir)) {
      issues.push({
        severity: 'error',
        path: dir,
        message: `Configured ${kind} directory does not exist.`,
        suggestion: `Create the directory or update data.${kind} in game.config.ts.`,
      })
      continue
    }
    for (const filePath of walkFiles(dir, '.md')) {
      const data = parseFrontmatter(filePath, issues)
      if (!data) continue
      addDataFile(maps[kind as keyof DataMaps], filePath, data, issues)
      validateDataFile(kind as keyof DataMaps, gameDir, filePath, data, issues, maps)
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
  maps: DataMaps,
): void {
  if (kind === 'characters') {
    const animation = asRecord(data['animation'])
    if (!animation && !Array.isArray(data['layers'])) {
      issues.push({ severity: 'warning', path: filePath, code: 'character_no_renderer', message: 'Character has no animation or layers.' })
    }
    if (animation) {
      checkAsset(gameDir, filePath, animation['file'], issues, 'Character animation file')
      checkAsset(gameDir, filePath, animation['atlas'], issues, 'Character atlas')
      if (animation['type'] === 'spritesheet') {
        validateAtlasAsset(gameDir, filePath, animation['atlas'], issues)
      }
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
      issues.push({
        severity: 'error',
        path: filePath,
        message: 'Scene missing required background object.',
        suggestion: 'Add background: { type: static, image: ... } or another supported background renderer.',
      })
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
      issues.push({
        severity: 'error',
        path: filePath,
        message: 'Minigame missing required string field: entry.',
        suggestion: 'Set entry to the minigame implementation path, for example minigames/puzzle/Puzzle.ts.',
      })
    } else {
      const entry = data['entry']
      const sourceEntry = entry.endsWith('.js') ? entry.replace(/\.js$/, '.ts') : entry
      if (!existsSync(join(gameDir, sourceEntry)) && !existsSync(join(gameDir, entry))) {
        issues.push({
          severity: 'warning',
          path: filePath,
          code: 'minigame_entry_missing',
          message: `Minigame entry not found: ${entry}`,
          suggestion: 'Create the implementation file or update the minigame entry path.',
        })
      }
    }
    if (!asRecord(data['results'])) {
      issues.push({
        severity: 'error',
        path: filePath,
        message: 'Minigame missing required results object.',
        suggestion: 'Declare expected result fields under results: so creators know what Ink receives.',
      })
    }
  }

  if (kind === 'gallery') {
    if (typeof data['image'] !== 'string' && typeof data['file'] !== 'string') {
      issues.push({
        severity: 'error',
        path: filePath,
        message: 'Gallery item missing required image or file field.',
        suggestion: 'Set image: path/to/cg.png or file: path/to/cg.png.',
      })
    }
    checkAsset(gameDir, filePath, data['image'] ?? data['file'], issues, 'Gallery image')
    checkAsset(gameDir, filePath, data['thumbnail'], issues, 'Gallery thumbnail')
  }

  if (kind === 'music') {
    if (typeof data['file'] !== 'string') {
      issues.push({
        severity: 'error',
        path: filePath,
        message: 'Music room track missing required file field.',
        suggestion: 'Set file: audio/bgm/example.ogg.',
      })
    }
    checkAsset(gameDir, filePath, data['file'], issues, 'Music room track')
  }

  if (kind === 'replay') {
    checkAsset(gameDir, filePath, data['thumbnail'], issues, 'Replay thumbnail')
    if (typeof data['sceneId'] === 'string' && !maps.scenes.has(data['sceneId'])) {
      issues.push({
        severity: 'warning',
        path: filePath,
        code: 'replay_scene_unknown',
        message: `Replay scene references unknown scene id "${data['sceneId']}".`,
        suggestion: 'Create a matching scene data file or update sceneId.',
      })
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
          issues.push({
            severity: 'error',
            path: `${filePath}:${idx + 1}`,
            message: `Unknown minigame id "${id}".`,
            suggestion: `Create data/minigames/${id}.md or change the launch_minigame argument.`,
          })
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
    unlock_gallery: maps.gallery,
    unlock_music: maps.music.size > 0 ? maps.music : maps.audio,
    unlock_replay: maps.replay,
  }
  if (tag.type === 'unlock') {
    const kind = typeof tag['kind'] === 'string' ? tag['kind'] : typeof tag['category'] === 'string' ? tag['category'] : 'gallery'
    const unlockRefs: Record<string, Map<string, Record<string, unknown>>> = {
      gallery: maps.gallery,
      music: maps.music.size > 0 ? maps.music : maps.audio,
      replay: maps.replay,
    }
    const unlockMap = unlockRefs[kind]
    if (tag.id && unlockMap && !unlockMap.has(tag.id)) {
      issues.push({
        severity: 'error',
        path: `${filePath}:${line}`,
        message: `Unknown ${kind} unlock id "${tag.id}".`,
        suggestion: `Create a matching data file or update the Ink unlock tag.`,
      })
    }
    return
  }
  const map = refs[tag.type]
  if (map && !map.has(tag.id)) {
    issues.push({
      severity: 'error',
      path: `${filePath}:${line}`,
      message: `Unknown ${tag.type} id "${tag.id}".`,
      suggestion: `Create a matching data file with id: ${tag.id}, or update the Ink tag.`,
    })
  }
}

async function loadConfig(gameDir: string): Promise<GameConfig> {
  const configPath = join(gameDir, 'game.config.ts')
  const mod = await import(pathToFileURL(configPath).href) as { default?: GameConfig }
  if (!mod.default) throw new Error(`No default export found in ${configPath}`)
  return mod.default
}

function validateConfig(gameDir: string, config: GameConfig, issues: Issue[]): void {
  validateGameConfigSchema(config, issues)
  if (!config.id) issues.push({ severity: 'error', path: 'game.config.ts', message: 'Missing config.id.', suggestion: 'Set id to a lowercase slug, for example my-novel.' })
  if (!config.title) issues.push({ severity: 'error', path: 'game.config.ts', message: 'Missing config.title.', suggestion: 'Set title to the player-facing name of the novel.' })
  const mode = config.distribution?.mode
  if (mode && !['standalone', 'portal', 'static', 'embedded'].includes(mode)) {
    issues.push({
      severity: 'error',
      path: 'game.config.ts',
      code: 'invalid_distribution_mode',
      message: `Unsupported distribution.mode "${mode}".`,
      suggestion: 'Use one of: standalone, portal, static, embedded.',
    })
  }
  if (!config.story?.defaultLocale) issues.push({ severity: 'error', path: 'game.config.ts', message: 'Missing story.defaultLocale.', suggestion: 'Set story.defaultLocale to one of the keys in story.locales.' })
  const locales = config.story?.locales ?? {}
  for (const [locale, storyPath] of Object.entries(locales)) {
    const fullPath = join(gameDir, storyPath)
    if (!existsSync(fullPath)) {
      issues.push({
        severity: 'error',
        path: 'game.config.ts',
        message: `Story path for locale "${locale}" does not exist: ${storyPath}`,
        suggestion: `Create ${storyPath} or update story.locales.${locale}.`,
      })
    }
  }
  const defaultStory = locales[config.story?.defaultLocale ?? '']
  if (!defaultStory) {
    issues.push({
      severity: 'error',
      path: 'game.config.ts',
      message: `No story path for default locale "${config.story?.defaultLocale}".`,
      suggestion: 'Make story.defaultLocale match one key in story.locales.',
    })
  }
}

function validateGameConfigSchema(config: GameConfig, issues: Issue[]): void {
  const schema = JSON.parse(readFileSync(GAME_CONFIG_SCHEMA_PATH, 'utf8')) as unknown
  for (const issue of validateJsonSchema(config, schema as Parameters<typeof validateJsonSchema>[1])) {
    issues.push({
      severity: 'error',
      path: issue.path ? `game.config.ts:${issue.path}` : 'game.config.ts',
      code: 'config_schema_invalid',
      message: `Config schema violation: ${issue.message}`,
      suggestion: 'Align game.config.ts with framework/schemas/game.config.schema.json.',
    })
  }
}

function normalisePath(path: string): string {
  return path.replace(/\\/g, '/')
}

function matchesSuppression(issue: Issue, suppression: DiagnosticSuppression, gameDir: string): boolean {
  const relPath = issue.path.startsWith(ROOT) ? relative(gameDir, issue.path) : issue.path
  if (suppression.code && suppression.code !== issue.code) return false
  if (suppression.path && !normalisePath(relPath).includes(normalisePath(suppression.path))) return false
  if (suppression.message && !issue.message.includes(suppression.message)) return false
  return Boolean(suppression.code || suppression.path || suppression.message)
}

function applyDiagnosticSuppressions(gameDir: string, config: GameConfig, issues: Issue[]): void {
  const suppressions = config.diagnostics?.suppress ?? []
  if (!Array.isArray(suppressions) || suppressions.length === 0) return

  for (const issue of issues) {
    if (issue.severity === 'error') continue
    const match = suppressions.find(suppression => matchesSuppression(issue, suppression, gameDir))
    if (!match) continue
    issue.severity = 'info'
    issue.suppressed = true
    issue.suppressionReason = match.reason
  }
}

function inferIssueCode(issue: Issue): string {
  if (issue.code) return issue.code
  if (issue.message === 'Missing YAML frontmatter block.') return 'frontmatter_missing'
  if (issue.message === 'Frontmatter must be an object.') return 'frontmatter_invalid'
  if (issue.message.startsWith('Invalid YAML frontmatter:')) return 'frontmatter_invalid_yaml'
  if (issue.message === 'Missing required string field: id.') return 'data_id_missing'
  if (issue.message.startsWith('Duplicate id:')) return 'data_id_duplicate'
  if (issue.message.endsWith('directory does not exist.')) return 'data_directory_missing'
  if (issue.message === 'Scene missing required background object.') return 'scene_background_missing'
  if (issue.message === 'Minigame missing required string field: entry.') return 'minigame_entry_missing'
  if (issue.message === 'Minigame missing required results object.') return 'minigame_results_missing'
  if (issue.message.startsWith('Unknown minigame id')) return 'story_minigame_unknown'
  if (issue.message.startsWith('Unknown ') && issue.message.includes(' id "')) return 'story_reference_unknown'
  if (issue.message === 'Missing config.id.') return 'config_id_missing'
  if (issue.message.startsWith('Config schema violation:')) return 'config_schema_invalid'
  if (issue.message === 'Missing config.title.') return 'config_title_missing'
  if (issue.message === 'Missing story.defaultLocale.') return 'config_default_locale_missing'
  if (issue.message.startsWith('Story path for locale')) return 'story_locale_path_missing'
  if (issue.message.startsWith('No story path for default locale')) return 'story_default_locale_unmapped'
  return 'diagnostic'
}

function assignIssueCodes(issues: Issue[]): void {
  for (const issue of issues) {
    issue.code = inferIssueCode(issue)
  }
}

export function summarizeIssues(issues: Issue[]): Record<Severity, number> & { suppressed: number } {
  return {
    error: issues.filter(i => i.severity === 'error').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
    suppressed: issues.filter(i => i.suppressed).length,
  }
}

export function printIssues(gameDir: string, issues: Issue[]): void {
  const summary = summarizeIssues(issues)
  for (const issue of issues) {
    const rel = issue.path.startsWith(ROOT) ? relative(gameDir, issue.path) : issue.path
    const label = issue.severity === 'error' ? 'ERROR' : issue.severity === 'warning' ? 'WARN' : 'INFO'
    const code = issue.code ? ` ${issue.code}` : ''
    console.log(`  [${label}${code}] ${rel}: ${issue.message}`)
    if (issue.suggestion) console.log(`         suggestion: ${issue.suggestion}`)
    if (issue.suppressionReason) console.log(`         suppressed: ${issue.suppressionReason}`)
  }
  console.log(`\nDoctor summary: ${summary.error} error(s), ${summary.warning} warning(s), ${summary.info} info(s), ${summary.suppressed} suppressed.`)
}

function issuePathForReport(gameDir: string, issue: Issue): string {
  return issue.path.startsWith(ROOT) ? relative(gameDir, issue.path) : issue.path
}

export function createDoctorJsonReport(gameId: string, gameDir: string, issues: Issue[]): DoctorJsonReport {
  return {
    gameId,
    summary: summarizeIssues(issues),
    issues: issues.map(issue => ({
      severity: issue.severity,
      path: issuePathForReport(gameDir, issue),
      message: issue.message,
      code: issue.code ?? inferIssueCode(issue),
      ...(issue.suggestion ? { suggestion: issue.suggestion } : {}),
      ...(issue.suppressed ? { suppressed: true } : {}),
      ...(issue.suppressionReason ? { suppressionReason: issue.suppressionReason } : {}),
    })),
  }
}

export async function validateGame(gameId: string): Promise<{ gameDir: string; config: GameConfig; issues: Issue[] }> {
  const gameDir = join(ROOT, 'games', gameId)
  const issues: Issue[] = []
  if (!existsSync(gameDir)) {
    throw new Error(`Game "${gameId}" does not exist at games/${gameId}/`)
  }

  const config = await loadConfig(gameDir)
  validateConfig(gameDir, config, issues)
  const maps = loadDataMaps(gameDir, config, issues)
  validateStoryReferences(gameDir, maps, issues)
  assignIssueCodes(issues)
  applyDiagnosticSuppressions(gameDir, config, issues)
  return { gameDir, config, issues }
}

function parseDoctorArgs(args: string[]): { gameId: string | undefined; options: DoctorOptions } {
  let gameId: string | undefined
  const options: DoctorOptions = {}
  for (const arg of args) {
    if (arg === '--json') {
      options.json = true
      continue
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown doctor option: ${arg}`)
    }
    if (!gameId) {
      gameId = arg
      continue
    }
    throw new Error(`Unexpected doctor argument: ${arg}`)
  }
  return { gameId, options }
}

export async function doctor(...args: string[]): Promise<void> {
  const parsed = parseDoctorArgs(args)
  let gameId = parsed.gameId
  if (!gameId) {
    gameId = detectGameId() ?? undefined
    if (!gameId) {
      console.error('Please specify a gameId: bun manager/cli.ts doctor <gameId>')
      process.exit(1)
    }
  }

  const { gameDir, issues } = await validateGame(gameId)
  if (parsed.options.json) {
    console.log(JSON.stringify(createDoctorJsonReport(gameId, gameDir, issues), null, 2))
  } else {
    console.log(`\nVisual Novel Doctor: ${gameId}\n`)
    printIssues(gameDir, issues)
  }

  if (issues.some(issue => issue.severity === 'error')) {
    process.exit(1)
  }
}
