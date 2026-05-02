import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from 'fs'
import { basename, dirname, extname, join, normalize, relative } from 'path'
import yaml from 'js-yaml'
import { validateGame } from '../../manager/commands/doctor.ts'
import { imageExtension, readOpenAiImagesSettingsForGeneration } from './settings.ts'
import type {
  StudioSceneBackgroundDeleteResponse,
  StudioSceneBackgroundFolderResponse,
  StudioSceneBackgroundGenerateRequest,
  StudioSceneBackgroundGenerateResponse,
  StudioSceneBackgroundUploadResponse,
  StudioSceneDraft,
  StudioSceneFileMutationResponse,
  StudioSceneFolder,
  StudioSceneFolderResponse,
  StudioSceneGenerateRequest,
  StudioSceneItem,
  StudioSceneResponse,
  StudioScenesResponse,
} from '../shared/types.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const GAMES_DIR = join(ROOT, 'games')
const SCENE_BACKGROUND_IMAGE_SIZE = '1536x1024'

function assertGameId(gameId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(gameId)) throw new Error(`Invalid game id: ${gameId}`)
}

function scenesDir(gameId: string): string {
  assertGameId(gameId)
  return join(GAMES_DIR, gameId, 'data', 'scenes')
}

function assetsDir(gameId: string): string {
  assertGameId(gameId)
  return join(GAMES_DIR, gameId, 'assets')
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

function resolveSceneFolder(gameId: string, path: string): string {
  const baseDir = scenesDir(gameId)
  const normalizedPath = normalizeScenePath(path)
  if (!normalizedPath || normalizedPath.endsWith('.md')) throw new Error('Scene folder path must be a directory.')
  const resolved = normalize(join(baseDir, normalizedPath))
  if (!resolved.startsWith(baseDir)) throw new Error('Scene folder path escapes the project scenes directory.')
  return resolved
}

function resolveAssetPath(gameId: string, path: string): string {
  const baseDir = assetsDir(gameId)
  const normalizedPath = path.replace(/\\/g, '/').replace(/^\/+/, '')
  const resolved = normalize(join(baseDir, normalizedPath))
  if (!resolved.startsWith(baseDir)) throw new Error('Scene asset path escapes the project assets directory.')
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

function assetUrl(gameId: string, path: string): string {
  return `/api/projects/${gameId}/assets/file?path=${encodeURIComponent(path)}`
}

function safeSceneFolderName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Scene background folder name is required.')
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) throw new Error('Scene background folder name is invalid.')
  return trimmed
}

function isSceneImage(filename: string): boolean {
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(extname(filename).toLowerCase())
}

function sceneBackgroundRootDir(gameId: string, sceneId: string): string {
  return join(GAMES_DIR, gameId, 'assets', 'scenes', sceneId)
}

function sceneBackgroundAssetPath(sceneId: string, folder: string, filename: string): string {
  return folder === 'Main'
    ? `scenes/${sceneId}/${filename}`
    : `scenes/${sceneId}/${folder}/${filename}`
}

function sceneBackgroundFolders(gameId: string, sceneId: string): string[] {
  const root = sceneBackgroundRootDir(gameId, sceneId)
  const folders = new Set<string>(['Main'])
  if (existsSync(root)) {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory()) folders.add(entry.name)
    }
  }
  return [...folders].sort((a, b) => a === 'Main' ? -1 : b === 'Main' ? 1 : a.localeCompare(b))
}

function sceneBackgroundAssets(gameId: string, sceneId: string, data: Record<string, unknown>) {
  const root = sceneBackgroundRootDir(gameId, sceneId)
  if (!existsSync(root)) return []
  const activePath = backgroundAssetPath(data) ?? ''
  return sceneBackgroundFolders(gameId, sceneId).flatMap(folder => {
    const dir = folder === 'Main' ? root : join(root, folder)
    if (!existsSync(dir)) return []
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      if (!entry.isFile() || !isSceneImage(entry.name)) return []
      const path = sceneBackgroundAssetPath(sceneId, folder, entry.name)
      return [{
        folder,
        path,
        url: assetUrl(gameId, path),
        size: statSync(join(dir, entry.name)).size,
        isActive: path === activePath,
      }]
    })
  }).sort((a, b) => a.folder === b.folder ? a.path.localeCompare(b.path) : a.folder === 'Main' ? -1 : b.folder === 'Main' ? 1 : a.folder.localeCompare(b.folder))
}

function sceneFromFile(gameId: string, filePath: string, baseDir: string): StudioSceneItem {
  const path = relative(baseDir, filePath).replace(/\\/g, '/')
  const text = readFileSync(filePath, 'utf8')
  const { data, body } = frontmatterFromMarkdown(text)
  const assetPath = backgroundAssetPath(data)
  const sceneId = typeof data['id'] === 'string' ? data['id'] : path.replace(/\.md$/, '')
  const scene: StudioSceneItem = {
    path,
    id: sceneId,
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
    backgroundFolders: sceneBackgroundFolders(gameId, sceneId),
    backgrounds: sceneBackgroundAssets(gameId, sceneId, data),
    body,
  }
  if (typeof data['background'] === 'object' && data['background'] !== null && !Array.isArray(data['background'])) {
    scene.background = data['background'] as Record<string, unknown>
  }
  if (typeof data['audio'] === 'object' && data['audio'] !== null && !Array.isArray(data['audio'])) {
    scene.audio = data['audio'] as Record<string, unknown>
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

function walkSceneFolders(dir: string, baseDir = dir): StudioSceneFolder[] {
  if (!existsSync(dir)) return []
  const folders: StudioSceneFolder[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const fullPath = join(dir, entry.name)
    folders.push({ path: relative(baseDir, fullPath).replace(/\\/g, '/') })
    folders.push(...walkSceneFolders(fullPath, baseDir))
  }
  return folders.sort((a, b) => a.path.localeCompare(b.path))
}

function sceneEntries(gameId: string): StudioScenesResponse {
  const baseDir = scenesDir(gameId)
  return {
    scenes: walkSceneFiles(gameId, baseDir),
    folders: walkSceneFolders(baseDir),
  }
}

function safeSceneFileStem(name: string): string {
  return (name.trim() || 'new-scene')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'new-scene'
}

function nextSceneFilePath(gameId: string, folder: string, name: string): string {
  const normalizedFolder = folder.trim() ? normalizeScenePath(folder).replace(/\/+$/, '') : ''
  const stem = safeSceneFileStem(name)
  const first = normalizedFolder ? `${normalizedFolder}/${stem}.md` : `${stem}.md`
  if (!existsSync(resolveSceneFile(gameId, first))) return first
  for (let index = 2; index < 1000; index += 1) {
    const next = normalizedFolder ? `${normalizedFolder}/${stem}-${String(index).padStart(3, '0')}.md` : `${stem}-${String(index).padStart(3, '0')}.md`
    if (!existsSync(resolveSceneFile(gameId, next))) return next
  }
  throw new Error('Could not allocate a unique scene filename.')
}

function sceneIdFromPath(path: string): string {
  return path.replace(/\.md$/, '').split('/').at(-1) ?? 'scene'
}

function titleFromSceneId(id: string): string {
  return id.split(/[-_]/g).filter(Boolean).map(part => part[0] ? `${part[0].toUpperCase()}${part.slice(1)}` : part).join(' ') || 'New Scene'
}

function sceneDraftFromPrompt(path: string, prompt: string): StudioSceneDraft {
  const id = sceneIdFromPath(path)
  return {
    id,
    displayName: titleFromSceneId(id),
    description: prompt.trim() || 'Generated visual novel scene.',
    location: '',
    timeOfDay: '',
    weather: '',
    mood: '',
    prompt,
    thumbnail: '',
    background: { type: 'static', image: '' },
    audio: {},
    body: '',
  }
}

function safeImageExtension(name: string): string {
  const ext = extname(name).toLowerCase()
  if (!['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
    throw new Error('Scene background must be a PNG, JPG, WebP or GIF image.')
  }
  return ext
}

function nextSceneBackgroundFilename(dir: string, originalName: string): string {
  const ext = safeImageExtension(originalName || 'background.png')
  const stem = basename(originalName || 'background', extname(originalName || 'background'))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'background'
  const first = `${stem}${ext}`
  if (!existsSync(join(dir, first))) return first
  for (let index = 2; index < 1000; index += 1) {
    const next = `${stem}-${String(index).padStart(3, '0')}${ext}`
    if (!existsSync(join(dir, next))) return next
  }
  throw new Error('Could not allocate a unique scene background filename.')
}

function updateSceneBackground(draft: StudioSceneDraft, image: string): StudioSceneDraft {
  return {
    ...draft,
    thumbnail: draft.thumbnail || image,
    background: {
      ...draft.background,
      type: typeof draft.background['type'] === 'string' ? draft.background['type'] : 'static',
      image,
    },
  }
}

function clearSceneBackground(draft: StudioSceneDraft, deletedPath: string): StudioSceneDraft {
  const nextBackground = { ...draft.background }
  if (nextBackground['image'] === deletedPath) nextBackground['image'] = ''
  if (nextBackground['poster'] === deletedPath) nextBackground['poster'] = ''
  return {
    ...draft,
    thumbnail: draft.thumbnail === deletedPath ? '' : draft.thumbnail,
    background: nextBackground,
  }
}

function openAiErrorMessage(payload: unknown, fallback: string): string {
  const record = typeof payload === 'object' && payload !== null && !Array.isArray(payload) ? payload as Record<string, unknown> : null
  const error = typeof record?.['error'] === 'object' && record['error'] !== null && !Array.isArray(record['error'])
    ? record['error'] as Record<string, unknown>
    : null
  if (typeof error?.['message'] === 'string') return error['message']
  if (typeof record?.['message'] === 'string') return record['message']
  return fallback
}

async function imageBytesFromResponse(payload: unknown): Promise<{ bytes: Uint8Array; revisedPrompt: string }> {
  const record = typeof payload === 'object' && payload !== null && !Array.isArray(payload) ? payload as Record<string, unknown> : null
  const data = Array.isArray(record?.['data']) ? record['data'] : []
  const first = typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0]) ? data[0] as Record<string, unknown> : null
  const b64 = typeof first?.['b64_json'] === 'string' ? first['b64_json'] : ''
  if (b64) {
    return {
      bytes: new Uint8Array(Buffer.from(b64, 'base64')),
      revisedPrompt: typeof first?.['revised_prompt'] === 'string' ? first['revised_prompt'] : '',
    }
  }
  const url = typeof first?.['url'] === 'string' ? first['url'] : ''
  if (!url) throw new Error('OpenAI image response did not include image data.')
  const response = await fetch(url)
  if (!response.ok) throw new Error(`OpenAI returned an image URL, but downloading it failed with ${response.status}.`)
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    revisedPrompt: typeof first?.['revised_prompt'] === 'string' ? first['revised_prompt'] : '',
  }
}

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function sceneBackgroundPrompt(draft: StudioSceneDraft, prompt: string): string {
  return [
    prompt.trim() || `Create a production visual novel background for ${draft.displayName || draft.id}.`,
    `Scene: ${draft.displayName || draft.id}.`,
    draft.description ? `Description: ${draft.description}.` : '',
    draft.location ? `Location: ${draft.location}.` : '',
    draft.timeOfDay ? `Time of day: ${draft.timeOfDay}.` : '',
    draft.weather ? `Weather: ${draft.weather}.` : '',
    draft.mood ? `Mood: ${draft.mood}.` : '',
    'Wide 16:9 composition, no characters, no text, no UI, no watermark.',
    'Leave usable negative space for visual novel dialogue UI near the lower third.',
  ].filter(Boolean).join('\n')
}

export async function listScenes(gameId: string): Promise<StudioSceneItem[]> {
  await validateGame(gameId)
  return walkSceneFiles(gameId, scenesDir(gameId))
}

export async function listSceneEntries(gameId: string): Promise<StudioScenesResponse> {
  await validateGame(gameId)
  return sceneEntries(gameId)
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
    audio: draft.audio,
  }
  const body = draft.body ?? existing.body
  const content = `---\n${yaml.dump(data, { lineWidth: 100, noRefs: true }).trim()}\n---\n\n${body.trim()}\n`
  writeFileSync(filePath, content)
  return readScene(gameId, path)
}

export async function createSceneFolder(gameId: string, path: string): Promise<StudioSceneFolderResponse> {
  await validateGame(gameId)
  mkdirSync(resolveSceneFolder(gameId, path), { recursive: true })
  return { folder: normalizeScenePath(path), ...sceneEntries(gameId) }
}

export async function createSceneFile(gameId: string, folder: string, name: string): Promise<StudioSceneFileMutationResponse> {
  await validateGame(gameId)
  const path = nextSceneFilePath(gameId, folder, name)
  mkdirSync(dirname(resolveSceneFile(gameId, path)), { recursive: true })
  const draft = sceneDraftFromPrompt(path, '')
  const saved = await writeScene(gameId, path, draft)
  return { scene: saved.scene, ...sceneEntries(gameId) }
}

export async function uploadSceneFile(gameId: string, folder: string, file: File): Promise<StudioSceneFileMutationResponse> {
  await validateGame(gameId)
  if (!file || file.size === 0) throw new Error('Missing scene Markdown file.')
  if (!file.name.endsWith('.md')) throw new Error('Scene upload must be a Markdown .md file.')
  const path = nextSceneFilePath(gameId, folder, file.name.replace(/\.md$/, ''))
  const filePath = resolveSceneFile(gameId, path)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, await file.text())
  const saved = await readScene(gameId, path)
  return { scene: saved.scene, ...sceneEntries(gameId) }
}

export async function generateSceneFile(
  gameId: string,
  options: StudioSceneGenerateRequest,
): Promise<StudioSceneFileMutationResponse> {
  await validateGame(gameId)
  const path = nextSceneFilePath(gameId, options.folder, options.prompt || 'generated-scene')
  mkdirSync(dirname(resolveSceneFile(gameId, path)), { recursive: true })
  const draft = sceneDraftFromPrompt(path, options.prompt)
  const saved = await writeScene(gameId, path, draft)
  const generated = await generateSceneBackground(gameId, path, draftFromSceneItem(saved.scene), {
    folder: 'Main',
    prompt: options.prompt,
  })
  return { scene: generated.scene, ...sceneEntries(gameId) }
}

function draftFromSceneItem(scene: StudioSceneItem): StudioSceneDraft {
  return {
    id: scene.id,
    displayName: scene.displayName,
    description: scene.description,
    location: scene.location,
    timeOfDay: scene.timeOfDay,
    weather: scene.weather,
    mood: scene.mood,
    prompt: scene.prompt,
    thumbnail: scene.thumbnail,
    background: scene.background ?? { type: 'static', image: '' },
    audio: scene.audio ?? {},
    body: scene.body,
  }
}

export async function deleteSceneFile(gameId: string, path: string): Promise<StudioScenesResponse> {
  await validateGame(gameId)
  const filePath = resolveSceneFile(gameId, path)
  if (!existsSync(filePath)) throw new Error(`Scene file not found: ${path}`)
  unlinkSync(filePath)
  return sceneEntries(gameId)
}

export async function createSceneBackgroundFolder(
  gameId: string,
  path: string,
  draft: StudioSceneDraft,
  folderName: string,
): Promise<StudioSceneBackgroundFolderResponse> {
  await validateGame(gameId)
  const sceneId = draft.id.trim() || path.replace(/\.md$/, '')
  const folder = safeSceneFolderName(folderName)
  const dir = folder === 'Main' ? sceneBackgroundRootDir(gameId, sceneId) : join(sceneBackgroundRootDir(gameId, sceneId), folder)
  mkdirSync(dir, { recursive: true })
  const current = await readScene(gameId, path)
  return { folder, scene: current.scene }
}

export async function uploadSceneBackground(
  gameId: string,
  path: string,
  draft: StudioSceneDraft,
  file: File,
  folderName = 'Main',
): Promise<StudioSceneBackgroundUploadResponse> {
  await validateGame(gameId)
  if (!file || file.size === 0) throw new Error('Missing scene background image.')
  const sceneId = draft.id.trim() || path.replace(/\.md$/, '')
  const folder = safeSceneFolderName(folderName)
  const targetDir = folder === 'Main' ? sceneBackgroundRootDir(gameId, sceneId) : join(sceneBackgroundRootDir(gameId, sceneId), folder)
  mkdirSync(targetDir, { recursive: true })
  const filename = nextSceneBackgroundFilename(targetDir, file.name || 'background.png')
  const assetPath = sceneBackgroundAssetPath(sceneId, folder, filename)
  writeFileSync(join(targetDir, filename), new Uint8Array(await file.arrayBuffer()))
  const saved = await writeScene(gameId, path, updateSceneBackground(draft, assetPath))
  return {
    path: assetPath,
    url: assetUrl(gameId, assetPath),
    scene: saved.scene,
  }
}

export async function generateSceneBackground(
  gameId: string,
  path: string,
  draft: StudioSceneDraft,
  options: StudioSceneBackgroundGenerateRequest,
): Promise<StudioSceneBackgroundGenerateResponse> {
  await validateGame(gameId)
  const settings = await readOpenAiImagesSettingsForGeneration(gameId)
  const sceneId = draft.id.trim() || path.replace(/\.md$/, '')
  const folder = safeSceneFolderName(options.folder || 'Main')
  const targetDir = folder === 'Main' ? sceneBackgroundRootDir(gameId, sceneId) : join(sceneBackgroundRootDir(gameId, sceneId), folder)
  mkdirSync(targetDir, { recursive: true })
  const filename = nextSceneBackgroundFilename(targetDir, `background.${imageExtension(settings.outputFormat)}`)
  const assetPath = sceneBackgroundAssetPath(sceneId, folder, filename)
  const body: Record<string, unknown> = {
    model: settings.model,
    prompt: sceneBackgroundPrompt(draft, options.prompt),
    n: 1,
    size: SCENE_BACKGROUND_IMAGE_SIZE,
    quality: settings.quality,
    output_format: settings.outputFormat,
    moderation: settings.moderation,
  }
  const response = await fetch(apiUrl(settings.baseUrl, settings.imageGenerationPath), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null) as unknown
  if (!response.ok) throw new Error(openAiErrorMessage(payload, `OpenAI scene background generation failed with ${response.status}.`))
  const generated = await imageBytesFromResponse(payload)
  writeFileSync(join(targetDir, filename), generated.bytes)
  const saved = await writeScene(gameId, path, updateSceneBackground(draft, assetPath))
  return {
    path: assetPath,
    url: assetUrl(gameId, assetPath),
    revisedPrompt: generated.revisedPrompt,
    scene: saved.scene,
  }
}

export async function deleteSceneBackground(
  gameId: string,
  path: string,
  draft: StudioSceneDraft,
  assetPath: string,
): Promise<StudioSceneBackgroundDeleteResponse> {
  await validateGame(gameId)
  const normalizedAssetPath = assetPath.replace(/\\/g, '/').replace(/^assets\//, '').replace(/^\/+/, '')
  const sceneId = draft.id.trim() || path.replace(/\.md$/, '')
  if (!normalizedAssetPath.startsWith(`scenes/${sceneId}/`) || normalizedAssetPath.includes('..')) {
    throw new Error('Scene background path must stay inside this scene asset folder.')
  }
  const filePath = resolveAssetPath(gameId, normalizedAssetPath)
  if (existsSync(filePath)) unlinkSync(filePath)
  const parent = dirname(filePath)
  const root = sceneBackgroundRootDir(gameId, sceneId)
  if (parent !== root && existsSync(parent) && readdirSync(parent).length === 0) rmSync(parent, { force: true, recursive: true })
  const saved = await writeScene(gameId, path, clearSceneBackground(draft, normalizedAssetPath))
  return {
    deletedPath: normalizedAssetPath,
    scene: saved.scene,
  }
}
