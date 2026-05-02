import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, relative, resolve } from 'path'
import { pathToFileURL } from 'url'
import yaml from 'js-yaml'
import { TagParser } from '../../framework/TagParser.ts'
import { getAsepriteFrameTags, validateAsepriteAtlas } from '../../framework/engine/AsepriteAtlas.ts'
import { validatePluginManifest } from '../../framework/plugins/PluginRegistry.ts'
import { CORE_TAGS } from '../../framework/plugins/TagRegistry.ts'
import { validateJsonSchema } from '../schemaValidator.ts'
import type { GameConfig } from '../../framework/types.ts'
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
  strict?: boolean
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
  categories: ReturnType<typeof summarizeIssueCategories>
  nextSteps: string[]
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

type RendererKind = 'background' | 'character' | 'transition'
type RendererDeclarations = Record<RendererKind, Set<string>>
type TagDeclarations = Set<string>

const BUILT_IN_RENDERERS: Record<RendererKind, Set<string>> = {
  background: new Set(['static', 'parallax', 'video']),
  character: new Set(['spritesheet-library']),
  transition: new Set(['fade', 'fade-color', 'slide', 'wipe', 'cut']),
}

const RECOMMENDED_CHARACTER_EDITORIAL_FIELDS = Object.freeze([
  'role',
  'age',
  'gender',
  'tags',
  'physicalDescription',
  'expressionsText',
  'outfit',
  'palette',
  'personality',
  'traits',
  'motivations',
  'fears',
  'internalConflict',
  'backstory',
  'keyEvents',
  'arcInitial',
  'arcBreak',
  'arcFinal',
  'characterSheet',
])

const DATA_ID_PATTERN = /^[a-z0-9-]+$/

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

function validateSceneAudioCue(
  gameDir: string,
  filePath: string,
  value: unknown,
  issues: Issue[],
  maps: DataMaps,
  label: string,
): void {
  if (typeof value === 'string') {
    if (value.length === 0 || maps.audio.has(value)) return
    if (value.includes('/') || value.includes('.')) {
      checkAsset(gameDir, filePath, value, issues, label)
      return
    }
    issues.push({
      severity: 'warning',
      path: filePath,
      code: 'scene_audio_unknown',
      message: `${label} references unknown audio id "${value}".`,
      suggestion: `Create data/audio/${value}.md, set ${label.toLowerCase()} to a file path, or update the scene audio reference.`,
    })
    return
  }

  const cue = asRecord(value)
  if (!cue) return
  checkAsset(gameDir, filePath, cue['file'], issues, label)
  const id = typeof cue['id'] === 'string' ? cue['id'] : ''
  if (!cue['file'] && id && !maps.audio.has(id)) {
    issues.push({
      severity: 'warning',
      path: filePath,
      code: 'scene_audio_unknown',
      message: `${label} references unknown audio id "${id}".`,
      suggestion: `Create data/audio/${id}.md, add a file field to this cue, or update the scene audio reference.`,
    })
  }
}

function validateAtlasAsset(
  gameDir: string,
  filePath: string,
  ref: unknown,
  issues: Issue[],
  options: { requireAnimationTags?: boolean; requireGameAssetsMaker?: boolean; expressions?: Record<string, unknown> | null } = {},
): void {
  if (typeof ref !== 'string' || ref.length === 0 || /^https?:\/\//.test(ref)) return
  const resolved = resolveAsset(gameDir, ref)
  if (!existsSync(resolved)) return
  try {
    const atlas = JSON.parse(readFileSync(resolved, 'utf8')) as unknown
    const atlasOptions: { requireAnimationTags?: boolean; requireGameAssetsMaker?: boolean } = {}
    if (options.requireAnimationTags !== undefined) atlasOptions.requireAnimationTags = options.requireAnimationTags
    if (options.requireGameAssetsMaker !== undefined) atlasOptions.requireGameAssetsMaker = options.requireGameAssetsMaker
    for (const issue of validateAsepriteAtlas(atlas, atlasOptions)) {
      issues.push({
        severity: issue.code === 'atlas_version_unsupported' ? 'error' : 'warning',
        path: filePath,
        code: issue.code,
        message: `${issue.message} (${ref})`,
        suggestion: 'Regenerate the atlas with `bun manager/cli.ts assets character-atlas` or align it with aseprite-atlas-v1.',
      })
    }
    validateExpressionReferences(filePath, atlas, options.expressions, issues)
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

function validateExpressionReferences(filePath: string, atlas: unknown, expressions: Record<string, unknown> | null | undefined, issues: Issue[]): void {
  if (!expressions) return
  const tags = new Set(getAsepriteFrameTags(atlas as Parameters<typeof getAsepriteFrameTags>[0]).map(tag => tag.name))
  for (const [expression, rawTag] of Object.entries(expressions)) {
    if (typeof rawTag !== 'string') {
      issues.push({
        severity: 'error',
        path: filePath,
        code: 'atlas_expression_invalid',
        message: `Animation "${expression}" must reference a frame tag string.`,
        suggestion: 'Set each sheet animation value to an Aseprite frameTag or generated frame name.',
      })
      continue
    }
    if (!tags.has(rawTag)) {
      issues.push({
        severity: 'warning',
        path: filePath,
        code: 'atlas_expression_missing',
        message: `Animation "${expression}" references missing atlas frame tag "${rawTag}".`,
        suggestion: 'Update the sheet animations or regenerate the atlas with matching sprite names/frameTags.',
      })
    }
  }
}

function addDataFile(
  kind: keyof DataMaps,
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
  if (kind === 'characters' && !DATA_ID_PATTERN.test(id)) {
    issues.push({
      severity: 'error',
      path: filePath,
      code: 'data_id_invalid',
      message: `Invalid id "${id}". Use lowercase letters, numbers, and hyphens only.`,
      suggestion: `Rename the id to something like "${expectedIdFromPath(filePath).replace(/_/g, '-')}".`,
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

function declaredRenderers(config: GameConfig): RendererDeclarations {
  const declarations: RendererDeclarations = {
    background: new Set(),
    character: new Set(),
    transition: new Set(),
  }
  for (const plugin of config.plugins ?? []) {
    for (const kind of Object.keys(declarations) as RendererKind[]) {
      for (const type of plugin.renderers?.[kind] ?? []) {
        declarations[kind].add(type)
      }
    }
  }
  return declarations
}

function declaredPluginTags(config: GameConfig): TagDeclarations {
  const declarations = new Set<string>()
  for (const plugin of config.plugins ?? []) {
    for (const tag of plugin.tags ?? []) {
      declarations.add(tag)
    }
  }
  return declarations
}

function validateRendererReference(
  declarations: RendererDeclarations,
  filePath: string,
  kind: RendererKind,
  rawType: unknown,
  issues: Issue[],
): void {
  if (typeof rawType !== 'string' || rawType.length === 0) return
  if (BUILT_IN_RENDERERS[kind].has(rawType)) return
  if (declarations[kind].has(rawType)) return
  issues.push({
    severity: 'error',
    path: filePath,
    code: 'renderer_unknown',
    message: `Unknown ${kind} renderer type "${rawType}".`,
    suggestion: `Use a built-in renderer or declare "${rawType}" under plugins[].renderers.${kind}.`,
  })
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
  const rendererDeclarations = declaredRenderers(config)
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
      addDataFile(kind as keyof DataMaps, maps[kind as keyof DataMaps], filePath, data, issues)
      validateDataFile(kind as keyof DataMaps, gameDir, filePath, data, issues, maps, rendererDeclarations)
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
  rendererDeclarations: RendererDeclarations,
): void {
  if (kind === 'characters') {
    validateCharacterEditorialFields(filePath, data, issues)
    validateCharacterSheetAssets(gameDir, filePath, data, issues)
    const animation = asRecord(data['animation'])
    if (!animation && !Array.isArray(data['layers'])) {
      issues.push({ severity: 'warning', path: filePath, code: 'character_no_renderer', message: 'Character has no animation or layers.' })
    }
    if (animation) {
      validateRendererReference(rendererDeclarations, filePath, 'character', animation['type'], issues)
      if (animation['type'] === 'spritesheet-library') {
        const stateSheets = asRecord(animation['states']) ?? {}
        const animationSheets = asRecord(animation['animationSheets']) ?? {}
        if (Object.keys(stateSheets).length === 0 && Object.keys(animationSheets).length === 0) {
          issues.push({ severity: 'warning', path: filePath, code: 'character_spritesheet_library_empty', message: 'Character spritesheet library has no state or animation sheets.' })
        }
        for (const [sheetName, rawSheet] of Object.entries(stateSheets)) {
          const sheet = asRecord(rawSheet)
          if (!sheet) {
            issues.push({ severity: 'error', path: filePath, code: 'character_spritesheet_sheet_invalid', message: `State spritesheet "${sheetName}" must be an object.` })
            continue
          }
          checkAsset(gameDir, filePath, sheet['file'], issues, `Character state spritesheet "${sheetName}" file`)
          checkAsset(gameDir, filePath, sheet['atlas'], issues, `Character state spritesheet "${sheetName}" atlas`)
          if (typeof sheet['atlas'] === 'string' && sheet['atlas'].length > 0) {
            validateAtlasAsset(gameDir, filePath, sheet['atlas'], issues, {
              requireGameAssetsMaker: false,
              expressions: asRecord(sheet['sprites']),
            })
          }
        }
        for (const [sheetName, rawSheet] of Object.entries(animationSheets)) {
          const sheet = asRecord(rawSheet)
          if (!sheet) {
            issues.push({ severity: 'error', path: filePath, code: 'character_spritesheet_sheet_invalid', message: `Animation spritesheet "${sheetName}" must be an object.` })
            continue
          }
          checkAsset(gameDir, filePath, sheet['file'], issues, `Character animation spritesheet "${sheetName}" file`)
          checkAsset(gameDir, filePath, sheet['atlas'], issues, `Character animation spritesheet "${sheetName}" atlas`)
          if (typeof sheet['atlas'] === 'string' && sheet['atlas'].length > 0) {
            validateAtlasAsset(gameDir, filePath, sheet['atlas'], issues, {
              requireGameAssetsMaker: false,
              expressions: asRecord(sheet['actions']),
            })
          }
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
    validateRendererReference(rendererDeclarations, filePath, 'background', background['type'], issues)
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
    const audio = asRecord(data['audio'])
    if (audio) {
      validateSceneAudioCue(gameDir, filePath, audio['ambience'], issues, maps, 'Scene ambience audio')
      validateSceneAudioCue(gameDir, filePath, audio['music'] ?? audio['bgm'], issues, maps, 'Scene music audio')
      const sfx = audio['sfx']
      const sfxRecord = asRecord(sfx)
      if (sfxRecord && !('file' in sfxRecord) && !('id' in sfxRecord)) {
        for (const [name, cue] of Object.entries(sfxRecord)) {
          validateSceneAudioCue(gameDir, filePath, cue, issues, maps, `Scene SFX "${name}" audio`)
        }
      } else {
        validateSceneAudioCue(gameDir, filePath, sfx, issues, maps, 'Scene SFX audio')
      }
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

function validateCharacterSheetAssets(gameDir: string, filePath: string, data: Record<string, unknown>, issues: Issue[]): void {
  const characterSheet = asRecord(data['characterSheet'])
  if (!characterSheet) return
  checkAsset(gameDir, filePath, characterSheet['main'], issues, 'Character sheet main image')
  const concepts = Array.isArray(characterSheet['concepts']) ? characterSheet['concepts'] : []
  concepts.forEach((ref, index) => checkAsset(gameDir, filePath, ref, issues, `Character sheet concept image ${index + 1}`))
  const generated = Array.isArray(characterSheet['generated']) ? characterSheet['generated'] : []
  generated.forEach((ref, index) => checkAsset(gameDir, filePath, ref, issues, `Character sheet generated image ${index + 1}`))
}

function validateCharacterEditorialFields(filePath: string, data: Record<string, unknown>, issues: Issue[]): void {
  const missing = RECOMMENDED_CHARACTER_EDITORIAL_FIELDS.filter(field => !(field in data))
  if (missing.length === 0) return
  issues.push({
    severity: 'info',
    path: filePath,
    code: 'character_editorial_fields_missing',
    message: `Character is missing Studio editorial fields: ${missing.join(', ')}.`,
    suggestion: 'Open and save the character in Biwa Studio, or add the editorial metadata block from framework/docs/characters.schema.md.',
  })
}

function validateStoryReferences(gameDir: string, config: GameConfig, maps: DataMaps, issues: Issue[]): void {
  const rendererDeclarations = declaredRenderers(config)
  const tagDeclarations = declaredPluginTags(config)
  const storyFiles = walkFiles(join(gameDir, 'story'), '.ink')
  for (const filePath of storyFiles) {
    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)
    for (const [idx, line] of lines.entries()) {
      const trimmed = line.trim()
      if (trimmed.startsWith('#')) {
        const tag = TagParser.parseOne(trimmed)
        if (tag) validateTagReference(filePath, idx + 1, tag, maps, issues, rendererDeclarations, tagDeclarations)
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
  rendererDeclarations: RendererDeclarations,
  tagDeclarations: TagDeclarations,
): void {
  if (!CORE_TAGS.has(tag.type) && !tagDeclarations.has(tag.type)) {
    issues.push({
      severity: 'error',
      path: `${filePath}:${line}`,
      code: 'tag_unknown',
      message: `Unknown Ink tag "${tag.type}".`,
      suggestion: `Use a core tag or declare "${tag.type}" under plugins[].tags.`,
    })
    return
  }
  if (tagDeclarations.has(tag.type) && !CORE_TAGS.has(tag.type)) return
  if (tag.type === 'transition') {
    validateRendererReference(rendererDeclarations, `${filePath}:${line}`, 'transition', tag.id, issues)
    return
  }
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
  const mod = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}-${Math.random()}`) as { default?: GameConfig }
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
  validatePluginConfig(gameDir, config, issues)
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

function validatePluginConfig(gameDir: string, config: GameConfig, issues: Issue[]): void {
  const plugins = config.plugins ?? []
  const ids = new Set<string>()
  for (const [idx, plugin] of plugins.entries()) {
    const path = `game.config.ts:plugins[${idx}]`
    try {
      validatePluginManifest(plugin)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      issues.push({
        severity: 'error',
        path,
        code: 'plugin_manifest_invalid',
        message: err.message,
        suggestion: 'Align the plugin declaration with the framework plugin manifest contract.',
      })
      continue
    }
    if (ids.has(plugin.id)) {
      issues.push({
        severity: 'error',
        path,
        code: 'plugin_duplicate',
        message: `Duplicate plugin id "${plugin.id}".`,
        suggestion: 'Each plugin id must be declared only once.',
      })
    }
    ids.add(plugin.id)

    if (plugin.id === 'official-devtools') {
      issues.push({
        severity: 'warning',
        path,
        code: 'devtools_plugin_enabled',
        message: 'Official runtime devtools plugin is enabled.',
        suggestion: 'Use officialPlugins.devtools() only in development builds or suppress this warning intentionally.',
      })
    }

    if (plugin.entry && /^https?:\/\//.test(plugin.entry)) {
      issues.push({
        severity: 'error',
        path,
        code: 'plugin_entry_remote',
        message: `Remote plugin entries are not allowed: ${plugin.entry}`,
        suggestion: 'Use a trusted local plugin entry inside the game directory.',
      })
    } else if (plugin.entry) {
      const entryPath = resolve(gameDir, plugin.entry)
      if (!entryPath.startsWith(resolve(gameDir))) {
        issues.push({
          severity: 'error',
          path,
          code: 'plugin_entry_outside_game',
          message: `Plugin entry must stay inside the game directory: ${plugin.entry}`,
          suggestion: 'Move the plugin under the game folder or update plugins[].entry.',
        })
        continue
      }
      if (!existsSync(entryPath)) {
        issues.push({
          severity: 'error',
          path,
          code: 'plugin_entry_missing',
          message: `Plugin entry not found: ${plugin.entry}`,
          suggestion: 'Create the plugin entry file or update plugins[].entry.',
        })
      }
    }
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
  if (issue.message.startsWith('Plugin ') || issue.message.includes('plugin')) return issue.code ?? 'plugin_invalid'
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

function issueCategory(issue: Issue): string {
  const code = issue.code ?? inferIssueCode(issue)
  if (code.startsWith('config_') || code === 'invalid_distribution_mode') return 'config'
  if (code.startsWith('plugin_') || code === 'devtools_plugin_enabled' || code === 'renderer_unknown' || code === 'tag_unknown') return 'plugins'
  if (code.startsWith('asset_') || code.startsWith('atlas_') || code.includes('_missing')) return 'assets'
  if (code.startsWith('story_') || issue.path.includes('/story/') || issue.path.includes('story/')) return 'story'
  if (code.startsWith('minigame_')) return 'minigames'
  if (code.startsWith('data_') || code.startsWith('frontmatter_') || code === 'id_filename_mismatch') return 'data'
  return 'general'
}

export function summarizeIssueCategories(issues: Issue[]): Record<string, Record<Severity, number>> {
  const categories: Record<string, Record<Severity, number>> = {}
  for (const issue of issues) {
    const category = issueCategory(issue)
    categories[category] ??= { error: 0, warning: 0, info: 0 }
    categories[category][issue.severity]++
  }
  return categories
}

export function suggestNextSteps(issues: Issue[]): string[] {
  const codes = new Set(issues.filter(issue => issue.severity !== 'info').map(issue => issue.code ?? inferIssueCode(issue)))
  const steps: string[] = []
  if (codes.has('asset_missing')) steps.push('Add missing files under assets/ or update the referenced data paths.')
  if (Array.from(codes).some(code => code.startsWith('atlas_'))) steps.push('Regenerate atlas JSON with `bun manager/cli.ts assets character-atlas <gameId> <characterId>`.')
  if (codes.has('renderer_unknown')) steps.push('Enable or declare a renderer plugin, then verify with `bun manager/cli.ts plugins list <gameId>`.')
  if (codes.has('tag_unknown')) steps.push('Enable the plugin that owns the Ink tag or declare it under plugins[].tags.')
  if (Array.from(codes).some(code => code.startsWith('plugin_'))) steps.push('Run `bun manager/cli.ts plugins validate <gameId>` to inspect plugin declarations.')
  if (Array.from(codes).some(code => code.startsWith('config_') || code === 'invalid_distribution_mode')) steps.push('Align game.config.ts with `framework/docs/game.config.schema.md`.')
  if (Array.from(codes).some(code => code.startsWith('story_'))) steps.push('Check story locale paths and referenced ids in Ink.')
  return steps
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
  const categories = summarizeIssueCategories(issues)
  const categoryEntries = Object.entries(categories)
  if (categoryEntries.length > 0) {
    console.log('\nBy category:')
    for (const [category, counts] of categoryEntries) {
      console.log(`  ${category}: ${counts.error} error(s), ${counts.warning} warning(s), ${counts.info} info(s)`)
    }
  }
  const nextSteps = suggestNextSteps(issues)
  if (nextSteps.length > 0) {
    console.log('\nNext steps:')
    for (const step of nextSteps) console.log(`  - ${step}`)
  }
}

function issuePathForReport(gameDir: string, issue: Issue): string {
  return issue.path.startsWith(ROOT) ? relative(gameDir, issue.path) : issue.path
}

export function createDoctorJsonReport(gameId: string, gameDir: string, issues: Issue[]): DoctorJsonReport {
  return {
    gameId,
    summary: summarizeIssues(issues),
    categories: summarizeIssueCategories(issues),
    nextSteps: suggestNextSteps(issues),
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
  validateStoryReferences(gameDir, config, maps, issues)
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
    if (arg === '--strict') {
      options.strict = true
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

  const shouldFail = parsed.options.strict
    ? issues.some(issue => issue.severity === 'error' || issue.severity === 'warning')
    : issues.some(issue => issue.severity === 'error')
  if (shouldFail) {
    process.exit(1)
  }
}
