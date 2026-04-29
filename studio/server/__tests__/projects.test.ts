import { afterEach, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  getProjectDiagnostics,
  getProjectSummary,
  listProjectIds,
  listProjects,
  updateProjectIdentity,
  uploadProjectCover,
} from '../projects.ts'

const ROOT = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '')
const createdGames: string[] = []

function makeProjectFixture(gameId: string): void {
  createdGames.push(gameId)
  const gameDir = join(ROOT, 'games', gameId)
  mkdirSync(join(gameDir, 'story', 'en'), { recursive: true })
  mkdirSync(join(gameDir, 'data'), { recursive: true })
  mkdirSync(join(gameDir, 'assets', 'ui'), { recursive: true })
  writeFileSync(join(gameDir, 'story', 'en', 'main.ink'), '-> DONE\n')
  writeFileSync(join(gameDir, 'assets', 'ui', 'cover.svg'), '<svg xmlns="http://www.w3.org/2000/svg" />')
  writeFileSync(join(gameDir, 'game.config.ts'), `
import type { GameConfig } from '../../framework/types.ts'

const config: GameConfig = {
  id: '${gameId}',
  title: 'Studio Project Fixture',
  version: '0.1.0',
  description: 'Original description.',
  cover: './assets/ui/cover.svg',
  story: { defaultLocale: 'en', locales: { en: './story/en/main.ink' } },
  data: {},
}

export default config
`)
}

afterEach(() => {
  for (const gameId of createdGames.splice(0)) {
    rmSync(join(ROOT, 'games', gameId), { recursive: true, force: true })
  }
})

describe('studio project API helpers', () => {
  it('lists framework game projects for the Studio shell', () => {
    const ids = listProjectIds()
    expect(ids).toContain('smoke-fixture')
    expect(ids).toContain('mi-novela')
  })

  it('summarizes smoke-fixture without introducing a Studio project format', async () => {
    const project = await getProjectSummary('smoke-fixture')

    expect(project.id).toBe('smoke-fixture')
    expect(project.title.length).toBeGreaterThan(0)
    expect(project.locales).toContain('en')
    expect(project.counts.storyFiles).toBeGreaterThan(0)
    expect(project.counts.sceneFiles).toBeGreaterThan(0)
    expect(project.diagnostics.gameId).toBe('smoke-fixture')
  })

  it('returns doctor diagnostics through the same manager report contract', async () => {
    const diagnostics = await getProjectDiagnostics('smoke-fixture')

    expect(diagnostics.summary.error).toBe(0)
    expect(Array.isArray(diagnostics.nextSteps)).toBe(true)
    expect(diagnostics.gameId).toBe('smoke-fixture')
  })

  it('lists project summaries with statuses for the dashboard', async () => {
    const projects = await listProjects()

    expect(projects.some(project => project.id === 'smoke-fixture')).toBe(true)
    expect(projects.every(project => ['ok', 'warning', 'error'].includes(project.status))).toBe(true)
  })

  it('updates project identity in the framework game config', async () => {
    const gameId = `studio-project-${Date.now()}`
    makeProjectFixture(gameId)

    const saved = await updateProjectIdentity(gameId, {
      title: 'Updated Title',
      description: 'Updated description.',
      coverPath: 'ui/cover.svg',
    })

    expect(saved.title).toBe('Updated Title')
    expect(saved.description).toBe('Updated description.')
    expect(saved.coverPath).toBe('ui/cover.svg')
  })

  it('uploads a project cover into assets/ui without changing project contracts', async () => {
    const gameId = `studio-project-cover-${Date.now()}`
    makeProjectFixture(gameId)

    const uploaded = await uploadProjectCover(gameId, new File(['cover'], 'New Cover.PNG', { type: 'image/png' }))

    expect(uploaded.coverPath).toBe('ui/new-cover.png')
    expect(uploaded.coverUrl).toContain('new-cover.png')
  })
})
