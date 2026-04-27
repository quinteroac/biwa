import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { assets, createAnimationAtlas, createCharacterAtlas } from '../commands/assets.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const createdGames: string[] = []

function makeGame(id: string): void {
  const dir = join(ROOT, 'games', id)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  createdGames.push(id)
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'))
}

afterEach(() => {
  for (const id of createdGames.splice(0)) {
    rmSync(join(ROOT, 'games', id), { recursive: true, force: true })
  }
})

describe('assets command helpers', () => {
  it('creates character atlas JSON under the target game', () => {
    const gameId = 'asset-cli-test-character'
    makeGame(gameId)

    const result = createCharacterAtlas(gameId, 'kai', {
      width: '1024',
      height: '512',
      layout: 'Horizontal',
      names: 'neutral,happy',
      image: 'kai_spritesheet.png',
    })

    const atlasPath = join(ROOT, 'games', gameId, result.atlasPath)
    expect(existsSync(atlasPath)).toBe(true)

    const atlas = readJson(atlasPath)
    expect(atlas.meta.version).toBe('aseprite-atlas-v1')
    expect(atlas.meta.image).toBe('kai_spritesheet.png')
    expect(Object.keys(atlas.frames)).toEqual(['neutral.png', 'happy.png'])
  })

  it('treats --out . as a directory output without writing prompt metadata', () => {
    const gameId = 'asset-cli-test-dot-out'
    makeGame(gameId)

    const result = createCharacterAtlas(gameId, 'kai', {
      count: '1',
      names: 'neutral',
      out: '.',
    })

    expect(result.atlasPath).toBe('kai_atlas.json')
    expect(existsSync(join(ROOT, 'games', gameId, 'kai_atlas.json'))).toBe(true)
    expect(existsSync(join(ROOT, 'games', gameId, 'kai_prompt.json'))).toBe(false)
  })

  it('reports a missing character id before consuming flag values as positionals', async () => {
    await expect(assets('character-atlas', 'mi-novela', '--count', '4', '--out', '.'))
      .rejects.toThrow(/Missing characterId/)
  })

  it('creates animation atlas JSON with frameTags', () => {
    const gameId = 'asset-cli-test-animation'
    makeGame(gameId)

    const result = createAnimationAtlas(gameId, 'idle', {
      width: '1024',
      height: '512',
      frames: '4',
      layout: 'Horizontal',
      tags: '[{"name":"idle","from":0,"to":3,"direction":"pingpong","color":"#ff00ffff"}]',
    })

    const atlas = readJson(join(ROOT, 'games', gameId, result.atlasPath))
    expect(atlas.meta.atlasType).toBe('Animation')
    expect(atlas.meta.frameTags).toEqual([{ name: 'idle', from: 0, to: 3, direction: 'pingpong', color: '#ff00ffff' }])
    expect(Object.keys(atlas.frames)).toEqual(['idle_01.png', 'idle_02.png', 'idle_03.png', 'idle_04.png'])
  })
})
