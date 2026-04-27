import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const decoder = new TextDecoder()
const createdGames: string[] = []

function runCli(...args: string[]) {
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
  const gameId = `cli-p2-${suffix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  createdGames.push(gameId)
  expect(runCli('new', gameId, `CLI P2 ${suffix}`).exitCode).toBe(0)
  return gameId
}

function gamePath(gameId: string, ...parts: string[]): string {
  return join(ROOT, 'games', gameId, ...parts)
}

function distPath(gameId: string, ...parts: string[]): string {
  return join(ROOT, 'dist', gameId, ...parts)
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'))
}

afterEach(() => {
  for (const gameId of createdGames.splice(0)) {
    rmSync(gamePath(gameId), { recursive: true, force: true })
    rmSync(distPath(gameId), { recursive: true, force: true })
  }
})

describe('P2 build modes and schema validation', () => {
  it('doctor reports game.config schema violations before deeper validation', () => {
    const gameId = makeGameId('schema')
    const configPath = gamePath(gameId, 'game.config.ts')
    writeFileSync(configPath, readFileSync(configPath, 'utf8').replace("version:     '0.1.0',", "version:     'bad',\n  mystery:     true,"))

    const doctor = runCli('doctor', gameId, '--json')
    expect(doctor.exitCode).toBe(1)
    const report = JSON.parse(doctor.stdout)
    const codes = report.issues.map((issue: { code: string }) => issue.code)
    expect(codes).toContain('config_schema_invalid')
    expect(report.issues.some((issue: { path: string }) => issue.path.includes('version'))).toBe(true)
    expect(report.issues.some((issue: { path: string }) => issue.path.includes('mystery'))).toBe(true)
  })

  it('build --mode static writes the effective mode to manifest.json', () => {
    const gameId = makeGameId('static')
    const build = runCli('build', gameId, '--mode', 'static')

    expect(build.exitCode).toBe(0)
    const manifest = readJson(distPath(gameId, 'manifest.json'))
    expect(manifest.distribution.mode).toBe('static')
    expect(manifest.distribution.wrappers).toEqual([])
  })

  it('build rejects unsupported mode values with an actionable error', () => {
    const gameId = makeGameId('bad-mode')
    const build = runCli('build', gameId, '--mode', 'nope')

    expect(build.exitCode).toBe(1)
    expect(build.stderr).toContain('Unsupported build mode "nope"')
  })

  it('portal and embedded modes produce distinguishable wrapper artifacts', () => {
    const gameId = makeGameId('wrappers')

    expect(runCli('build', gameId, '--mode', 'portal').exitCode).toBe(0)
    expect(existsSync(distPath(gameId, 'portal.json'))).toBe(true)
    let manifest = readJson(distPath(gameId, 'manifest.json'))
    expect(manifest.distribution.mode).toBe('portal')
    expect(manifest.distribution.wrappers).toEqual(['portal.json'])
    expect(manifest.pluginPolicy.load).toBe('declared-plugins-only')

    expect(runCli('build', gameId, '--mode', 'embedded').exitCode).toBe(0)
    expect(existsSync(distPath(gameId, 'embed.html'))).toBe(true)
    manifest = readJson(distPath(gameId, 'manifest.json'))
    expect(manifest.distribution.mode).toBe('embedded')
    expect(manifest.distribution.wrappers).toEqual(['embed.html'])
  })
})
