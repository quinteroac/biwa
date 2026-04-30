import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs'
import { basename, dirname, extname, join, normalize, relative } from 'path'
import yaml from 'js-yaml'
import { validateGame } from '../../manager/commands/doctor.ts'
import { createCharacterAtlas } from '../../manager/commands/assets.ts'
import { getAsepriteFrameItems, getAsepriteFrameTags } from '../../framework/engine/AsepriteAtlas.ts'
import { imageExtension, readOpenAiImagesSettingsForGeneration } from './settings.ts'
import type { AsepriteAtlas } from '../../framework/engine/AsepriteAtlas.ts'
import type {
  StudioCharacterAtlasResponse,
  StudioCharacterAtlasSummary,
  StudioCharacterDraft,
  StudioCharacterItem,
  StudioCharacterResponse,
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

function expressionNames(data: Record<string, unknown>): string[] {
  const animation = animationRecord(data)
  const mapped = stringMapKeys(animation['expressions'])
  if (mapped.length > 0) return mapped
  const sprites = stringMapKeys(animation['sprites'])
  if (sprites.length > 0) return sprites
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
  const defaultExpression = typeof data['defaultExpression'] === 'string' ? data['defaultExpression'] : ''
  const sprites = recordValue(animation['sprites'])
  if (sprites) {
    const sprite = typeof sprites[defaultExpression] === 'string' ? sprites[defaultExpression] : firstStringFromRecord(sprites)
    if (sprite) return sprite
  }
  if (typeof animation['file'] === 'string') return animation['file']
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
  return typeof animation['atlas'] === 'string' ? animation['atlas'] : ''
}

function assetUrl(gameId: string, path: string): string {
  return `/api/projects/${gameId}/assets/file?path=${encodeURIComponent(path)}`
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
  const frameItems = getAsepriteFrameItems(parsed)
  const frameTags = getAsepriteFrameTags(parsed)
  const tags = frameTags.map(tag => tag.name)
  const animation = animationRecord(data)
  const expression = typeof data['defaultExpression'] === 'string' ? data['defaultExpression'] : 'neutral'
  const expressions = recordValue(animation['expressions'])
  const targetName = typeof expressions?.[expression] === 'string'
    ? expressions[expression]
    : typeof expressions?.['neutral'] === 'string'
      ? expressions['neutral']
      : expression
  const tag = frameTags.find(item => item.name === targetName) ?? frameTags[0]
  const frameItem = typeof tag?.from === 'number' ? frameItems[tag.from] : frameItems[0]
  return {
    path,
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

async function createOpenAiImagePayload(
  gameId: string,
  settings: Awaited<ReturnType<typeof readOpenAiImagesSettingsForGeneration>>,
  prompt: string,
  referencePathValue: string | null,
): Promise<{ url: string; init: RequestInit }> {
  if (!referencePathValue) {
    return {
      url: apiUrl(settings.baseUrl, settings.imageGenerationPath),
      init: {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.model,
          prompt,
          n: 1,
          size: settings.characterSheetResolution,
          quality: settings.quality,
          output_format: settings.outputFormat,
          moderation: settings.moderation,
        }),
      },
    }
  }
  const imagePath = resolveAssetPath(gameId, referencePathValue)
  const image = Bun.file(imagePath)
  const form = new FormData()
  form.set('model', settings.model)
  form.set('prompt', prompt)
  form.set('n', '1')
  form.set('size', settings.characterSheetResolution)
  form.set('quality', settings.quality)
  form.set('output_format', settings.outputFormat)
  form.set('moderation', settings.moderation)
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
  const animation = {
    ...animationRecord(existing.data),
    ...draft.animation,
  }
  const expressions = expressionMap(draft.expressions, recordValue(animation['expressions']) ?? {})
  if (Object.keys(expressions).length > 0) animation['expressions'] = expressions
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
  const names = draft.expressions.length > 0 ? draft.expressions : [draft.defaultExpression || 'neutral']
  const image = typeof draft.animation['file'] === 'string'
    ? draft.animation['file'].split('/').pop() ?? `${characterId}_spritesheet.png`
    : `${characterId}_spritesheet.png`
  const result = createCharacterAtlas(gameId, characterId, {
    names: names.join(','),
    count: String(names.length),
    width: String(Math.max(1, names.length) * 512),
    height: '512',
    image,
    out: `assets/characters/${characterId}/${characterId}_atlas.json`,
  })
  const animation = {
    ...draft.animation,
    type: typeof draft.animation['type'] === 'string' ? draft.animation['type'] : 'spritesheet',
    file: typeof draft.animation['file'] === 'string' ? draft.animation['file'] : `characters/${characterId}/${image}`,
    atlas: atlasRelativePath(result.atlasPath),
    expressions: expressionMap(names, recordValue(draft.animation['expressions']) ?? {}),
  }
  const saved = await writeCharacter(gameId, path, { ...draft, animation, expressions: names })
  const summary = saved.character.atlas ?? {
    path: String(animation['atlas']),
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
