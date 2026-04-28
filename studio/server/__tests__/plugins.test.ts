import { afterEach, describe, expect, it } from 'bun:test'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { installOfficialPlugin, listStudioPlugins, removeOfficialPlugin } from '../plugins.ts'

const ROOT = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '')
const createdGames: string[] = []

function makePluginFixture(gameId: string): void {
  createdGames.push(gameId)
  const gameDir = join(ROOT, 'games', gameId)
  mkdirSync(join(gameDir, 'story', 'en'), { recursive: true })
  writeFileSync(join(gameDir, 'story', 'en', 'main.ink'), '-> DONE\n')
  writeFileSync(join(gameDir, 'game.config.ts'), `
import type { GameConfig } from '../../framework/types.ts'

const config: GameConfig = {
  id: '${gameId}',
  title: 'Studio Plugin Fixture',
  version: '0.1.0',
  story: { defaultLocale: 'en', locales: { en: './story/en/main.ink' } },
  plugins: [],
}

export default config
`)
}

afterEach(() => {
  for (const gameId of createdGames.splice(0)) {
    rmSync(join(ROOT, 'games', gameId), { recursive: true, force: true })
  }
})

describe('studio plugin API helpers', () => {
  it('lists official plugins with installed state and capabilities', async () => {
    const response = await listStudioPlugins('smoke-fixture')
    const screenEffects = response.plugins.find(plugin => plugin.importName === 'screenEffects')

    expect(screenEffects?.installed).toBe(true)
    expect(screenEffects?.tags).toContain('effect')
    expect(screenEffects?.compatible).toBe(true)
  })

  it('installs official plugins into game.config.ts and keeps doctor valid', async () => {
    const gameId = `studio-plugin-${Date.now()}`
    makePluginFixture(gameId)

    const response = await installOfficialPlugin(gameId, 'atmosphereEffects')
    const config = readFileSync(join(ROOT, 'games', gameId, 'game.config.ts'), 'utf8')

    expect(config).toContain("import { officialPlugins } from '../../framework/plugins.ts'")
    expect(config).toContain('officialPlugins.atmosphereEffects()')
    expect(response.plugins.find(plugin => plugin.importName === 'atmosphereEffects')?.installed).toBe(true)
    expect(response.diagnostics.summary.error).toBe(0)
  })

  it('removes official plugin calls from game.config.ts', async () => {
    const gameId = `studio-plugin-remove-${Date.now()}`
    makePluginFixture(gameId)
    await installOfficialPlugin(gameId, 'screenEffects')

    const response = await removeOfficialPlugin(gameId, 'screenEffects')
    const config = readFileSync(join(ROOT, 'games', gameId, 'game.config.ts'), 'utf8')

    expect(config).not.toContain('officialPlugins.screenEffects()')
    expect(response.plugins.find(plugin => plugin.importName === 'screenEffects')?.installed).toBe(false)
    expect(response.diagnostics.summary.error).toBe(0)
  })
})
