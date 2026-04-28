import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { dirname, join, normalize, relative } from 'path'
import yaml from 'js-yaml'
import { validateGame } from '../../manager/commands/doctor.ts'
import type { StudioSceneDraft, StudioSceneItem, StudioSceneResponse } from '../shared/types.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const GAMES_DIR = join(ROOT, 'games')

function assertGameId(gameId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(gameId)) throw new Error(`Invalid game id: ${gameId}`)
}

function scenesDir(gameId: string): string {
  assertGameId(gameId)
  return join(GAMES_DIR, gameId, 'data', 'scenes')
}

function normalizeScenePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

function resolveSceneFile(gameId: string, path: string): string {
  const baseDir = scenesDir(gameId)
  const normalizedPath = normalizeScenePath(path)
  if (!normalizedPath.endsWith('.md')) throw new Error('Scene path must point to a .md file.')
  const resolved = normalize(join(baseDir, normalizedPath))
  if (!resolved.startsWith(baseDir)) throw new Error('Scene path escapes the project scenes directory.')
  return resolved
}

function frontmatterFromMarkdown(text: string): { data: Record<string, unknown>; body: string } {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) throw new Error('Scene file is missing YAML frontmatter.')
  const parsed = yaml.load(match[1]!) as unknown
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Scene frontmatter must be an object.')
  }
  return { data: parsed as Record<string, unknown>, body: match[2] ?? '' }
}

function backgroundAssetPath(data: Record<string, unknown>): string | null {
  const background = data['background']
  if (typeof background !== 'object' || background === null || Array.isArray(background)) return null
  const bg = background as Record<string, unknown>
  if (typeof bg['image'] === 'string') return bg['image']
  if (typeof bg['poster'] === 'string') return bg['poster']
  const variants = bg['variants']
  const defaultVariant = typeof bg['defaultVariant'] === 'string' ? bg['defaultVariant'] : null
  if (typeof variants === 'object' && variants !== null && !Array.isArray(variants)) {
    const variantMap = variants as Record<string, unknown>
    const firstVariant = defaultVariant ? variantMap[defaultVariant] : Object.values(variantMap)[0]
    if (typeof firstVariant === 'object' && firstVariant !== null && !Array.isArray(firstVariant)) {
      const image = (firstVariant as Record<string, unknown>)['image']
      if (typeof image === 'string') return image
    }
  }
  const layers = bg['layers']
  if (Array.isArray(layers)) {
    const firstLayer = layers.find(layer => typeof layer === 'object' && layer !== null && !Array.isArray(layer))
    const image = firstLayer ? (firstLayer as Record<string, unknown>)['image'] : null
    if (typeof image === 'string') return image
  }
  return null
}

function sceneFromFile(gameId: string, filePath: string, baseDir: string): StudioSceneItem {
  const path = relative(baseDir, filePath).replace(/\\/g, '/')
  const text = readFileSync(filePath, 'utf8')
  const { data, body } = frontmatterFromMarkdown(text)
  const assetPath = backgroundAssetPath(data)
  const scene: StudioSceneItem = {
    path,
    id: typeof data['id'] === 'string' ? data['id'] : path.replace(/\.md$/, ''),
    displayName: typeof data['displayName'] === 'string'
      ? data['displayName']
      : typeof data['name'] === 'string'
        ? data['name']
        : path.replace(/\.md$/, ''),
    description: typeof data['description'] === 'string' ? data['description'] : '',
    location: typeof data['location'] === 'string' ? data['location'] : '',
    timeOfDay: typeof data['timeOfDay'] === 'string' ? data['timeOfDay'] : '',
    weather: typeof data['weather'] === 'string' ? data['weather'] : '',
    mood: typeof data['mood'] === 'string' ? data['mood'] : '',
    prompt: typeof data['prompt'] === 'string' ? data['prompt'] : '',
    thumbnail: typeof data['thumbnail'] === 'string' ? data['thumbnail'] : '',
    previewUrl: assetPath ? `/api/projects/${gameId}/assets/file?path=${encodeURIComponent(assetPath)}` : null,
    body,
  }
  if (typeof data['background'] === 'object' && data['background'] !== null && !Array.isArray(data['background'])) {
    scene.background = data['background'] as Record<string, unknown>
  }
  return scene
}

function walkSceneFiles(gameId: string, dir: string, baseDir = dir): StudioSceneItem[] {
  if (!existsSync(dir)) return []
  const scenes: StudioSceneItem[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      scenes.push(...walkSceneFiles(gameId, fullPath, baseDir))
      continue
    }
    if (entry.name.endsWith('.md')) scenes.push(sceneFromFile(gameId, fullPath, baseDir))
  }
  return scenes.sort((a, b) => a.id.localeCompare(b.id))
}

export async function listScenes(gameId: string): Promise<StudioSceneItem[]> {
  await validateGame(gameId)
  return walkSceneFiles(gameId, scenesDir(gameId))
}

export async function readScene(gameId: string, path: string): Promise<StudioSceneResponse> {
  await validateGame(gameId)
  const filePath = resolveSceneFile(gameId, path)
  if (!existsSync(filePath)) throw new Error(`Scene file not found: ${path}`)
  return { scene: sceneFromFile(gameId, filePath, scenesDir(gameId)) }
}

export async function writeScene(gameId: string, path: string, draft: StudioSceneDraft): Promise<StudioSceneResponse> {
  await validateGame(gameId)
  const filePath = resolveSceneFile(gameId, path)
  if (!existsSync(dirname(filePath))) throw new Error(`Scene directory not found for: ${path}`)
  const existing = existsSync(filePath) ? frontmatterFromMarkdown(readFileSync(filePath, 'utf8')) : { data: {}, body: '' }
  const data = {
    ...existing.data,
    id: draft.id,
    displayName: draft.displayName,
    description: draft.description,
    location: draft.location,
    timeOfDay: draft.timeOfDay,
    weather: draft.weather,
    mood: draft.mood,
    prompt: draft.prompt,
    thumbnail: draft.thumbnail,
    background: draft.background,
  }
  const body = draft.body ?? existing.body
  const content = `---\n${yaml.dump(data, { lineWidth: 100, noRefs: true }).trim()}\n---\n\n${body.trim()}\n`
  writeFileSync(filePath, content)
  return readScene(gameId, path)
}
