import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { basename, dirname, extname, join, normalize, relative } from 'path'
import yaml from 'js-yaml'
import { validateGame } from '../../manager/commands/doctor.ts'
import { createCharacterAtlas } from '../../manager/commands/assets.ts'
import { buildAsepriteAnimationAtlas, buildAsepriteAtlas, getAsepriteAtlasKind, getAsepriteFrameItems, getAsepriteFrameTags } from '../../framework/engine/AsepriteAtlas.ts'
import { imageExtension, readOpenAiImagesSettingsForGeneration } from './settings.ts'
import type { AsepriteAtlas } from '../../framework/engine/AsepriteAtlas.ts'
import type {
  StudioAsepriteAtlasKind,
  StudioCharacterAtlasResponse,
  StudioCharacterAtlasSummary,
  StudioCharacterDraft,
  StudioCharacterItem,
  StudioCharacterResponse,
  StudioCharacterSpritesheetAsset,
  StudioCharacterSpritesheetDeleteResponse,
  StudioCharacterSpritesheetFolderResponse,
  StudioCharacterSpritesheetGenerateRequest,
  StudioCharacterSpritesheetGenerateResponse,
  StudioCharacterSpritesheetUploadResponse,
  StudioCharacterSheetArtType,
  StudioCharacterSheetDeleteResponse,
  StudioCharacterSheetEditResponse,
  StudioCharacterSheetGenerateResponse,
  StudioGeneratedCharacterSheetImage,
  StudioCharacterSheetAssets,
  StudioCharacterSheetAssetUrls,
  StudioCharacterSheetUploadResponse,
} from '../shared/types.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const GAMES_DIR = join(ROOT, 'games')
const DEFAULT_CHARACTER_SHEET_ART_TYPES = Object.freeze(['conceptArt'] satisfies StudioCharacterSheetArtType[])
const CHARACTER_SHEET_ART_TYPE_ORDER = Object.freeze(['conceptArt', 'silhouetteSketch', 'characterSheet', 'actionPoses'] satisfies StudioCharacterSheetArtType[])
const CHARACTER_SHEET_EDIT_SLUG = 'edit'
const CHARACTER_SHEET_ART_INSTRUCTIONS = Object.freeze({
  conceptArt: {
    label: 'Concept Art',
    slug: 'concept-art',
    prompt: 'Create polished visual novel character concept art. Show a full-body character design with clear costume, face, materials, palette, and mood. Single character, production-ready, no text.',
  },
  silhouetteSketch: {
    label: 'Silhouette Sketch',
    slug: 'silhouette-sketch',
    prompt: 'Create a clean silhouette exploration sheet. Focus on readable black shapes, body proportions, distinctive outline, hairstyle, clothing mass, and 4-6 small silhouette variants. Minimal rendering, no final colors.',
  },
  characterSheet: {
    label: 'Character Sheet',
    slug: 'character-sheet',
    prompt: 'Create a production character sheet. Include front-facing full body, neutral expression, detail callouts, color palette blocks, and concise visual turn-around information. Keep it readable and organized, no written labels unless essential.',
  },
  actionPoses: {
    label: 'Action Poses',
    slug: 'action-poses',
    prompt: 'Create an action pose exploration sheet. Show the same character in 3-5 dynamic poses with expressive movement, readable costume consistency, and strong silhouette clarity. No background scene.',
  },
} satisfies Record<StudioCharacterSheetArtType, { label: string; slug: string; prompt: string }>)

function assertGameId(gameId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(gameId)) throw new Error(`Invalid game id: ${gameId}`)
}

function charactersDir(gameId: string): string {
  assertGameId(gameId)
  return join(GAMES_DIR, gameId, 'data', 'characters')
}

function assetsDir(gameId: string): string {
  assertGameId(gameId)
  return join(GAMES_DIR, gameId, 'assets')
}

function normalizeCharacterPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

function resolveCharacterFile(gameId: string, path: string): string {
  const baseDir = charactersDir(gameId)
  const normalizedPath = normalizeCharacterPath(path)
  if (!normalizedPath.endsWith('.md')) throw new Error('Character path must point to a .md file.')
  const resolved = normalize(join(baseDir, normalizedPath))
  if (!resolved.startsWith(baseDir)) throw new Error('Character path escapes the project characters directory.')
  return resolved
}

function resolveAssetPath(gameId: string, path: string): string {
  const baseDir = assetsDir(gameId)
  const normalizedPath = path.replace(/\\/g, '/').replace(/^\/+/, '')
  const resolved = normalize(join(baseDir, normalizedPath))
  if (!resolved.startsWith(baseDir)) throw new Error('Character asset path escapes the project assets directory.')
  return resolved
}

function frontmatterFromMarkdown(text: string): { data: Record<string, unknown>; body: string } {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) throw new Error('Character file is missing YAML frontmatter.')
  const parsed = yaml.load(match[1]!) as unknown
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Character frontmatter must be an object.')
  }
  return { data: parsed as Record<string, unknown>, body: match[2] ?? '' }
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function numberValue(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stringMapKeys(value: unknown): string[] {
  const record = recordValue(value)
  return record ? Object.keys(record).filter(Boolean) : []
}

function stringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string' && item.trim().length > 0) as string[]
  if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean)
  return []
}

function atlasKindValue(value: unknown): StudioAsepriteAtlasKind {
  return value === 'Animation' ? 'Animation' : 'Visual Novel'
}

function animationDirectionValue(value: unknown): 'forward' | 'reverse' | 'pingpong' {
  return value === 'reverse' || value === 'pingpong' ? value : 'forward'
}

function animationTagsValue(
  value: StudioCharacterSpritesheetGenerateRequest['animationTags'],
  frameCount: number,
  fallbackNames: string[],
  framesPerTag: number,
) {
  const tags = (value ?? []).map((tag, index) => {
    const rawFrom = Math.floor(Number(tag.from))
    const rawTo = Math.floor(Number(tag.to))
    const from = Math.max(0, Math.min(frameCount - 1, Number.isFinite(rawFrom) ? rawFrom : 0))
    const to = Math.max(from, Math.min(frameCount - 1, Number.isFinite(rawTo) ? rawTo : from))
    return {
      name: (tag.name || `${fallbackNames[0] || 'animation'}_${index + 1}`).trim(),
      from,
      to,
      direction: animationDirectionValue(tag.direction),
      color: tag.color || '#000000ff',
    }
  }).filter(tag => tag.name.length > 0)
  if (tags.length > 0) return tags
  const names = fallbackNames.length > 0 ? fallbackNames : ['idle']
  return names.map((name, index) => {
    const from = Math.min(frameCount - 1, index * framesPerTag)
    return {
      name: name || `animation_${index + 1}`,
      from,
      to: Math.min(frameCount - 1, from + framesPerTag - 1),
      direction: 'forward' as const,
      color: '#000000ff',
    }
  })
}

function characterSheetAssets(value: unknown): StudioCharacterSheetAssets {
  const record = recordValue(value)
  return {
    main: typeof record?.['main'] === 'string' ? record['main'] : '',
    concepts: stringArrayValue(record?.['concepts']),
    generated: stringArrayValue(record?.['generated']),
  }
}

function stringValue(data: Record<string, unknown>, key: string): string {
  return typeof data[key] === 'string' ? data[key] : ''
}

function animationRecord(data: Record<string, unknown>): Record<string, unknown> {
  return recordValue(data['animation']) ?? {}
}

function sheetCollection(animation: Record<string, unknown>, atlasKind: StudioAsepriteAtlasKind): Record<string, unknown> {
  return recordValue(animation[atlasKind === 'Animation' ? 'animationSheets' : 'states']) ?? {}
}

function defaultSheetKey(animation: Record<string, unknown>, atlasKind: StudioAsepriteAtlasKind): string {
  const key = atlasKind === 'Animation' ? 'defaultAnimationSheet' : 'defaultStateSheet'
  return typeof animation[key] === 'string' ? animation[key] : 'Main'
}

function activeSpritesheet(animation: Record<string, unknown>, atlasKind: StudioAsepriteAtlasKind): Record<string, unknown> | null {
  const sheets = sheetCollection(animation, atlasKind)
  const defaultSheet = defaultSheetKey(animation, atlasKind)
  return recordValue(sheets[defaultSheet]) ?? recordValue(sheets['Main']) ?? recordValue(Object.values(sheets)[0])
}

function expressionNames(data: Record<string, unknown>): string[] {
  const animation = animationRecord(data)
  const sheets = sheetCollection(animation, 'Visual Novel')
  const defaultSheet = defaultSheetKey(animation, 'Visual Novel')
  const activeSheet = recordValue(sheets[defaultSheet]) ?? recordValue(sheets['Main']) ?? recordValue(Object.values(sheets)[0])
  const activeAnimations = stringMapKeys(activeSheet?.['sprites'])
  if (activeAnimations.length > 0) return activeAnimations
  const allAnimations = Object.values(sheets).flatMap(sheet => stringMapKeys(recordValue(sheet)?.['sprites']))
  if (allAnimations.length > 0) return [...new Set(allAnimations)]
  const defaultExpression = typeof data['defaultExpression'] === 'string' ? data['defaultExpression'] : ''
  return defaultExpression ? [defaultExpression] : []
}

function firstStringFromRecord(value: unknown): string | null {
  const record = recordValue(value)
  if (!record) return null
  const first = Object.values(record).find(item => typeof item === 'string')
  return typeof first === 'string' ? first : null
}

function previewAssetPath(data: Record<string, unknown>): string | null {
  const animation = animationRecord(data)
  const sheet = activeSpritesheet(animation, 'Visual Novel') ?? activeSpritesheet(animation, 'Animation')
  if (typeof sheet?.['file'] === 'string') return sheet['file']
  const layers = data['layers']
  if (Array.isArray(layers)) {
    for (const layer of layers) {
      const layerAnimation = recordValue(recordValue(layer)?.['animation'])
      if (typeof layerAnimation?.['file'] === 'string') return layerAnimation['file']
      const layerSprites = recordValue(layerAnimation?.['sprites'])
      const sprite = firstStringFromRecord(layerSprites)
      if (sprite) return sprite
    }
  }
  return null
}

function atlasPath(data: Record<string, unknown>): string {
  const animation = animationRecord(data)
  const sheet = activeSpritesheet(animation, 'Visual Novel') ?? activeSpritesheet(animation, 'Animation')
  return typeof sheet?.['atlas'] === 'string' ? sheet['atlas'] : ''
}

function assetUrl(gameId: string, path: string): string {
  return `/api/projects/${gameId}/assets/file?path=${encodeURIComponent(path)}`
}

function spritesheetRootDir(gameId: string, characterId: string): string {
  return join(GAMES_DIR, gameId, 'assets', 'characters', characterId, 'spritesheets')
}

function safeSpritesheetFolderName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Spritesheet folder name is required.')
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) throw new Error('Spritesheet folder name is invalid.')
  return trimmed
}

function spritesheetFolderFromPath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^assets\//, '').replace(/^\/+/, '')
  const match = normalized.match(/^characters\/[^/]+\/spritesheets\/([^/]+)\//)
  return match?.[1] ? safeSpritesheetFolderName(match[1]) : 'Main'
}

function spritesheetFolders(gameId: string, characterId: string): string[] {
  const root = spritesheetRootDir(gameId, characterId)
  const folders = new Set<string>(['Main'])
  if (existsSync(root)) {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory()) folders.add(entry.name)
    }
  }
  return [...folders].sort((a, b) => a === 'Main' ? -1 : b === 'Main' ? 1 : a.localeCompare(b))
}

function isSpritesheetImage(filename: string): boolean {
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(extname(filename).toLowerCase())
}

function findAtlasForSpritesheet(dir: string, imageFilename: string): string {
  const stem = basename(imageFilename, extname(imageFilename))
  const preferred = `${stem}_map.json`
  if (existsSync(join(dir, preferred))) return preferred
  if (!existsSync(dir)) return ''
  const candidates = readdirSync(dir)
    .filter(filename => filename.startsWith(`${stem}_map`) && filename.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b))
  return candidates[0] ?? ''
}

function spritesheetAssets(gameId: string, characterId: string, data: Record<string, unknown>): StudioCharacterSpritesheetAsset[] {
  const root = spritesheetRootDir(gameId, characterId)
  if (!existsSync(root)) return []
  const activeFile = previewAssetPath(data) ?? ''
  const assets: StudioCharacterSpritesheetAsset[] = []
  for (const folder of spritesheetFolders(gameId, characterId)) {
    const dir = join(root, folder)
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !isSpritesheetImage(entry.name)) continue
      const path = `characters/${characterId}/spritesheets/${folder}/${entry.name}`
      const atlasFilename = findAtlasForSpritesheet(dir, entry.name)
      const atlasPath = atlasFilename ? `characters/${characterId}/spritesheets/${folder}/${atlasFilename}` : ''
      assets.push({
        folder,
        path,
        atlasPath,
        url: assetUrl(gameId, path),
        atlas: atlasPath ? readAtlasSummary(gameId, atlasPath, data) : null,
        isActive: path === activeFile,
      })
    }
  }
  return assets.sort((a, b) => a.folder === b.folder ? a.path.localeCompare(b.path) : a.folder === 'Main' ? -1 : b.folder === 'Main' ? 1 : a.folder.localeCompare(b.folder))
}

function characterSheetAssetUrls(gameId: string, sheet: StudioCharacterSheetAssets): StudioCharacterSheetAssetUrls {
  return {
    main: sheet.main ? assetUrl(gameId, sheet.main) : null,
    concepts: sheet.concepts.map(path => assetUrl(gameId, path)),
    generated: sheet.generated.map(path => assetUrl(gameId, path)),
  }
}

function readAtlasSummary(gameId: string, path: string, data: Record<string, unknown>): StudioCharacterAtlasSummary | null {
  if (!path) return null
  const filePath = resolveAssetPath(gameId, path)
  if (!existsSync(filePath)) return null
  const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as AsepriteAtlas
  const atlasKind = getAsepriteAtlasKind(parsed)
  const frameItems = getAsepriteFrameItems(parsed)
  const frameTags = getAsepriteFrameTags(parsed)
  const tags = frameTags.map(tag => tag.name)
  const animation = animationRecord(data)
  const defaultAnimationKey = atlasKind === 'Animation' ? 'defaultAction' : 'defaultState'
  const defaultAnimationValue = animation[defaultAnimationKey]
  const defaultAnimation = typeof defaultAnimationValue === 'string'
    ? defaultAnimationValue
    : typeof data['defaultExpression'] === 'string'
      ? data['defaultExpression']
      : 'neutral'
  const previewSheet = atlasKind === 'Animation'
    ? activeSpritesheet(animation, 'Animation')
    : activeSpritesheet(animation, 'Visual Novel')
  const animations = recordValue(previewSheet?.[atlasKind === 'Animation' ? 'actions' : 'sprites'])
  const targetName = typeof animations?.[defaultAnimation] === 'string'
    ? animations[defaultAnimation]
    : typeof animations?.['neutral'] === 'string'
      ? animations['neutral']
      : defaultAnimation
  const tag = frameTags.find(item => item.name === targetName) ?? frameTags[0]
  const frameItem = typeof tag?.from === 'number' ? frameItems[tag.from] : frameItems[0]
  return {
    path,
    atlasKind,
    spritesheetType: typeof parsed.meta?.spritesheetType === 'string' ? parsed.meta.spritesheetType : atlasKind,
    frameCount: frameItems.length,
    frameNames: frameItems.map(item => item.name),
    tags,
    frames: frameItems.map(item => ({
      key: item.key,
      name: item.name,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      duration: item.frame.duration,
    })),
    frameTags: frameTags.map(tag => ({
      name: tag.name,
      from: tag.from,
      to: tag.to,
      direction: tag.direction,
    })),
    sheetSize: {
      w: parsed.meta?.size?.w ?? 0,
      h: parsed.meta?.size?.h ?? 0,
    },
    previewFrame: frameItem ? {
      name: frameItem.name,
      x: frameItem.x,
      y: frameItem.y,
      w: frameItem.w,
      h: frameItem.h,
    } : null,
  }
}

function characterFromFile(gameId: string, filePath: string, baseDir: string): StudioCharacterItem {
  const path = relative(baseDir, filePath).replace(/\\/g, '/')
  const text = readFileSync(filePath, 'utf8')
  const { data, body } = frontmatterFromMarkdown(text)
  const offset = recordValue(data['offset']) ?? {}
  const assetPath = previewAssetPath(data)
  const atlas = atlasPath(data)
  const sheetAssets = characterSheetAssets(data['characterSheet'])
  return {
    path,
    id: typeof data['id'] === 'string' ? data['id'] : path.replace(/\.md$/, ''),
    displayName: typeof data['displayName'] === 'string'
      ? data['displayName']
      : typeof data['name'] === 'string'
        ? data['name']
        : path.replace(/\.md$/, ''),
    role: stringValue(data, 'role'),
    age: stringValue(data, 'age'),
    gender: stringValue(data, 'gender'),
    tags: stringArrayValue(data['tags']),
    physicalDescription: stringValue(data, 'physicalDescription'),
    expressionsText: stringArrayValue(data['expressionsText']),
    personality: stringValue(data, 'personality'),
    traits: stringArrayValue(data['traits']),
    motivations: stringValue(data, 'motivations'),
    fears: stringValue(data, 'fears'),
    internalConflict: stringValue(data, 'internalConflict'),
    backstory: stringValue(data, 'backstory'),
    keyEvents: stringArrayValue(data['keyEvents']),
    arcInitial: stringValue(data, 'arcInitial'),
    arcBreak: stringValue(data, 'arcBreak'),
    arcFinal: stringValue(data, 'arcFinal'),
    relationships: stringArrayValue(data['relationships']),
    authorNotes: stringValue(data, 'authorNotes'),
    palette: stringValue(data, 'palette'),
    outfit: stringValue(data, 'outfit'),
    prompt: stringValue(data, 'prompt'),
    nameColor: stringValue(data, 'nameColor'),
    isNarrator: data['isNarrator'] === true,
    defaultPosition: typeof data['defaultPosition'] === 'string' ? data['defaultPosition'] : 'center',
    defaultExpression: typeof data['defaultExpression'] === 'string' ? data['defaultExpression'] : 'neutral',
    scale: numberValue(data['scale'], 1),
    offset: {
      x: numberValue(offset['x'], 0),
      y: numberValue(offset['y'], 0),
    },
    animation: animationRecord(data),
    expressions: expressionNames(data),
    atlasPath: atlas,
    previewUrl: assetPath ? assetUrl(gameId, assetPath) : null,
    atlas: readAtlasSummary(gameId, atlas, data),
    spritesheetFolders: spritesheetFolders(gameId, String(data['id'] ?? path.replace(/\.md$/, ''))),
    spritesheets: spritesheetAssets(gameId, String(data['id'] ?? path.replace(/\.md$/, '')), data),
    characterSheet: sheetAssets,
    characterSheetUrls: characterSheetAssetUrls(gameId, sheetAssets),
    body,
  }
}

function walkCharacterFiles(gameId: string, dir: string, baseDir = dir): StudioCharacterItem[] {
  if (!existsSync(dir)) return []
  const characters: StudioCharacterItem[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      characters.push(...walkCharacterFiles(gameId, fullPath, baseDir))
      continue
    }
    if (entry.name.endsWith('.md')) characters.push(characterFromFile(gameId, fullPath, baseDir))
  }
  return characters.sort((a, b) => a.id.localeCompare(b.id))
}

function expressionMap(names: string[], existing: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const name of names.map(item => item.trim()).filter(Boolean)) {
    const current = existing[name]
    result[name] = typeof current === 'string' && current.length > 0 ? current : name
  }
  return result
}

function stringRecord(value: unknown): Record<string, string> {
  const record = recordValue(value)
  if (!record) return {}
  const result: Record<string, string> = {}
  for (const [key, item] of Object.entries(record)) {
    if (typeof item === 'string' && item.length > 0) result[key] = item
  }
  return result
}

function spritesheetLibrary(animation: Record<string, unknown>, fallbackAnimation: string): Record<string, unknown> {
  const normalizeSheets = (value: unknown, mappingKey: 'sprites' | 'actions'): Record<string, unknown> => {
    const rawSheets = recordValue(value) ?? {}
    const sheets: Record<string, unknown> = {}
    for (const [name, rawSheet] of Object.entries(rawSheets)) {
      const sheet = recordValue(rawSheet)
      if (!sheet) continue
      const file = typeof sheet['file'] === 'string' ? sheet['file'] : ''
      const atlas = typeof sheet['atlas'] === 'string' ? sheet['atlas'] : ''
      sheets[name] = {
        file,
        atlas,
        [mappingKey]: stringRecord(sheet[mappingKey]),
      }
    }
    return sheets
  }
  return {
    type: 'spritesheet-library',
    defaultStateSheet: typeof animation['defaultStateSheet'] === 'string' ? animation['defaultStateSheet'] : 'Main',
    defaultAnimationSheet: typeof animation['defaultAnimationSheet'] === 'string' ? animation['defaultAnimationSheet'] : 'Main',
    defaultState: typeof animation['defaultState'] === 'string' ? animation['defaultState'] : fallbackAnimation,
    defaultAction: typeof animation['defaultAction'] === 'string' ? animation['defaultAction'] : '',
    states: normalizeSheets(animation['states'], 'sprites'),
    animationSheets: normalizeSheets(animation['animationSheets'], 'actions'),
  }
}

function updateSpritesheetLibrary(
  animation: Record<string, unknown>,
  atlasKind: StudioAsepriteAtlasKind,
  folder: string,
  file: string,
  atlas: string,
  names: string[],
  fallbackAnimation: string,
): Record<string, unknown> {
  const library = spritesheetLibrary(animation, fallbackAnimation)
  const collectionKey = atlasKind === 'Animation' ? 'animationSheets' : 'states'
  const mappingKey = atlasKind === 'Animation' ? 'actions' : 'sprites'
  const defaultSheetKeyName = atlasKind === 'Animation' ? 'defaultAnimationSheet' : 'defaultStateSheet'
  const defaultAnimationKeyName = atlasKind === 'Animation' ? 'defaultAction' : 'defaultState'
  const sheets = { ...(recordValue(library[collectionKey]) ?? {}) }
  const currentSheet = recordValue(sheets[folder])
  sheets[folder] = {
    file,
    atlas,
    [mappingKey]: expressionMap(names, recordValue(currentSheet?.[mappingKey]) ?? {}),
  }
  return {
    ...library,
    [defaultSheetKeyName]: folder,
    [defaultAnimationKeyName]: names[0] ?? fallbackAnimation,
    [collectionKey]: sheets,
  }
}

function applyDraftAnimationNames(library: Record<string, unknown>, names: string[]): Record<string, unknown> {
  const trimmed = names.map(name => name.trim()).filter(Boolean)
  if (trimmed.length === 0) return library
  const folder = typeof library['defaultStateSheet'] === 'string' ? library['defaultStateSheet'] : 'Main'
  const states = { ...(recordValue(library['states']) ?? {}) }
  const currentSheet = recordValue(states[folder])
  states[folder] = {
    file: typeof currentSheet?.['file'] === 'string' ? currentSheet['file'] : '',
    atlas: typeof currentSheet?.['atlas'] === 'string' ? currentSheet['atlas'] : '',
    sprites: expressionMap(trimmed, recordValue(currentSheet?.['sprites']) ?? {}),
  }
  return {
    ...library,
    defaultState: typeof library['defaultState'] === 'string' ? library['defaultState'] : trimmed[0] ?? 'neutral',
    states,
  }
}

function atlasRelativePath(atlas: string): string {
  return atlas.startsWith('assets/') ? atlas.slice('assets/'.length) : atlas
}

function safeImageExtension(name: string): string {
  const ext = extname(name).toLowerCase()
  if (!['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
    throw new Error('Character sheet image must be a PNG, JPG, WebP or GIF image.')
  }
  return ext
}

function nextConceptFilename(dir: string, originalName: string): string {
  const ext = safeImageExtension(originalName || 'concept.png')
  const existingStems = new Set(
    existsSync(dir)
      ? readdirSync(dir).map(name => basename(name, extname(name)))
      : [],
  )
  for (let index = 1; index < 1000; index += 1) {
    const stem = `concept-${String(index).padStart(3, '0')}`
    const next = `${stem}${ext}`
    if (existingStems.has(stem)) continue
    if (!existsSync(join(dir, next))) return next
  }
  throw new Error('Could not allocate a unique concept image filename.')
}

function nextSpritesheetFilename(dir: string, characterId: string, originalName: string): string {
  const ext = safeImageExtension(originalName || 'spritesheet.png')
  const stem = `${characterId}_spritesheet`
  const first = `${stem}${ext}`
  if (!existsSync(join(dir, first))) return first
  for (let index = 2; index < 1000; index += 1) {
    const next = `${stem}_${String(index).padStart(3, '0')}${ext}`
    if (!existsSync(join(dir, next))) return next
  }
  throw new Error('Could not allocate a unique spritesheet image filename.')
}

function atlasFilenameForSpritesheet(dir: string, spritesheetFilename: string): string {
  const stem = basename(spritesheetFilename, extname(spritesheetFilename))
  const first = `${stem}_map.json`
  if (!existsSync(join(dir, first))) return first
  for (let index = 2; index < 1000; index += 1) {
    const next = `${stem}_map_${String(index).padStart(3, '0')}.json`
    if (!existsSync(join(dir, next))) return next
  }
  throw new Error('Could not allocate a unique spritesheet atlas filename.')
}

function nextGeneratedFilenameForPrefix(dir: string, extension: string, prefix: string): string {
  const safeExtension = extension.replace(/^\./, '').toLowerCase()
  if (!['png', 'jpg', 'jpeg', 'webp'].includes(safeExtension)) throw new Error('Generated image format must be PNG, JPG or WebP.')
  const existingStems = new Set(
    existsSync(dir)
      ? readdirSync(dir).map(name => basename(name, extname(name)))
      : [],
  )
  for (let index = 1; index < 1000; index += 1) {
    const stem = `${prefix}-${String(index).padStart(3, '0')}`
    const next = `${stem}.${safeExtension}`
    if (existingStems.has(stem)) continue
    if (!existsSync(join(dir, next))) return next
  }
  throw new Error('Could not allocate a unique generated image filename.')
}

function nextGeneratedFilename(dir: string, extension: string, artType: StudioCharacterSheetArtType): string {
  return nextGeneratedFilenameForPrefix(dir, extension, CHARACTER_SHEET_ART_INSTRUCTIONS[artType].slug)
}

function assertCharacterSheetAssetPath(characterId: string, path: string): void {
  const normalized = path.replace(/\\/g, '/').replace(/^assets\//, '').replace(/^\/+/, '')
  const prefix = `characters/${characterId}/character-sheet/`
  if (!normalized.startsWith(prefix) || normalized.includes('..')) {
    throw new Error('Character sheet asset path must stay inside the character-sheet folder.')
  }
}

function assertSpritesheetAssetPath(path: string): void {
  const normalized = path.replace(/\\/g, '/').replace(/^assets\//, '').replace(/^\/+/, '')
  if (!normalized.startsWith('characters/') || normalized.includes('..')) {
    throw new Error('Spritesheet asset path must stay inside the characters assets folder.')
  }
}

function normalizedArtTypes(value: readonly StudioCharacterSheetArtType[] | undefined): StudioCharacterSheetArtType[] {
  const valid = new Set<StudioCharacterSheetArtType>(['silhouetteSketch', 'conceptArt', 'characterSheet', 'actionPoses'])
  const result = [...new Set((value ?? DEFAULT_CHARACTER_SHEET_ART_TYPES).filter(item => valid.has(item)))]
  const selected = result.length > 0 ? result : [...DEFAULT_CHARACTER_SHEET_ART_TYPES]
  return CHARACTER_SHEET_ART_TYPE_ORDER.filter(item => selected.includes(item))
}

function artTypeValue(value: unknown): StudioCharacterSheetArtType | undefined {
  return typeof value === 'string' && CHARACTER_SHEET_ART_TYPE_ORDER.includes(value as StudioCharacterSheetArtType)
    ? value as StudioCharacterSheetArtType
    : undefined
}

function buildCharacterImagePrompt(draft: StudioCharacterDraft, artType: StudioCharacterSheetArtType, referencePath: string | null): string {
  const art = CHARACTER_SHEET_ART_INSTRUCTIONS[artType]
  const details = [
    `Task: ${art.label}.`,
    art.prompt,
    referencePath ? `Use the attached reference image to preserve this character's identity, silhouette, costume language, palette, and proportions.` : '',
    `Character: ${draft.displayName || draft.id}.`,
    draft.role ? `Role: ${draft.role}.` : '',
    draft.physicalDescription ? `Physical description: ${draft.physicalDescription}.` : '',
    draft.outfit ? `Outfit: ${draft.outfit}.` : '',
    draft.palette ? `Palette: ${draft.palette}.` : '',
    draft.personality ? `Personality: ${draft.personality}.` : '',
    draft.expressionsText?.length ? `Expressions to consider: ${draft.expressionsText.join(', ')}.` : '',
    draft.prompt ? `Existing art prompt: ${draft.prompt}.` : '',
    draft.body ? `Writer notes: ${draft.body.slice(0, 1200)}` : '',
  ]
  return details.map(item => item.trim()).filter(Boolean).join('\n')
}

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function editsPathFromGenerationPath(path: string): string {
  return path.replace(/\/generations\/?$/, '/edits') || '/images/edits'
}

function openAiErrorMessage(payload: unknown, fallback: string): string {
  const record = recordValue(payload)
  const error = recordValue(record?.['error'])
  if (typeof error?.['message'] === 'string') return error['message']
  if (typeof record?.['message'] === 'string') return record['message']
  return fallback
}

function imageResponseSummary(payload: unknown): string {
  const record = recordValue(payload)
  const data = Array.isArray(record?.['data']) ? record['data'] : []
  const first = recordValue(data[0])
  return JSON.stringify({
    keys: record ? Object.keys(record) : [],
    dataLength: data.length,
    firstDataKeys: first ? Object.keys(first) : [],
    hasB64: typeof first?.['b64_json'] === 'string',
    hasUrl: typeof first?.['url'] === 'string',
  })
}

async function imageBytesFromResponse(payload: unknown): Promise<{ bytes: Uint8Array; revisedPrompt: string }> {
  const record = recordValue(payload)
  const data = Array.isArray(record?.['data']) ? record['data'] : []
  const first = recordValue(data[0])
  const b64 = typeof first?.['b64_json'] === 'string' ? first['b64_json'] : ''
  if (b64) {
    return {
      bytes: new Uint8Array(Buffer.from(b64, 'base64')),
      revisedPrompt: typeof first?.['revised_prompt'] === 'string' ? first['revised_prompt'] : '',
    }
  }
  const url = typeof first?.['url'] === 'string' ? first['url'] : ''
  if (!url) throw new Error(`OpenAI image response did not include base64 image data or a URL. Response summary: ${imageResponseSummary(payload)}`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`OpenAI returned an image URL, but downloading it failed with ${response.status}.`)
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    revisedPrompt: typeof first?.['revised_prompt'] === 'string' ? first['revised_prompt'] : '',
  }
}

function referenceImagePath(draft: StudioCharacterDraft): string | null {
  const sheet = draft.characterSheet
  if (!sheet) return null
  return sheet.main || sheet.generated.at(-1) || sheet.concepts.at(-1) || null
}

function imageMimeFromPath(path: string): string {
  const ext = extname(path).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  return 'image/png'
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function runSpritesheetBackgroundRemoval(
  bytes: Uint8Array,
  settings: Awaited<ReturnType<typeof readOpenAiImagesSettingsForGeneration>>,
): Uint8Array {
  if (!settings.spritesheetBackgroundRemovalEnabled) return bytes
  const commandTemplate = settings.spritesheetBackgroundRemovalCommand.trim()
  if (!commandTemplate) throw new Error('Spritesheet background removal command is not configured.')

  const tempDir = mkdtempSync(join(tmpdir(), 'biwa-background-removal-'))
  try {
    const inputPath = join(tempDir, 'input.png')
    const outputPath = join(tempDir, 'output.png')
    writeFileSync(inputPath, bytes)
    const command = commandTemplate
      .replaceAll('{input}', shellQuote(inputPath))
      .replaceAll('{output}', shellQuote(outputPath))
    const result = spawnSync(command, {
      cwd: ROOT,
      encoding: 'utf8',
      shell: true,
      timeout: settings.spritesheetBackgroundRemovalTimeoutSeconds * 1000,
    })
    if (result.error) throw result.error
    if (result.status !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status ?? 'unknown'}`
      throw new Error(`Spritesheet background removal failed: ${detail}`)
    }
    if (!existsSync(outputPath)) throw new Error('Spritesheet background removal did not create an output image.')
    return new Uint8Array(readFileSync(outputPath))
  } finally {
    rmSync(tempDir, { force: true, recursive: true })
  }
}

async function createOpenAiImagePayload(
  gameId: string,
  settings: Awaited<ReturnType<typeof readOpenAiImagesSettingsForGeneration>>,
  prompt: string,
  referencePathValue: string | null,
  options: {
    size?: string
    background?: 'transparent' | 'opaque' | 'auto'
    outputFormat?: 'png' | 'webp' | 'jpeg'
  } = {},
): Promise<{ url: string; init: RequestInit }> {
  const size = options.size ?? settings.characterSheetResolution
  const outputFormat = options.outputFormat ?? settings.outputFormat
  if (!referencePathValue) {
    const body: Record<string, unknown> = {
      model: settings.model,
      prompt,
      n: 1,
      size,
      quality: settings.quality,
      output_format: outputFormat,
      moderation: settings.moderation,
    }
    if (options.background) body['background'] = options.background
    return {
      url: apiUrl(settings.baseUrl, settings.imageGenerationPath),
      init: {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    }
  }
  const imagePath = resolveAssetPath(gameId, referencePathValue)
  const image = Bun.file(imagePath)
  const form = new FormData()
  form.set('model', settings.model)
  form.set('prompt', prompt)
  form.set('n', '1')
  form.set('size', size)
  form.set('quality', settings.quality)
  form.set('output_format', outputFormat)
  form.set('moderation', settings.moderation)
  if (options.background) form.set('background', options.background)
  form.set('image', new File([await image.arrayBuffer()], referencePathValue.split('/').pop() ?? 'reference.png', { type: imageMimeFromPath(referencePathValue) }))
  return {
    url: apiUrl(settings.baseUrl, editsPathFromGenerationPath(settings.imageGenerationPath)),
    init: {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.apiKey}` },
      body: form,
    },
  }
}

export async function listCharacters(gameId: string): Promise<StudioCharacterItem[]> {
  await validateGame(gameId)
  return walkCharacterFiles(gameId, charactersDir(gameId))
}

export async function readCharacter(gameId: string, path: string): Promise<StudioCharacterResponse> {
  await validateGame(gameId)
  const filePath = resolveCharacterFile(gameId, path)
  if (!existsSync(filePath)) throw new Error(`Character file not found: ${path}`)
  return { character: characterFromFile(gameId, filePath, charactersDir(gameId)) }
}

export async function writeCharacter(gameId: string, path: string, draft: StudioCharacterDraft): Promise<StudioCharacterResponse> {
  await validateGame(gameId)
  const filePath = resolveCharacterFile(gameId, path)
  if (!existsSync(dirname(filePath))) throw new Error(`Character directory not found for: ${path}`)
  const existing = existsSync(filePath) ? frontmatterFromMarkdown(readFileSync(filePath, 'utf8')) : { data: {}, body: '' }
  const rawAnimation = {
    ...animationRecord(existing.data),
    ...draft.animation,
  }
  const animation = applyDraftAnimationNames(
    spritesheetLibrary(rawAnimation, draft.defaultExpression || draft.expressions[0] || 'neutral'),
    draft.expressions,
  )
  const data = {
    ...existing.data,
    id: draft.id,
    displayName: draft.displayName,
    role: draft.role,
    age: draft.age ?? '',
    gender: draft.gender ?? '',
    tags: draft.tags ?? [],
    physicalDescription: draft.physicalDescription,
    expressionsText: draft.expressionsText ?? [],
    personality: draft.personality,
    traits: draft.traits ?? [],
    motivations: draft.motivations ?? '',
    fears: draft.fears ?? '',
    internalConflict: draft.internalConflict ?? '',
    backstory: draft.backstory ?? '',
    keyEvents: draft.keyEvents ?? [],
    arcInitial: draft.arcInitial ?? '',
    arcBreak: draft.arcBreak ?? '',
    arcFinal: draft.arcFinal ?? '',
    relationships: draft.relationships ?? [],
    authorNotes: draft.authorNotes ?? '',
    palette: draft.palette,
    outfit: draft.outfit,
    prompt: draft.prompt,
    nameColor: draft.nameColor,
    isNarrator: draft.isNarrator,
    defaultPosition: draft.defaultPosition,
    defaultExpression: draft.defaultExpression,
    scale: draft.scale,
    offset: draft.offset,
    animation,
    characterSheet: draft.characterSheet ?? characterSheetAssets(existing.data['characterSheet']),
  }
  const body = draft.body ?? existing.body
  const content = `---\n${yaml.dump(data, { lineWidth: 100, noRefs: true }).trim()}\n---\n\n${body.trim()}\n`
  writeFileSync(filePath, content)
  return readCharacter(gameId, path)
}

export async function generateCharacterAtlas(
  gameId: string,
  path: string,
  draft: StudioCharacterDraft,
): Promise<StudioCharacterAtlasResponse> {
  await validateGame(gameId)
  const characterId = draft.id.trim() || path.replace(/\.md$/, '')
  const folder = typeof draft.animation['defaultStateSheet'] === 'string' ? draft.animation['defaultStateSheet'] : 'Main'
  const names = draft.expressions.length > 0 ? draft.expressions : [draft.defaultExpression || 'neutral']
  const activeSheet = activeSpritesheet(draft.animation, 'Visual Novel')
  const image = typeof activeSheet?.['file'] === 'string' && activeSheet['file']
    ? activeSheet['file'].split('/').pop() ?? `${characterId}_spritesheet.png`
    : `${characterId}_spritesheet.png`
  const result = createCharacterAtlas(gameId, characterId, {
    names: names.join(','),
    count: String(names.length),
    width: String(Math.max(1, names.length) * 512),
    height: '512',
    image,
    out: `assets/characters/${characterId}/spritesheets/${folder}/${characterId}_atlas.json`,
  })
  const animation = updateSpritesheetLibrary(
    draft.animation,
    'Visual Novel',
    folder,
    typeof activeSheet?.['file'] === 'string' && activeSheet['file'] ? activeSheet['file'] : `characters/${characterId}/spritesheets/${folder}/${image}`,
    atlasRelativePath(result.atlasPath),
    names,
    draft.defaultExpression || 'neutral',
  )
  const saved = await writeCharacter(gameId, path, { ...draft, animation, expressions: names })
  const savedAtlasPath = atlasPath(saved.character.animation as Record<string, unknown>)
  const summary = saved.character.atlas ?? {
    path: savedAtlasPath,
    atlasKind: 'Visual Novel' as const,
    spritesheetType: 'Half Body',
    frameCount: result.frameCount,
    frameNames: names,
    tags: [],
    frames: names.map((name, index) => ({
      key: `${name}.png`,
      name,
      x: index * 512,
      y: 0,
      w: 512,
      h: 512,
      duration: 100,
    })),
    frameTags: names.map((name, index) => ({
      name,
      from: index,
      to: index,
      direction: 'forward',
    })),
    sheetSize: { w: Math.max(1, names.length) * 512, h: 512 },
    previewFrame: { name: names[0] ?? 'neutral', x: 0, y: 0, w: 512, h: 512 },
  }
  return { atlas: summary, character: saved.character }
}

export async function deleteCharacterSpritesheet(
  gameId: string,
  path: string,
  draft: StudioCharacterDraft,
  assetPath: string,
): Promise<StudioCharacterSpritesheetDeleteResponse> {
  await validateGame(gameId)
  const normalizedAssetPath = assetPath.replace(/\\/g, '/').replace(/^assets\//, '').replace(/^\/+/, '')
  assertSpritesheetAssetPath(normalizedAssetPath)
  const library = spritesheetLibrary(draft.animation, draft.defaultExpression || 'neutral')
  const states = { ...(recordValue(library['states']) ?? {}) }
  const animationSheets = { ...(recordValue(library['animationSheets']) ?? {}) }
  const stateEntry = Object.entries(states).find(([, sheet]) => recordValue(sheet)?.['file'] === normalizedAssetPath)
  const animationEntry = Object.entries(animationSheets).find(([, sheet]) => recordValue(sheet)?.['file'] === normalizedAssetPath)
  const entry = stateEntry ?? animationEntry
  const filePath = resolveAssetPath(gameId, normalizedAssetPath)
  if (existsSync(filePath)) unlinkSync(filePath)
  const fallbackAtlas = findAtlasForSpritesheet(dirname(filePath), normalizedAssetPath.split('/').pop() ?? '')
  const [deletedFolder, deletedSheet] = entry ?? [spritesheetFolderFromPath(normalizedAssetPath), null]
  const atlas = recordValue(deletedSheet)?.['atlas']
    ?? (fallbackAtlas ? `${normalizedAssetPath.split('/').slice(0, -1).join('/')}/${fallbackAtlas}` : '')
  if (typeof atlas === 'string' && atlas.length > 0) {
    const atlasFile = resolveAssetPath(gameId, atlas)
    if (existsSync(atlasFile)) unlinkSync(atlasFile)
  }
  if (stateEntry) delete states[deletedFolder]
  if (animationEntry) delete animationSheets[deletedFolder]
  const remainingStateFolders = Object.keys(states)
  const remainingAnimationFolders = Object.keys(animationSheets)
  const nextAnimation = {
    ...library,
    states,
    animationSheets,
    defaultStateSheet: library['defaultStateSheet'] === deletedFolder ? remainingStateFolders[0] ?? 'Main' : library['defaultStateSheet'],
    defaultAnimationSheet: library['defaultAnimationSheet'] === deletedFolder ? remainingAnimationFolders[0] ?? 'Main' : library['defaultAnimationSheet'],
  }
  const saved = await writeCharacter(gameId, path, {
    ...draft,
    animation: nextAnimation,
    expressions: [],
  })
  return {
    deletedPath: normalizedAssetPath,
    character: saved.character,
  }
}

export async function uploadCharacterSpritesheet(
  gameId: string,
  path: string,
  draft: StudioCharacterDraft,
  file: File,
  folderName = 'Main',
): Promise<StudioCharacterSpritesheetUploadResponse> {
  await validateGame(gameId)
  if (!file || file.size === 0) throw new Error('Missing spritesheet image.')
  const characterId = draft.id.trim() || path.replace(/\.md$/, '')
  const folder = safeSpritesheetFolderName(folderName)
  const targetDir = join(spritesheetRootDir(gameId, characterId), folder)
  mkdirSync(targetDir, { recursive: true })
  const filename = nextSpritesheetFilename(targetDir, characterId, file.name || 'spritesheet.png')
  const assetPath = `characters/${characterId}/spritesheets/${folder}/${filename}`
  writeFileSync(join(targetDir, filename), new Uint8Array(await file.arrayBuffer()))
  const names = draft.expressions.length > 0 ? draft.expressions : [draft.defaultExpression || 'neutral']
  const animation = updateSpritesheetLibrary(draft.animation, 'Visual Novel', folder, assetPath, '', names, draft.defaultExpression || 'neutral')
  const saved = await writeCharacter(gameId, path, { ...draft, animation })
  return {
    path: assetPath,
    url: assetUrl(gameId, assetPath),
    character: saved.character,
  }
}

export async function createCharacterSpritesheetFolder(
  gameId: string,
  path: string,
  draft: StudioCharacterDraft,
  folderName: string,
): Promise<StudioCharacterSpritesheetFolderResponse> {
  await validateGame(gameId)
  const characterId = draft.id.trim() || path.replace(/\.md$/, '')
  const folder = safeSpritesheetFolderName(folderName)
  mkdirSync(join(spritesheetRootDir(gameId, characterId), folder), { recursive: true })
  const current = await readCharacter(gameId, path)
  return {
    folder,
    character: current.character,
  }
}

function spritesheetGenerationPrompt(draft: StudioCharacterDraft, atlasJson: string, options: StudioCharacterSpritesheetGenerateRequest): string {
  const names = options.spriteNames.map(name => name.trim()).filter(Boolean).join(', ')
  const atlasKind = options.atlasKind === 'Animation' ? 'Animation' : 'Visual Novel'
  const animationTags = options.animationTags ?? []
  const animationTagSummary = animationTags
    .map(tag => `${tag.name}: frames ${tag.from}-${tag.to}, ${animationDirectionValue(tag.direction)}`)
    .join('; ')
  const animationInstructions = atlasKind === 'Animation'
      ? [
        'This is an animation spritesheet, not an expression/state spritesheet.',
        `Animation body type: ${options.spritesheetType || 'Half Body'}.`,
        'Every cell is a chronological frame in a continuous motion sequence.',
        'Do not create separate character poses, mood variants, expression options, turnarounds, or costume variants.',
        'Animate only small progressive changes from frame to frame: breathing, blink, hair sway, cloth sway, idle weight shift, or the user-requested motion.',
        'Keep the character locked to the same camera angle, same crop, same body scale, same feet/torso anchor, and same center alignment in every frame.',
        'Adjacent frames must differ subtly and incrementally so the sequence loops smoothly without popping.',
        `Frames per action: ${Math.max(1, Math.floor(options.animationFramesPerTag ?? options.spriteCount))}.`,
        animationTagSummary ? `Frame tag ranges: ${animationTagSummary}.` : '',
      ].filter(Boolean)
    : [
        'Each cell is a separate visual novel state or expression, not a motion sequence.',
      ]
  return [
    options.prompt.trim() || (atlasKind === 'Animation'
      ? `Create a clean looping visual novel character animation spritesheet for ${draft.displayName || draft.id}.`
      : `Create a clean visual novel ${options.spritesheetType.toLowerCase()} character spritesheet for ${draft.displayName || draft.id}.`),
    '',
    'Use the attached concept art as the visual identity reference for the same character.',
    'Generate one spritesheet image, not individual images.',
    ...animationInstructions,
    'Use a perfectly flat solid #00ff00 chroma-key background for background removal.',
    'The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.',
    'Do not use #00ff00 anywhere in the character sprites.',
    'No text of any kind: no labels, words, captions, letters, numbers, symbols, UI, watermarks, signatures, or frame markings.',
    `Canvas: ${options.sheetWidth}x${options.sheetHeight}px.`,
    `Layout: ${options.layoutDirection}, ${options.spriteCount} ${atlasKind === 'Animation' ? 'frames' : 'sprites'}, ${options.columns || 'auto'} columns.`,
    `${atlasKind === 'Animation' ? 'Animation frame groups' : 'Sprite names / expressions'} in order: ${names}.`,
    `Each ${atlasKind === 'Animation' ? 'animation frame' : 'sprite'} must fit exactly inside the matching Aseprite frame rectangle from this JSON contract.`,
    atlasKind === 'Animation'
      ? 'Keep scale, outfit, hairstyle, colors, proportions, and motion continuity consistent across every animation frame.'
      : 'Keep scale, outfit, hairstyle, colors, and proportions consistent across every frame.',
    'Do not add borders or background art.',
    '',
    'Aseprite JSON contract:',
    atlasJson,
  ].join('\n')
}

export async function generateCharacterSpritesheet(
  gameId: string,
  path: string,
  draft: StudioCharacterDraft,
  options: StudioCharacterSpritesheetGenerateRequest,
): Promise<StudioCharacterSpritesheetGenerateResponse> {
  await validateGame(gameId)
  const settings = await readOpenAiImagesSettingsForGeneration(gameId)
  const characterId = draft.id.trim() || path.replace(/\.md$/, '')
  const folder = safeSpritesheetFolderName(options.folder || 'Main')
  const targetDir = join(spritesheetRootDir(gameId, characterId), folder)
  mkdirSync(targetDir, { recursive: true })
  const spritesheetOutputFormat = settings.spritesheetBackgroundRemovalEnabled || settings.outputFormat === 'jpeg' ? 'png' : settings.outputFormat
  const imageFilename = nextSpritesheetFilename(targetDir, characterId, `${characterId}_spritesheet.${imageExtension(spritesheetOutputFormat)}`)
  const atlasFilename = atlasFilenameForSpritesheet(targetDir, imageFilename)
  const assetPath = `characters/${characterId}/spritesheets/${folder}/${imageFilename}`
  const atlasPathValue = `characters/${characterId}/spritesheets/${folder}/${atlasFilename}`
  const names = options.spriteNames.length > 0 ? options.spriteNames : draft.expressions.length > 0 ? draft.expressions : [draft.defaultExpression || 'neutral']
  const atlasKind = atlasKindValue(options.atlasKind)
  const framesPerTag = Math.max(1, Math.floor(options.animationFramesPerTag ?? options.spriteCount))
  const frameCount = atlasKind === 'Animation'
    ? Math.max(1, names.length * framesPerTag)
    : Math.max(1, Math.floor(options.spriteCount))
  const animationTags = animationTagsValue(options.animationTags, frameCount, names, framesPerTag)
  const atlas = atlasKind === 'Animation'
    ? buildAsepriteAnimationAtlas({
        sheetWidth: options.sheetWidth,
        sheetHeight: options.sheetHeight,
        spritesheetType: options.spritesheetType || 'Half Body',
        frameCount,
        layoutDirection: options.layoutDirection,
        columns: options.columns,
        animationTags,
        imageFilename,
        frameDuration: options.frameDuration,
      })
    : buildAsepriteAtlas({
        sheetWidth: options.sheetWidth,
        sheetHeight: options.sheetHeight,
        spritesheetType: options.spritesheetType || 'Half Body',
        spriteCount: options.spriteCount,
        layoutDirection: options.layoutDirection,
        columns: options.columns,
        spriteNames: names,
        imageFilename,
        frameDuration: options.frameDuration,
      })
  const atlasJson = JSON.stringify(atlas, null, 2)
  writeFileSync(join(targetDir, atlasFilename), atlasJson)
  const referencePathValue = referenceImagePath(draft)
  if (!referencePathValue) throw new Error('Generate spritesheet requires a character concept art image.')
  const request = await createOpenAiImagePayload(gameId, settings, spritesheetGenerationPrompt(draft, atlasJson, { ...options, spriteCount: frameCount, spriteNames: names, animationTags }), referencePathValue, {
    size: settings.spritesheetResolution,
    outputFormat: spritesheetOutputFormat,
  })
  console.info(`[studio] OpenAI Images spritesheet request: game=${gameId} character=${characterId} folder=${folder} model=${settings.model} size=${settings.spritesheetResolution} backgroundRemoval=${settings.spritesheetBackgroundRemovalEnabled ? 'on' : 'off'}`)
  const response = await fetch(request.url, request.init)
  const payload = await response.json().catch(() => null) as unknown
  console.info(`[studio] OpenAI Images spritesheet payload summary: ${imageResponseSummary(payload)}`)
  if (!response.ok) throw new Error(openAiErrorMessage(payload, `OpenAI spritesheet generation failed with ${response.status}.`))
  const generated = await imageBytesFromResponse(payload)
  const imageBytes = runSpritesheetBackgroundRemoval(generated.bytes, settings)
  writeFileSync(join(targetDir, imageFilename), imageBytes)
  const runtimeNames = atlasKind === 'Animation' ? animationTags.map(tag => tag.name) : names
  const animation = updateSpritesheetLibrary(draft.animation, atlasKind, folder, assetPath, atlasPathValue, runtimeNames, draft.defaultExpression || 'neutral')
  const savedExpressions = atlasKind === 'Animation' ? draft.expressions : runtimeNames
  const saved = await writeCharacter(gameId, path, { ...draft, animation, expressions: savedExpressions })
  return {
    path: assetPath,
    atlasPath: atlasPathValue,
    url: assetUrl(gameId, assetPath),
    revisedPrompt: generated.revisedPrompt,
    character: saved.character,
  }
}

export async function uploadCharacterSheetConcept(
  gameId: string,
  path: string,
  draft: StudioCharacterDraft,
  file: File,
  artType?: StudioCharacterSheetArtType,
): Promise<StudioCharacterSheetUploadResponse> {
  await validateGame(gameId)
  if (!file || file.size === 0) throw new Error('Missing character sheet image.')
  const characterId = draft.id.trim() || path.replace(/\.md$/, '')
  const uploadArtType = artTypeValue(artType)
  const targetKind = uploadArtType ? 'generated' : 'concepts'
  const targetDir = join(GAMES_DIR, gameId, 'assets', 'characters', characterId, 'character-sheet', targetKind)
  mkdirSync(targetDir, { recursive: true })
  const filename = uploadArtType
    ? nextGeneratedFilename(targetDir, safeImageExtension(file.name || 'concept.png'), uploadArtType)
    : nextConceptFilename(targetDir, file.name || 'concept.png')
  const assetPath = `characters/${characterId}/character-sheet/${targetKind}/${filename}`
  writeFileSync(join(targetDir, filename), new Uint8Array(await file.arrayBuffer()))
  const currentSheet = draft.characterSheet ?? { main: '', concepts: [], generated: [] }
  const nextSheet = {
    main: currentSheet.main || assetPath,
    concepts: uploadArtType ? currentSheet.concepts : [...currentSheet.concepts, assetPath],
    generated: uploadArtType ? [...currentSheet.generated, assetPath] : currentSheet.generated,
  }
  const saved = await writeCharacter(gameId, path, { ...draft, characterSheet: nextSheet })
  return {
    path: assetPath,
    url: assetUrl(gameId, assetPath),
    character: saved.character,
  }
}

export async function generateCharacterSheetConcept(
  gameId: string,
  path: string,
  draft: StudioCharacterDraft,
  _prompt = '',
  artTypes?: StudioCharacterSheetArtType[],
): Promise<StudioCharacterSheetGenerateResponse> {
  await validateGame(gameId)
  const settings = await readOpenAiImagesSettingsForGeneration(gameId)
  if (!settings.apiKey) throw new Error('OpenAI Images API key is not configured in Studio settings.')
  const characterId = draft.id.trim() || path.replace(/\.md$/, '')
  const targetDir = join(GAMES_DIR, gameId, 'assets', 'characters', characterId, 'character-sheet', 'generated')
  mkdirSync(targetDir, { recursive: true })
  const selectedArtTypes = normalizedArtTypes(artTypes)
  const referencePathValue = referenceImagePath(draft)
  const generatedImages: StudioGeneratedCharacterSheetImage[] = []
  for (const artType of selectedArtTypes) {
    const requestStartedAt = Date.now()
    const controller = new AbortController()
    const timeoutMs = settings.imageGenerationTimeoutSeconds * 1000
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const imagePrompt = buildCharacterImagePrompt(draft, artType, referencePathValue)
    const request = await createOpenAiImagePayload(gameId, settings, imagePrompt, referencePathValue)
    console.info(`[studio] OpenAI Images request: game=${gameId} character=${characterId} artType=${artType} model=${settings.model} size=${settings.characterSheetResolution} moderation=${settings.moderation} reference=${referencePathValue ? 'yes' : 'no'}`)
    let response: Response
    try {
      response = await fetch(request.url, { ...request.init, signal: controller.signal })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      if (err.name === 'AbortError') throw new Error(`OpenAI image generation timed out after ${settings.imageGenerationTimeoutSeconds} seconds.`)
      throw err
    } finally {
      clearTimeout(timeout)
    }
    const elapsedMs = Date.now() - requestStartedAt
    console.info(`[studio] OpenAI Images response: artType=${artType} status=${response.status} elapsedMs=${elapsedMs} contentType=${response.headers.get('content-type') ?? 'unknown'}`)
    const payload = await response.json().catch(() => null) as unknown
    console.info(`[studio] OpenAI Images payload summary: ${imageResponseSummary(payload)}`)
    if (!response.ok) throw new Error(openAiErrorMessage(payload, `OpenAI image generation failed with ${response.status}.`))
    const generated = await imageBytesFromResponse(payload)
    const filename = nextGeneratedFilename(targetDir, imageExtension(settings.outputFormat), artType)
    const assetPath = `characters/${characterId}/character-sheet/generated/${filename}`
    writeFileSync(join(targetDir, filename), generated.bytes)
    generatedImages.push({
      artType,
      path: assetPath,
      url: assetUrl(gameId, assetPath),
      revisedPrompt: generated.revisedPrompt,
      referencePath: referencePathValue,
    })
    console.info(`[studio] OpenAI Images saved generated concept: ${assetPath}`)
  }
  if (generatedImages.length === 0) throw new Error('No character sheet art types were selected.')
  const currentSheet = draft.characterSheet ?? { main: '', concepts: [], generated: [] }
  const nextSheet = {
    main: currentSheet.main || generatedImages[0]?.path || '',
    concepts: currentSheet.concepts,
    generated: [...currentSheet.generated, ...generatedImages.map(image => image.path)],
  }
  const saved = await writeCharacter(gameId, path, { ...draft, characterSheet: nextSheet })
  return {
    path: generatedImages[0]?.path ?? '',
    url: generatedImages[0]?.url ?? null,
    revisedPrompt: generatedImages[0]?.revisedPrompt ?? '',
    generated: generatedImages,
    character: saved.character,
  }
}

export async function editCharacterSheetConcept(
  gameId: string,
  path: string,
  draft: StudioCharacterDraft,
  assetPath: string,
  prompt: string,
): Promise<StudioCharacterSheetEditResponse> {
  await validateGame(gameId)
  const settings = await readOpenAiImagesSettingsForGeneration(gameId)
  if (!settings.apiKey) throw new Error('OpenAI Images API key is not configured in Studio settings.')
  const trimmedPrompt = prompt.trim()
  if (!trimmedPrompt) throw new Error('Missing edit instruction.')
  const characterId = draft.id.trim() || path.replace(/\.md$/, '')
  const normalizedAssetPath = assetPath.replace(/\\/g, '/').replace(/^assets\//, '').replace(/^\/+/, '')
  assertCharacterSheetAssetPath(characterId, normalizedAssetPath)
  const targetDir = join(GAMES_DIR, gameId, 'assets', 'characters', characterId, 'character-sheet', 'generated')
  mkdirSync(targetDir, { recursive: true })
  const requestStartedAt = Date.now()
  const controller = new AbortController()
  const timeoutMs = settings.imageGenerationTimeoutSeconds * 1000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const request = await createOpenAiImagePayload(gameId, settings, trimmedPrompt, normalizedAssetPath)
  console.info(`[studio] OpenAI Images edit request: game=${gameId} character=${characterId} source=${normalizedAssetPath} model=${settings.model} size=${settings.characterSheetResolution} moderation=${settings.moderation}`)
  let response: Response
  try {
    response = await fetch(request.url, { ...request.init, signal: controller.signal })
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    if (err.name === 'AbortError') throw new Error(`OpenAI image edit timed out after ${settings.imageGenerationTimeoutSeconds} seconds.`)
    throw err
  } finally {
    clearTimeout(timeout)
  }
  const elapsedMs = Date.now() - requestStartedAt
  console.info(`[studio] OpenAI Images edit response: status=${response.status} elapsedMs=${elapsedMs} contentType=${response.headers.get('content-type') ?? 'unknown'}`)
  const payload = await response.json().catch(() => null) as unknown
  console.info(`[studio] OpenAI Images edit payload summary: ${imageResponseSummary(payload)}`)
  if (!response.ok) throw new Error(openAiErrorMessage(payload, `OpenAI image edit failed with ${response.status}.`))
  const generated = await imageBytesFromResponse(payload)
  const filename = nextGeneratedFilenameForPrefix(targetDir, imageExtension(settings.outputFormat), CHARACTER_SHEET_EDIT_SLUG)
  const nextAssetPath = `characters/${characterId}/character-sheet/generated/${filename}`
  writeFileSync(join(targetDir, filename), generated.bytes)
  const currentSheet = draft.characterSheet ?? { main: '', concepts: [], generated: [] }
  const nextSheet = {
    main: currentSheet.main || nextAssetPath,
    concepts: currentSheet.concepts,
    generated: [...currentSheet.generated, nextAssetPath],
  }
  const saved = await writeCharacter(gameId, path, { ...draft, characterSheet: nextSheet })
  console.info(`[studio] OpenAI Images saved edited concept: ${nextAssetPath}`)
  return {
    path: nextAssetPath,
    url: assetUrl(gameId, nextAssetPath),
    revisedPrompt: generated.revisedPrompt,
    sourcePath: normalizedAssetPath,
    character: saved.character,
  }
}

export async function deleteCharacterSheetConcept(
  gameId: string,
  path: string,
  draft: StudioCharacterDraft,
  assetPath: string,
): Promise<StudioCharacterSheetDeleteResponse> {
  await validateGame(gameId)
  const characterId = draft.id.trim() || path.replace(/\.md$/, '')
  const normalizedAssetPath = assetPath.replace(/\\/g, '/').replace(/^assets\//, '').replace(/^\/+/, '')
  assertCharacterSheetAssetPath(characterId, normalizedAssetPath)
  const currentSheet = draft.characterSheet ?? { main: '', concepts: [], generated: [] }
  const nextConcepts = currentSheet.concepts.filter(item => item !== normalizedAssetPath)
  const nextGenerated = currentSheet.generated.filter(item => item !== normalizedAssetPath)
  const nextMain = currentSheet.main === normalizedAssetPath ? nextConcepts[0] ?? nextGenerated[0] ?? '' : currentSheet.main
  const filePath = resolveAssetPath(gameId, normalizedAssetPath)
  if (existsSync(filePath)) unlinkSync(filePath)
  const saved = await writeCharacter(gameId, path, {
    ...draft,
    characterSheet: {
      main: nextMain,
      concepts: nextConcepts,
      generated: nextGenerated,
    },
  })
  return {
    deletedPath: normalizedAssetPath,
    character: saved.character,
  }
}
