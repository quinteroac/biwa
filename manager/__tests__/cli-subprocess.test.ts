import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const decoder = new TextDecoder()
const createdGames: string[] = []

interface CliResult {
  exitCode: number
  stdout: string
  stderr: string
}

function runCli(...args: string[]): CliResult {
  const proc = Bun.spawnSync({
    cmd: ['bun', 'manager/cli.ts', ...args],
    cwd: ROOT,
    env: { ...process.env, FORCE_COLOR: '0' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return {
    exitCode: proc.exitCode,
    stdout: decoder.decode(proc.stdout),
    stderr: decoder.decode(proc.stderr),
  }
}

function makeGameId(suffix: string): string {
  return `cli-p0-${suffix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function trackGame(gameId: string): string {
  createdGames.push(gameId)
  return gameId
}

function gamePath(gameId: string, ...parts: string[]): string {
  return join(ROOT, 'games', gameId, ...parts)
}

function parseDoctorReport(stdout: string): any {
  return JSON.parse(stdout)
}

afterEach(() => {
  for (const gameId of createdGames.splice(0)) {
    rmSync(join(ROOT, 'games', gameId), { recursive: true, force: true })
    rmSync(join(ROOT, 'dist', gameId), { recursive: true, force: true })
  }
})

describe('manager CLI subprocess suite', () => {
  it('scaffolds a game that passes doctor, build and list', () => {
    const gameId = trackGame(makeGameId('happy'))

    const created = runCli('new', gameId, 'CLI P0 Happy Path')
    expect(created.exitCode).toBe(0)
    expect(created.stdout).toContain(`Game "CLI P0 Happy Path" created`)

    const doctor = runCli('doctor', gameId, '--json')
    expect(doctor.exitCode).toBe(0)
    const report = parseDoctorReport(doctor.stdout)
    expect(report.gameId).toBe(gameId)
    expect(report.summary.error).toBe(0)

    const build = runCli('build', gameId)
    expect(build.exitCode).toBe(0)
    expect(build.stdout).toContain('Build complete')
    expect(existsSync(join(ROOT, 'dist', gameId, 'index.html'))).toBe(true)

    const listed = runCli('list')
    expect(listed.exitCode).toBe(0)
    expect(listed.stdout).toContain(gameId)
  })

  it('reports common command failures with stable exit codes and messages', () => {
    const invalid = runCli('new', 'Bad_ID')
    expect(invalid.exitCode).toBe(1)
    expect(invalid.stderr).toContain('Invalid gameId')

    const missing = runCli('doctor', 'cli-p0-missing-game', '--json')
    expect(missing.exitCode).toBe(1)
    expect(missing.stderr).toContain('does not exist')
  })

  it('reports story locale, missing asset and minigame diagnostics through doctor --json', () => {
    const gameId = trackGame(makeGameId('diagnostics'))
    expect(runCli('new', gameId, 'CLI P0 Diagnostics').exitCode).toBe(0)

    rmSync(gamePath(gameId, 'story/en/main.ink'), { force: true })
    const configPath = gamePath(gameId, 'game.config.ts')
    const config = readFileSync(configPath, 'utf8')
    writeFileSync(configPath, config.replace(
      "audio:      './data/audio/',",
      "audio:      './data/audio/',\n    minigames:  './data/minigames/',",
    ))

    mkdirSync(gamePath(gameId, 'data/audio/bgm'), { recursive: true })
    writeFileSync(gamePath(gameId, 'data/audio/bgm/missing_theme.md'), `---
id: missing_theme
category: bgm
displayName: Missing Theme
file: audio/bgm/missing_theme.ogg
---
`)

    mkdirSync(gamePath(gameId, 'data/minigames'), { recursive: true })
    writeFileSync(gamePath(gameId, 'data/minigames/broken.md'), `---
id: broken
---
`)

    const doctor = runCli('doctor', gameId, '--json')
    expect(doctor.exitCode).toBe(1)
    const report = parseDoctorReport(doctor.stdout)
    const codes = report.issues.map((issue: { code: string }) => issue.code)
    expect(codes).toContain('story_locale_path_missing')
    expect(codes).toContain('asset_missing')
    expect(codes).toContain('minigame_entry_missing')
    expect(codes).toContain('minigame_results_missing')
  })

  it('covers assets atlas subcommands through the public CLI', () => {
    const gameId = trackGame(makeGameId('assets'))
    expect(runCli('new', gameId, 'CLI P0 Assets').exitCode).toBe(0)

    const character = runCli('assets', 'character-atlas', gameId, 'tester', '--count', '2', '--names', 'neutral,happy')
    expect(character.exitCode).toBe(0)
    expect(character.stdout).toContain(`games/${gameId}/assets/characters/tester/tester_atlas.json`)
    expect(existsSync(gamePath(gameId, 'assets/characters/tester/tester_atlas.json'))).toBe(true)

    const animation = runCli('assets', 'animation-atlas', gameId, 'sparkle', '--frames', '4')
    expect(animation.exitCode).toBe(0)
    expect(animation.stdout).toContain(`games/${gameId}/assets/animations/sparkle/sparkle_atlas.json`)
    expect(existsSync(gamePath(gameId, 'assets/animations/sparkle/sparkle_atlas.json'))).toBe(true)

    const badAssets = runCli('assets', 'character-atlas', gameId, '--count', '4')
    expect(badAssets.exitCode).toBe(1)
    expect(badAssets.stderr).toContain('Missing characterId')
  })
})
