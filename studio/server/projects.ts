import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { basename, extname, join } from 'path'
import { createDoctorJsonReport, validateGame } from '../../manager/commands/doctor.ts'
import type { DoctorJsonReport } from '../../manager/commands/doctor.ts'
import type {
  StudioProjectCounts,
  StudioProjectCoverUploadResponse,
  StudioProjectIdentityDraft,
  StudioProjectStatus,
  StudioProjectSummary,
} from '../shared/types.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const GAMES_DIR = join(ROOT, 'games')

function assertGameId(gameId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(gameId)) {
    throw new Error(`Invalid game id: ${gameId}`)
  }
}

function countFiles(dir: string, predicate: (name: string) => boolean = () => true): number {
  if (!existsSync(dir)) return 0
  let count = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      count += countFiles(fullPath, predicate)
    } else if (predicate(entry.name)) {
      count++
    }
  }
  return count
}

function statusFromDiagnostics(report: DoctorJsonReport): StudioProjectStatus {
  if (report.summary.error > 0) return 'error'
  if (report.summary.warning > 0) return 'warning'
  return 'ok'
}

function countProjectFiles(gameId: string, plugins: number): StudioProjectCounts {
  const gameDir = join(GAMES_DIR, gameId)
  return {
    storyFiles: countFiles(join(gameDir, 'story'), name => name.endsWith('.ink')),
    characterFiles: countFiles(join(gameDir, 'data', 'characters'), name => name.endsWith('.md')),
    sceneFiles: countFiles(join(gameDir, 'data', 'scenes'), name => name.endsWith('.md')),
    assetFiles: countFiles(join(gameDir, 'assets')),
    plugins,
  }
}

function coverAssetPath(gameId: string, cover: unknown): { path: string; url: string | null } {
  if (typeof cover !== 'string' || cover.length === 0) return { path: '', url: null }
  const normalized = cover.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '')
  const assetPath = normalized.startsWith('assets/') ? normalized.slice('assets/'.length) : normalized
  const fullPath = join(GAMES_DIR, gameId, 'assets', assetPath)
  return {
    path: assetPath,
    url: existsSync(fullPath) ? `/api/projects/${gameId}/assets/file?path=${encodeURIComponent(assetPath)}` : null,
  }
}

function configPath(gameId: string): string {
  return join(GAMES_DIR, gameId, 'game.config.ts')
}

function tsString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}'`
}

function replaceConfigString(source: string, key: 'title' | 'description' | 'cover', value: string): string {
  const pattern = new RegExp(`(^\\s*${key}\\s*:\\s*)(['"\`])(?:\\\\.|(?!\\2)[\\s\\S])*?\\2(\\s*,?)`, 'm')
  if (pattern.test(source)) {
    return source.replace(pattern, (_match, prefix: string, _quote: string, suffix: string) => `${prefix}${tsString(value)}${suffix}`)
  }
  const versionPattern = /(^\s*version\s*:\s*(?:['"`])(?:\\.|(?!['"`])[\s\S])*?(?:['"`])\s*,?)/m
  if (key === 'description' && versionPattern.test(source)) {
    return source.replace(versionPattern, match => `${match}\n  description: ${tsString(value)},`)
  }
  if (key === 'cover' && versionPattern.test(source)) {
    return source.replace(versionPattern, match => `${match}\n  cover: ${tsString(value)},`)
  }
  throw new Error(`Could not update ${key} in game.config.ts.`)
}

function readConfigString(source: string, key: 'title' | 'description' | 'cover'): string | null {
  const pattern = new RegExp(`^\\s*${key}\\s*:\\s*(['"\`])((?:\\\\.|(?!\\1)[\\s\\S])*?)\\1\\s*,?`, 'm')
  const match = pattern.exec(source)
  if (!match) return null
  return (match[2] ?? '')
    .replace(/\\n/g, '\n')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

function readProjectIdentityFromConfig(gameId: string): Pick<StudioProjectSummary, 'title' | 'description' | 'coverPath' | 'coverUrl'> | null {
  const filePath = configPath(gameId)
  if (!existsSync(filePath)) return null
  const source = readFileSync(filePath, 'utf8')
  const title = readConfigString(source, 'title')
  if (title === null) return null
  const description = readConfigString(source, 'description') ?? ''
  const cover = coverAssetPath(gameId, readConfigString(source, 'cover') ?? '')
  return {
    title,
    description,
    coverPath: cover.path,
    coverUrl: cover.url,
  }
}

function safeCoverFilename(name: string): string {
  const originalExt = extname(name)
  const ext = originalExt.toLowerCase()
  if (!['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
    throw new Error('Cover must be a PNG, JPG, WebP or GIF image.')
  }
  const stem = basename(name, originalExt)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'cover'
  return `${stem}${ext}`
}

export function listProjectIds(): string[] {
  if (!existsSync(GAMES_DIR)) return []
  return readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b))
}

export async function getProjectDiagnostics(gameId: string): Promise<DoctorJsonReport> {
  assertGameId(gameId)
  const { gameDir, issues } = await validateGame(gameId)
  return createDoctorJsonReport(gameId, gameDir, issues)
}

export async function getProjectSummary(gameId: string): Promise<StudioProjectSummary> {
  assertGameId(gameId)
  const { config, gameDir, issues } = await validateGame(gameId)
  const diagnostics = createDoctorJsonReport(gameId, gameDir, issues)
  const pluginIds = (config.plugins ?? []).map(plugin => plugin.id)
  const identity = readProjectIdentityFromConfig(gameId)
  const cover = coverAssetPath(config.id, config.cover)
  return {
    id: config.id,
    title: identity?.title ?? config.title,
    version: config.version,
    description: identity?.description ?? config.description ?? '',
    coverPath: identity?.coverPath ?? cover.path,
    coverUrl: identity?.coverUrl ?? cover.url,
    defaultLocale: config.story.defaultLocale,
    locales: Object.keys(config.story.locales),
    pluginIds,
    status: statusFromDiagnostics(diagnostics),
    counts: countProjectFiles(gameId, pluginIds.length),
    diagnostics,
  }
}

export async function listProjects(): Promise<StudioProjectSummary[]> {
  const projects: StudioProjectSummary[] = []
  for (const gameId of listProjectIds()) {
    projects.push(await getProjectSummary(gameId))
  }
  return projects
}

export async function updateProjectIdentity(gameId: string, draft: StudioProjectIdentityDraft): Promise<StudioProjectSummary> {
  assertGameId(gameId)
  const title = draft.title.trim()
  if (!title) throw new Error('Project title is required.')
  const configFile = configPath(gameId)
  if (!existsSync(configFile)) throw new Error(`Project config not found for ${gameId}.`)
  const coverPath = draft.coverPath.trim().replace(/\\/g, '/').replace(/^assets\//, '').replace(/^\/+/, '')
  if (coverPath.includes('..')) throw new Error('Cover path cannot leave the assets directory.')
  let source = readFileSync(configFile, 'utf8')
  source = replaceConfigString(source, 'title', title)
  source = replaceConfigString(source, 'description', draft.description.trim())
  source = replaceConfigString(source, 'cover', coverPath ? `./assets/${coverPath}` : '')
  writeFileSync(configFile, source)
  return getProjectSummary(gameId)
}

export async function uploadProjectCover(gameId: string, file: File): Promise<StudioProjectCoverUploadResponse> {
  assertGameId(gameId)
  if (!file || file.size === 0) throw new Error('Missing cover image.')
  const filename = safeCoverFilename(file.name || 'cover.png')
  const gameDir = join(GAMES_DIR, gameId)
  const relativePath = `ui/${filename}`
  const targetDir = join(gameDir, 'assets', 'ui')
  mkdirSync(targetDir, { recursive: true })
  writeFileSync(join(targetDir, filename), new Uint8Array(await file.arrayBuffer()))
  const cover = coverAssetPath(gameId, relativePath)
  return { coverPath: cover.path, coverUrl: cover.url }
}
