import { describe, expect, it } from 'bun:test'
import { analyzeAuthoring } from '../authoring.ts'

describe('studio authoring analysis helpers', () => {
  it('builds a static story graph and coverage from framework Ink files', async () => {
    const analysis = await analyzeAuthoring('smoke-fixture')

    expect(analysis.graph.nodes.some(node => node.title === 'start')).toBe(true)
    expect(analysis.coverage.totalKnots).toBeGreaterThan(0)
    expect(analysis.coverage.reachableKnots).toBeGreaterThan(0)
    expect(Array.isArray(analysis.branches)).toBe(true)
  })

  it('searches story text and reports localization summaries', async () => {
    const analysis = await analyzeAuthoring('smoke-fixture', 'fixture')

    expect(analysis.search.some(result => result.path.endsWith('main.ink'))).toBe(true)
    expect(analysis.localization.some(locale => locale.locale === 'en')).toBe(true)
    expect(analysis.debug.diagnostics.error).toBe(0)
  })
})
