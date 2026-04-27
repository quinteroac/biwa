import { afterEach, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createDevWatcher } from '../commands/dev.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const createdGames: string[] = []

function makeWatchGame(gameId: string): void {
  const gameDir = join(ROOT, 'games', gameId)
  rmSync(gameDir, { recursive: true, force: true })
  mkdirSync(join(gameDir, 'story/en'), { recursive: true })
  mkdirSync(join(gameDir, 'data/scenes'), { recursive: true })
  mkdirSync(join(gameDir, 'assets/scenes/default'), { recursive: true })
  writeFileSync(join(gameDir, 'game.config.ts'), `import type { GameConfig } from '../../framework/types/game-config.d.ts'

const config: GameConfig = {
  id: '${gameId}',
  title: 'Watch Fixture',
  version: '1.0.0',
  story: { defaultLocale: 'en', locales: { en: './story/en/main.ink' } },
  data: { scenes: './data/scenes/' },
}

export default config
`)
  writeFileSync(join(gameDir, 'story/en/main.ink'), '# scene: default\nLine.\n')
  writeFileSync(join(gameDir, 'data/scenes/default.md'), `---
id: default
background:
  type: static
  image: scenes/default/background.svg
---
`)
  writeFileSync(join(gameDir, 'assets/scenes/default/background.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
  createdGames.push(gameId)
}

function waitUntil(predicate: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer)
        resolve()
        return
      }
      if (Date.now() - started > 2000) {
        clearInterval(timer)
        reject(new Error('Timed out waiting for watcher log'))
      }
    }, 20)
  })
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

afterEach(() => {
  for (const gameId of createdGames.splice(0)) {
    rmSync(join(ROOT, 'games', gameId), { recursive: true, force: true })
  }
})

describe('dev watcher', () => {
  it('logs changed files and validation recovery', async () => {
    const gameId = `dev-watch-${Date.now()}`
    makeWatchGame(gameId)
    const logs: string[] = []
    const watcher = createDevWatcher(gameId, { intervalMs: 20, log: message => logs.push(message) })
    try {
      await delay(30)
      writeFileSync(join(ROOT, 'games', gameId, 'story/en/main.ink'), '# scene: missing\nBroken.\n')
      await waitUntil(() => logs.some(line => line.includes('validation failed')))

      writeFileSync(join(ROOT, 'games', gameId, 'story/en/main.ink'), '# scene: default\nRecovered.\n')
      await waitUntil(() => logs.some(line => line.includes('recovered') || line.includes('validation ok')))

      expect(logs.some(line => line.includes(`games/${gameId}/story/en/main.ink`))).toBe(true)
    } finally {
      watcher.stop()
    }
  })
})
