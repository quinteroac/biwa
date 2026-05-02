import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs'
import { extname, join, relative } from 'path'
import { validateGame } from '../../manager/commands/doctor.ts'
import { imageExtension, readOpenAiImagesSettingsForGeneration } from './settings.ts'
import type { StudioArtStyleMutationResponse, StudioArtStyleResponse, StudioArtStyleSlot, StudioAssetItem, StudioAssetKind } from '../shared/types.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const GAMES_DIR = join(ROOT, 'games')
const ART_STYLE_SLOT_COUNT = 5

function assertGameId(gameId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(gameId)) throw new Error(`Invalid game id: ${gameId}`)
}

function assetKind(path: string): StudioAssetKind {
  const lower = path.toLowerCase()
  const ext = extname(lower)
  if (lower.startsWith('characters/') || lower.includes('/characters/')) return 'characters'
  if (lower.startsWith('scenes/') || lower.includes('/scenes/')) return 'scenes'
  if (lower.startsWith('gallery/') || lower.includes('/gallery/')) return 'gallery'
  if (lower.startsWith('music/') || lower.includes('/music/')) return 'music'
  if (lower.startsWith('audio/') || lower.includes('/audio/')) return 'audio'
  if (ext === '.json' || ext === '.atlas' || ext === '.skel') return 'spritesheets'
  return 'other'
}

function isPreviewable(path: string): boolean {
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(extname(path).toLowerCase())
}

function walkAssets(gameId: string, dir: string, baseDir = dir): StudioAssetItem[] {
  if (!existsSync(dir)) return []
  const assets: StudioAssetItem[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      assets.push(...walkAssets(gameId, fullPath, baseDir))
      continue
    }
    const path = relative(baseDir, fullPath).replace(/\\/g, '/')
    assets.push({
      path,
      kind: assetKind(path),
      extension: extname(path).replace(/^\./, '').toLowerCase(),
      size: statSync(fullPath).size,
      previewUrl: isPreviewable(path) ? `/api/projects/${gameId}/assets/file?path=${encodeURIComponent(path)}` : null,
    })
  }
  return assets.sort((a, b) => a.path.localeCompare(b.path))
}

export async function listAssets(gameId: string): Promise<StudioAssetItem[]> {
  assertGameId(gameId)
  await validateGame(gameId)
  return walkAssets(gameId, join(GAMES_DIR, gameId, 'assets'))
}

export function resolveAssetFile(gameId: string, path: string): string {
  assertGameId(gameId)
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '')
  const resolved = join(GAMES_DIR, gameId, 'assets', normalized)
  const assetsDir = join(GAMES_DIR, gameId, 'assets')
  if (!resolved.startsWith(assetsDir)) throw new Error('Asset path escapes the project assets directory.')
  return resolved
}

function artStyleDir(gameId: string): string {
  return join(GAMES_DIR, gameId, 'assets', 'art-style')
}

function artStyleAssetPath(filename: string): string {
  return `art-style/${filename}`
}

function assertArtStyleSlot(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= ART_STYLE_SLOT_COUNT) {
    throw new Error(`Art style slot must be between 0 and ${ART_STYLE_SLOT_COUNT - 1}.`)
  }
}

function artStyleSlotFilename(index: number, extension: string): string {
  return `style_reference_${String(index + 1).padStart(2, '0')}.${extension.replace(/^\./, '') || 'png'}`
}

function artStyleSlotFile(gameId: string, index: number): { filename: string; path: string; fullPath: string } | null {
  const dir = artStyleDir(gameId)
  if (!existsSync(dir)) return null
  const prefix = `style_reference_${String(index + 1).padStart(2, '0')}.`
  const filename = readdirSync(dir).find(entry => entry.startsWith(prefix)) ?? null
  if (!filename) return null
  return {
    filename,
    path: artStyleAssetPath(filename),
    fullPath: join(dir, filename),
  }
}

function artStyleSlot(gameId: string, index: number): StudioArtStyleSlot {
  const file = artStyleSlotFile(gameId, index)
  return {
    index,
    path: file?.path ?? null,
    url: file ? `/api/projects/${gameId}/assets/file?path=${encodeURIComponent(file.path)}` : null,
    size: file && existsSync(file.fullPath) ? statSync(file.fullPath).size : null,
  }
}

function artStyleSlots(gameId: string): StudioArtStyleSlot[] {
  return Array.from({ length: ART_STYLE_SLOT_COUNT }, (_, index) => artStyleSlot(gameId, index))
}

function deleteArtStyleSlotFile(gameId: string, index: number): void {
  const file = artStyleSlotFile(gameId, index)
  if (file && existsSync(file.fullPath)) unlinkSync(file.fullPath)
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
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
  if (!url) throw new Error('OpenAI image response did not include image data.')
  const response = await fetch(url)
  if (!response.ok) throw new Error(`OpenAI returned an image URL, but downloading it failed with ${response.status}.`)
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    revisedPrompt: typeof first?.['revised_prompt'] === 'string' ? first['revised_prompt'] : '',
  }
}

function imageMimeFromPath(path: string): string {
  const ext = extname(path).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  return 'image/png'
}

export async function listArtStyle(gameId: string): Promise<StudioArtStyleResponse> {
  assertGameId(gameId)
  await validateGame(gameId)
  return { slots: artStyleSlots(gameId) }
}

export async function uploadArtStyleImage(gameId: string, index: number, file: File): Promise<StudioArtStyleMutationResponse> {
  assertGameId(gameId)
  await validateGame(gameId)
  assertArtStyleSlot(index)
  if (!file || file.size === 0) throw new Error('Missing art style image.')
  const ext = extname(file.name || '').replace(/^\./, '').toLowerCase() || 'png'
  const dir = artStyleDir(gameId)
  mkdirSync(dir, { recursive: true })
  deleteArtStyleSlotFile(gameId, index)
  const filename = artStyleSlotFilename(index, ext)
  writeFileSync(join(dir, filename), new Uint8Array(await file.arrayBuffer()))
  return { slot: artStyleSlot(gameId, index), slots: artStyleSlots(gameId) }
}

export async function generateArtStyleImage(gameId: string, index: number, prompt: string): Promise<StudioArtStyleMutationResponse> {
  assertGameId(gameId)
  await validateGame(gameId)
  assertArtStyleSlot(index)
  const trimmedPrompt = prompt.trim()
  if (!trimmedPrompt) throw new Error('Missing art style generation prompt.')
  const settings = await readOpenAiImagesSettingsForGeneration(gameId)
  if (!settings.apiKey) throw new Error('OpenAI Images API key is not configured in Studio settings.')
  const body: Record<string, unknown> = {
    model: settings.model,
    prompt: `Visual novel art style reference image. ${trimmedPrompt}`,
    n: 1,
    size: settings.characterSheetResolution,
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
  if (!response.ok) throw new Error(openAiErrorMessage(payload, `OpenAI art style generation failed with ${response.status}.`))
  const generated = await imageBytesFromResponse(payload)
  const dir = artStyleDir(gameId)
  mkdirSync(dir, { recursive: true })
  deleteArtStyleSlotFile(gameId, index)
  writeFileSync(join(dir, artStyleSlotFilename(index, imageExtension(settings.outputFormat))), generated.bytes)
  return { slot: artStyleSlot(gameId, index), slots: artStyleSlots(gameId), revisedPrompt: generated.revisedPrompt }
}

export async function editArtStyleImage(gameId: string, index: number, prompt: string): Promise<StudioArtStyleMutationResponse> {
  assertGameId(gameId)
  await validateGame(gameId)
  assertArtStyleSlot(index)
  const trimmedPrompt = prompt.trim()
  if (!trimmedPrompt) throw new Error('Missing art style edit prompt.')
  const current = artStyleSlotFile(gameId, index)
  if (!current) throw new Error('No art style image is loaded in this slot.')
  const settings = await readOpenAiImagesSettingsForGeneration(gameId)
  if (!settings.apiKey) throw new Error('OpenAI Images API key is not configured in Studio settings.')
  const source = Bun.file(current.fullPath)
  const form = new FormData()
  form.set('model', settings.model)
  form.set('prompt', trimmedPrompt)
  form.set('n', '1')
  form.set('size', settings.characterSheetResolution)
  form.set('quality', settings.quality)
  form.set('output_format', settings.outputFormat)
  form.set('moderation', settings.moderation)
  form.set('image', new File([await source.arrayBuffer()], current.filename, { type: imageMimeFromPath(current.fullPath) }))
  const response = await fetch(apiUrl(settings.baseUrl, editsPathFromGenerationPath(settings.imageGenerationPath)), {
    method: 'POST',
    headers: { Authorization: `Bearer ${settings.apiKey}` },
    body: form,
  })
  const payload = await response.json().catch(() => null) as unknown
  if (!response.ok) throw new Error(openAiErrorMessage(payload, `OpenAI art style edit failed with ${response.status}.`))
  const generated = await imageBytesFromResponse(payload)
  deleteArtStyleSlotFile(gameId, index)
  writeFileSync(join(artStyleDir(gameId), artStyleSlotFilename(index, imageExtension(settings.outputFormat))), generated.bytes)
  return { slot: artStyleSlot(gameId, index), slots: artStyleSlots(gameId), revisedPrompt: generated.revisedPrompt }
}

export async function deleteArtStyleImage(gameId: string, index: number): Promise<StudioArtStyleMutationResponse> {
  assertGameId(gameId)
  await validateGame(gameId)
  assertArtStyleSlot(index)
  deleteArtStyleSlotFile(gameId, index)
  return { slot: artStyleSlot(gameId, index), slots: artStyleSlots(gameId) }
}
