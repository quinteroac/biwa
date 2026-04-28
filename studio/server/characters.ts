import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { dirname, join, normalize, relative } from 'path'
import yaml from 'js-yaml'
import { validateGame } from '../../manager/commands/doctor.ts'
import { createCharacterAtlas } from '../../manager/commands/assets.ts'
import { getAsepriteFrameItems, getAsepriteFrameTags } from '../../framework/engine/AsepriteAtlas.ts'
import type { AsepriteAtlas } from '../../framework/engine/AsepriteAtlas.ts'
import type {
  StudioCharacterAtlasResponse,
  StudioCharacterAtlasSummary,
  StudioCharacterDraft,
  StudioCharacterItem,
  StudioCharacterResponse,
} from '../shared/types.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const GAMES_DIR = join(ROOT, 'games')

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
  return {
    path,
    id: typeof data['id'] === 'string' ? data['id'] : path.replace(/\.md$/, ''),
    displayName: typeof data['displayName'] === 'string'
      ? data['displayName']
      : typeof data['name'] === 'string'
        ? data['name']
        : path.replace(/\.md$/, ''),
    role: typeof data['role'] === 'string' ? data['role'] : '',
    physicalDescription: typeof data['physicalDescription'] === 'string' ? data['physicalDescription'] : '',
    personality: typeof data['personality'] === 'string' ? data['personality'] : '',
    palette: typeof data['palette'] === 'string' ? data['palette'] : '',
    outfit: typeof data['outfit'] === 'string' ? data['outfit'] : '',
    prompt: typeof data['prompt'] === 'string' ? data['prompt'] : '',
    nameColor: typeof data['nameColor'] === 'string' ? data['nameColor'] : '',
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
    previewUrl: assetPath ? `/api/projects/${gameId}/assets/file?path=${encodeURIComponent(assetPath)}` : null,
    atlas: readAtlasSummary(gameId, atlas, data),
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
    physicalDescription: draft.physicalDescription,
    personality: draft.personality,
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
