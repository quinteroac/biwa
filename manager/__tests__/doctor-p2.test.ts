import { describe, expect, it } from 'bun:test'
import {
  createDoctorJsonReport,
  summarizeIssueCategories,
  suggestNextSteps,
  type Issue,
} from '../commands/doctor.ts'

describe('doctor author ergonomics', () => {
  const issues: Issue[] = [
    {
      severity: 'warning',
      path: 'data/scenes/cafe.md',
      code: 'asset_missing',
      message: 'Scene background image not found: scenes/cafe/bg.png',
      suggestion: 'Add the file under assets/.',
    },
    {
      severity: 'error',
      path: 'story/en/main.ink:4',
      code: 'tag_unknown',
      message: 'Unknown Ink tag "effect".',
      suggestion: 'Enable the plugin that owns the tag.',
    },
  ]

  it('summarizes diagnostics by author-facing category', () => {
    expect(summarizeIssueCategories(issues)).toEqual({
      assets: { error: 0, warning: 1, info: 0 },
      plugins: { error: 1, warning: 0, info: 0 },
    })
  })

  it('suggests next commands or actions from issue codes', () => {
    const steps = suggestNextSteps(issues)
    expect(steps.some(step => step.includes('assets/'))).toBe(true)
    expect(steps.some(step => step.includes('plugins[].tags'))).toBe(true)
  })

  it('includes category summaries and next steps in JSON reports', () => {
    const report = createDoctorJsonReport('demo', '/repo/games/demo', issues)

    expect(report.summary.error).toBe(1)
    expect(report.categories.assets?.warning).toBe(1)
    expect(report.nextSteps.length).toBeGreaterThan(0)
    expect(report.issues[0]?.code).toBe('asset_missing')
  })
})
