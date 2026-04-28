import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { dirname, extname, join, normalize } from 'path'
import { build } from '../../manager/commands/build.ts'
import type {
  StudioBuildMode,
  StudioBuildRecord,
  StudioBuildsResponse,
  StudioBuildStatus,
  StudioManifestResponse,
} from '../shared/types.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const DIST_DIR = join(ROOT, 'dist')
const STUDIO_STATE_DIR = join(ROOT, '.studio')
const HISTORY_PATH = join(STUDIO_STATE_DIR, 'build-history.json')
const BUILD_MODES = new Set<StudioBuildMode>(['standalone', 'static', 'portal', 'embedded'])

interface BuildHistoryFile {
  builds: StudioBuildRecord[]
}

function assertGameId(gameId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(gameId)) throw new Error(`Invalid game id: ${gameId}`)
}

function previewUrl(gameId: string): string | null {
  const distDir = join(DIST_DIR, gameId)
  if (!existsSync(join(distDir, 'index.html'))) return null
  return `/api/projects/${gameId}/preview/`
}

function manifestUrl(gameId: string): string | null {
  return existsSync(join(DIST_DIR, gameId, 'manifest.json')) ? `/api/projects/${gameId}/builds/manifest` : null
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

function objectOrNull(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function readManifest(gameId: string): Record<string, unknown> | null {
  assertGameId(gameId)
  const path = join(DIST_DIR, gameId, 'manifest.json')
  if (!existsSync(path)) return null
  return objectOrNull(readJsonFile(path))
}

function normalizeMode(mode: unknown): StudioBuildMode {
  if (typeof mode !== 'string' || mode.length === 0) return 'standalone'
  if (!BUILD_MODES.has(mode as StudioBuildMode)) {
    throw new Error(`Unsupported build mode "${mode}".`)
  }
  return mode as StudioBuildMode
}

function readHistoryFile(): BuildHistoryFile {
  if (!existsSync(HISTORY_PATH)) return { builds: [] }
  const parsed = objectOrNull(readJsonFile(HISTORY_PATH))
  const builds = Array.isArray(parsed?.['builds'])
    ? parsed['builds'].filter((record): record is StudioBuildRecord => objectOrNull(record) !== null)
    : []
  return { builds }
}

function writeHistory(builds: StudioBuildRecord[]): void {
  mkdirSync(dirname(HISTORY_PATH), { recursive: true })
  writeFileSync(HISTORY_PATH, JSON.stringify({ builds }, null, 2))
}

function projectHistory(gameId: string): StudioBuildRecord[] {
  assertGameId(gameId)
  return readHistoryFile().builds
    .filter(build => build.gameId === gameId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function appendBuild(record: StudioBuildRecord): StudioBuildRecord[] {
  const existing = readHistoryFile().builds.filter(build => build.gameId !== record.gameId)
  const currentProject = projectHistory(record.gameId).filter(build => build.id !== record.id)
  const nextProjectBuilds = [record, ...currentProject].slice(0, 12)
  const builds = [...existing, ...nextProjectBuilds].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  writeHistory(builds)
  return nextProjectBuilds
}

function makeBuildRecord(
  gameId: string,
  mode: StudioBuildMode,
  status: StudioBuildStatus,
  startedAt: number,
  error: string | null,
): StudioBuildRecord {
  const manifest = status === 'success' ? readManifest(gameId) : null
  return {
    id: `${gameId}-${startedAt}`,
    gameId,
    mode,
    status,
    createdAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    distPath: `dist/${gameId}`,
    previewUrl: status === 'success' ? previewUrl(gameId) : null,
    manifestUrl: status === 'success' ? manifestUrl(gameId) : null,
    manifest,
    error,
  }
}

export function getBuilds(gameId: string): StudioBuildsResponse {
  assertGameId(gameId)
  const builds = projectHistory(gameId)
  const manifest = readManifest(gameId)
  return {
    builds,
    latest: builds[0] ?? null,
    manifest,
    previewUrl: previewUrl(gameId),
    manifestUrl: manifestUrl(gameId),
  }
}

export function getBuildManifest(gameId: string): StudioManifestResponse {
  assertGameId(gameId)
  return {
    manifest: readManifest(gameId),
    manifestUrl: manifestUrl(gameId),
  }
}

export async function runStudioBuild(gameId: string, mode: unknown): Promise<{ build: StudioBuildRecord; builds: StudioBuildRecord[] }> {
  assertGameId(gameId)
  const buildMode = normalizeMode(mode)
  const startedAt = Date.now()
  let record: StudioBuildRecord
  try {
    await build(gameId, '--mode', buildMode)
    record = makeBuildRecord(gameId, buildMode, 'success', startedAt, null)
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    record = makeBuildRecord(gameId, buildMode, 'error', startedAt, err.message)
  }
  const builds = appendBuild(record)
  if (record.status === 'error') throw new Error(record.error ?? 'Build failed.')
  return { build: record, builds }
}

export function resolvePreviewFile(gameId: string, requestUrl: string): string {
  assertGameId(gameId)
  const url = new URL(requestUrl)
  const marker = `/api/projects/${gameId}/preview/`
  const index = url.pathname.indexOf(marker)
  const requested = index >= 0 ? url.pathname.slice(index + marker.length) : ''
  const pathname = decodeURIComponent(requested || 'index.html')
  const distDir = join(DIST_DIR, gameId)
  const resolved = normalize(join(distDir, pathname))
  if (!resolved.startsWith(distDir)) throw new Error('Preview path escapes the project dist directory.')
  return resolved
}

export function previewMime(path: string): string {
  const ext = extname(path).toLowerCase()
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.webm': 'video/webm',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  } as Record<string, string>)[ext] ?? 'application/octet-stream'
}

export function previewFileExists(path: string): boolean {
  return existsSync(path) && statSync(path).isFile()
}
