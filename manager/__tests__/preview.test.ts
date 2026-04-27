import { afterEach, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { parsePreviewArgs, startPreviewServer } from '../commands/preview.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const created: string[] = []

function makeDist(gameId: string): void {
  const dir = join(ROOT, 'dist', gameId)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), '<h1>Preview OK</h1>')
  created.push(gameId)
}

afterEach(() => {
  for (const gameId of created.splice(0)) {
    rmSync(join(ROOT, 'dist', gameId), { recursive: true, force: true })
  }
})

describe('preview command', () => {
  it('parses game id, build flag and port', () => {
    expect(parsePreviewArgs(['smoke-fixture', '--build', '--port', '4180'])).toEqual({
      gameId: 'smoke-fixture',
      options: { build: true, port: 4180 },
    })
  })

  it('serves an existing dist directory', async () => {
    const gameId = `preview-test-${Date.now()}`
    makeDist(gameId)
    const server = startPreviewServer(gameId, { port: 0 })
    try {
      const response = await fetch(server.url)
      expect(response.status).toBe(200)
      expect(await response.text()).toContain('Preview OK')
    } finally {
      server.stop()
    }
  })

  it('suggests build when dist output is missing', () => {
    expect(() => startPreviewServer('preview-missing-game', { port: 0 }))
      .toThrow(/preview preview-missing-game --build/)
  })
})
