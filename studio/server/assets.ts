import { existsSync, readdirSync, statSync } from 'fs'
import { extname, join, relative } from 'path'
import { validateGame } from '../../manager/commands/doctor.ts'
import type { StudioAssetItem, StudioAssetKind } from '../shared/types.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const GAMES_DIR = join(ROOT, 'games')

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
