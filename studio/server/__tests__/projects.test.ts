import { describe, expect, it } from 'bun:test'
import { getProjectDiagnostics, getProjectSummary, listProjectIds, listProjects } from '../projects.ts'

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
})
