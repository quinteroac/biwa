import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, normalize } from 'path'
import { validateGame } from '../../manager/commands/doctor.ts'
import type {
  StudioOpenAiImageFormat,
  StudioOpenAiImageModeration,
  StudioOpenAiImageQuality,
  StudioOpenAiImageResolution,
  StudioOpenAiImagesSettings,
  StudioSettings,
} from '../shared/types.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const GAMES_DIR = join(ROOT, 'games')

const DEFAULT_OPENAI_IMAGES_SETTINGS = Object.freeze({
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  imageGenerationPath: '/images/generations',
  model: 'gpt-image-1.5',
  quality: 'high',
  outputFormat: 'png',
  moderation: 'auto',
  characterSheetResolution: '1024x1536',
  spritesheetBackgroundRemovalEnabled: false,
  spritesheetBackgroundRemovalCommand: 'uv run --script studio/tools/remove_chroma_key.py --input {input} --out {output} --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --force',
  spritesheetBackgroundRemovalTimeoutSeconds: 120,
  imageGenerationTimeoutSeconds: 300,
} satisfies StudioOpenAiImagesSettings)

function assertGameId(gameId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(gameId)) throw new Error(`Invalid game id: ${gameId}`)
}

function settingsPath(gameId: string): string {
  assertGameId(gameId)
  const baseDir = join(GAMES_DIR, gameId)
  const resolved = normalize(join(baseDir, '.studio', 'settings.json'))
  if (!resolved.startsWith(baseDir)) throw new Error('Studio settings path escapes the project directory.')
  return resolved
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function boundedNumberValue(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function enumValue<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === 'string' && options.includes(value as T) ? value as T : fallback
}

function sanitizeOpenAiImagesSettings(value: unknown): StudioOpenAiImagesSettings {
  const record = recordValue(value) ?? {}
  return {
    apiKey: stringValue(record['apiKey'], DEFAULT_OPENAI_IMAGES_SETTINGS.apiKey).trim(),
    baseUrl: stringValue(record['baseUrl'], DEFAULT_OPENAI_IMAGES_SETTINGS.baseUrl).trim() || DEFAULT_OPENAI_IMAGES_SETTINGS.baseUrl,
    imageGenerationPath: stringValue(record['imageGenerationPath'], DEFAULT_OPENAI_IMAGES_SETTINGS.imageGenerationPath).trim() || DEFAULT_OPENAI_IMAGES_SETTINGS.imageGenerationPath,
    model: stringValue(record['model'], DEFAULT_OPENAI_IMAGES_SETTINGS.model).trim() || DEFAULT_OPENAI_IMAGES_SETTINGS.model,
    quality: enumValue(record['quality'], ['low', 'medium', 'high', 'auto'] as const, DEFAULT_OPENAI_IMAGES_SETTINGS.quality),
    outputFormat: enumValue(record['outputFormat'], ['png', 'webp', 'jpeg'] as const, DEFAULT_OPENAI_IMAGES_SETTINGS.outputFormat),
    moderation: enumValue(record['moderation'], ['auto', 'low'] as const, DEFAULT_OPENAI_IMAGES_SETTINGS.moderation),
    characterSheetResolution: enumValue(record['characterSheetResolution'], ['1024x1024', '1024x1536', '1536x1024', 'auto'] as const, DEFAULT_OPENAI_IMAGES_SETTINGS.characterSheetResolution),
    spritesheetBackgroundRemovalEnabled: booleanValue(record['spritesheetBackgroundRemovalEnabled'], booleanValue(record['spritesheetBiRefNetEnabled'], DEFAULT_OPENAI_IMAGES_SETTINGS.spritesheetBackgroundRemovalEnabled)),
    spritesheetBackgroundRemovalCommand: stringValue(record['spritesheetBackgroundRemovalCommand'], DEFAULT_OPENAI_IMAGES_SETTINGS.spritesheetBackgroundRemovalCommand).trim() || DEFAULT_OPENAI_IMAGES_SETTINGS.spritesheetBackgroundRemovalCommand,
    spritesheetBackgroundRemovalTimeoutSeconds: boundedNumberValue(record['spritesheetBackgroundRemovalTimeoutSeconds'], boundedNumberValue(record['spritesheetBiRefNetTimeoutSeconds'], DEFAULT_OPENAI_IMAGES_SETTINGS.spritesheetBackgroundRemovalTimeoutSeconds, 30, 1800), 30, 1800),
    imageGenerationTimeoutSeconds: boundedNumberValue(record['imageGenerationTimeoutSeconds'], DEFAULT_OPENAI_IMAGES_SETTINGS.imageGenerationTimeoutSeconds, 30, 600),
  }
}

function readStoredSettings(gameId: string): StudioOpenAiImagesSettings {
  const filePath = settingsPath(gameId)
  if (!existsSync(filePath)) return { ...DEFAULT_OPENAI_IMAGES_SETTINGS }
  const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown
  const root = recordValue(parsed) ?? {}
  return sanitizeOpenAiImagesSettings(root['openaiImages'])
}

export async function readStudioSettings(gameId: string): Promise<StudioSettings> {
  await validateGame(gameId)
  const openaiImages = readStoredSettings(gameId)
  return {
    openaiImages: {
      ...openaiImages,
      apiKey: '',
      apiKeyConfigured: openaiImages.apiKey.length > 0,
    },
  }
}

export async function writeStudioSettings(gameId: string, settings: Partial<StudioSettings>): Promise<StudioSettings> {
  await validateGame(gameId)
  const current = readStoredSettings(gameId)
  const incoming = sanitizeOpenAiImagesSettings({
    ...current,
    ...recordValue(settings.openaiImages),
  })
  const nextOpenAiImages = {
    ...incoming,
    apiKey: incoming.apiKey || current.apiKey,
  }
  const filePath = settingsPath(gameId)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify({ openaiImages: nextOpenAiImages }, null, 2)}\n`)
  return readStudioSettings(gameId)
}

export async function readOpenAiImagesSettingsForGeneration(gameId: string): Promise<StudioOpenAiImagesSettings> {
  await validateGame(gameId)
  return readStoredSettings(gameId)
}

export function imageExtension(format: StudioOpenAiImageFormat): string {
  return format === 'jpeg' ? 'jpg' : format
}

export type {
  StudioOpenAiImageFormat,
  StudioOpenAiImageModeration,
  StudioOpenAiImageQuality,
  StudioOpenAiImageResolution,
}
