import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { createDoctorJsonReport, validateGame } from '../../manager/commands/doctor.ts'
import type { DoctorJsonReport } from '../../manager/commands/doctor.ts'
import type { StudioProjectCounts, StudioProjectStatus, StudioProjectSummary } from '../shared/types.ts'

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
  return {
    id: config.id,
    title: config.title,
    version: config.version,
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
