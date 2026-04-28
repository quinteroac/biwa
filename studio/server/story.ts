import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { dirname, join, normalize, relative } from 'path'
import { CORE_TAGS } from '../../framework/plugins/TagRegistry.ts'
import { validateGame } from '../../manager/commands/doctor.ts'
import type { StudioStoryFile, StudioStoryPreviewLine, StudioStoryResponse } from '../shared/types.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const GAMES_DIR = join(ROOT, 'games')

function assertGameId(gameId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(gameId)) throw new Error(`Invalid game id: ${gameId}`)
}

function storyDir(gameId: string): string {
  assertGameId(gameId)
  return join(GAMES_DIR, gameId, 'story')
}

function normalizeStoryPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

function resolveStoryFile(gameId: string, path: string): string {
  const baseDir = storyDir(gameId)
  const normalizedPath = normalizeStoryPath(path)
  if (!normalizedPath.endsWith('.ink')) throw new Error('Story path must point to an .ink file.')
  const resolved = normalize(join(baseDir, normalizedPath))
  if (!resolved.startsWith(baseDir)) throw new Error('Story path escapes the project story directory.')
  return resolved
}

function walkInkFiles(dir: string, baseDir = dir): StudioStoryFile[] {
  if (!existsSync(dir)) return []
  const files: StudioStoryFile[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkInkFiles(fullPath, baseDir))
      continue
    }
    if (!entry.name.endsWith('.ink')) continue
    const path = relative(baseDir, fullPath).replace(/\\/g, '/')
    const locale = path.split('/')[0] ?? ''
    files.push({ path, locale })
  }
  return files.sort((a, b) => a.path.localeCompare(b.path))
}

function previewText(text: string): StudioStoryPreviewLine[] {
  const preview: StudioStoryPreviewLine[] = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? ''
    const trimmed = raw.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue
    if (trimmed.startsWith('INCLUDE ') || trimmed.startsWith('VAR ') || trimmed.startsWith('CONST ')) continue
    if (trimmed.startsWith('->') || trimmed === 'DONE' || trimmed === 'END') continue
    if (/^={2,3}\s+/.test(trimmed)) {
      preview.push({ line: i + 1, kind: 'knot', text: trimmed.replace(/^={2,3}\s+/, '').replace(/\s+=+$/, '').trim() })
      continue
    }
    if (/^\+/.test(trimmed)) {
      preview.push({ line: i + 1, kind: 'choice', text: trimmed.replace(/^\++\s*/, '').replace(/\s*->.*$/, '').trim() })
      continue
    }
    preview.push({ line: i + 1, kind: 'dialogue', text: trimmed.replace(/\s+#.*$/, '').trim() })
  }
  return preview.slice(0, 80)
}

export async function listStoryFiles(gameId: string): Promise<StudioStoryFile[]> {
  await validateGame(gameId)
  return walkInkFiles(storyDir(gameId))
}

export async function readStoryFile(gameId: string, path: string): Promise<StudioStoryResponse> {
  await validateGame(gameId)
  const filePath = resolveStoryFile(gameId, path)
  if (!existsSync(filePath)) throw new Error(`Story file not found: ${path}`)
  const content = readFileSync(filePath, 'utf8')
  return {
    file: {
      path: normalizeStoryPath(path),
      locale: normalizeStoryPath(path).split('/')[0] ?? '',
    },
    content,
    preview: previewText(content),
    tagSuggestions: Array.from(CORE_TAGS).sort(),
  }
}

export async function writeStoryFile(gameId: string, path: string, content: string): Promise<StudioStoryResponse> {
  await validateGame(gameId)
  const filePath = resolveStoryFile(gameId, path)
  if (!existsSync(dirname(filePath))) throw new Error(`Story directory not found for: ${path}`)
  writeFileSync(filePath, content)
  return readStoryFile(gameId, path)
}
