import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { plugins, scaffoldPlugin } from '../commands/plugins.ts'
import { validateGame } from '../commands/doctor.ts'
import { build } from '../commands/build.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const createdPaths: string[] = []

function cleanup(path: string): string {
  createdPaths.push(path)
  return path
}

function gameDir(gameId: string): string {
  return join(ROOT, 'games', gameId)
}

function writeMinimalGame(gameId: string, configExtra = '', sceneBackground = 'type: static\n    image: scenes/default/background.svg'): void {
  const dir = cleanup(gameDir(gameId))
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, 'story/en'), { recursive: true })
  mkdirSync(join(dir, 'data/scenes'), { recursive: true })
  mkdirSync(join(dir, 'assets/scenes/default'), { recursive: true })
  writeFileSync(join(dir, 'story/en/main.ink'), 'Hello.\n')
  writeFileSync(join(dir, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${gameId}</title>
  <link rel="stylesheet" href="../../framework/styles/base.css">
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import config from './game.config.ts'
    import { GameEngine } from '../../framework/engine/GameEngine.ts'
    import { mountVnApp } from '../../framework/components/VnApp.tsx'

    const engine = await GameEngine.init(config)
    mountVnApp(engine, document.getElementById('root'))
  </script>
</body>
</html>
`)
  writeFileSync(join(dir, 'assets/scenes/default/background.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  writeFileSync(join(dir, 'data/scenes/default.md'), `---
id: default
background:
    ${sceneBackground}
---
`)
  writeFileSync(join(dir, 'game.config.ts'), `import type { GameConfig } from '../../framework/types/game-config.d.ts'

const config: GameConfig = {
  id: '${gameId}',
  title: '${gameId}',
  version: '1.0.0',
  story: { defaultLocale: 'en', locales: { en: './story/en/main.ink' } },
  data: { scenes: './data/scenes/' },
  ${configExtra}
}

export default config
`)
}

afterEach(() => {
  for (const path of createdPaths.splice(0)) {
    rmSync(path, { recursive: true, force: true })
    rmSync(path.replace('/games/', '/dist/'), { recursive: true, force: true })
  }
})

describe('plugins command helpers', () => {
  it('scaffolds a plugin that validates', async () => {
    const outRoot = cleanup(join(ROOT, '.tmp-plugin-tests'))
    rmSync(outRoot, { recursive: true, force: true })

    const relDir = scaffoldPlugin('sample-plugin', { out: '.tmp-plugin-tests' })

    expect(relDir).toBe('.tmp-plugin-tests/sample-plugin')
    expect(existsSync(join(ROOT, relDir, 'plugin.config.ts'))).toBe(true)
    expect(existsSync(join(ROOT, relDir, 'index.ts'))).toBe(true)
    await expect(plugins('validate', relDir)).resolves.toBeUndefined()
  })

  it('doctor accepts custom renderers only when declared by a plugin', async () => {
    const gameId = 'plugin-renderer-doctor'
    writeMinimalGame(gameId, '', 'type: ink-wash\n    image: scenes/default/background.svg')

    const invalid = await validateGame(gameId)
    expect(invalid.issues.map(issue => issue.code)).toContain('renderer_unknown')

    const validGameId = 'plugin-renderer-doctor-valid'
    writeMinimalGame(validGameId, '', 'type: ink-wash\n    image: scenes/default/background.svg')
    const configPath = join(gameDir(validGameId), 'game.config.ts')
    mkdirSync(join(gameDir(validGameId), 'plugins/ink-wash'), { recursive: true })
    writeFileSync(join(gameDir(validGameId), 'plugins/ink-wash/index.ts'), 'export default {}\n')
    writeFileSync(configPath, `import type { GameConfig } from '../../framework/types/game-config.d.ts'

const config: GameConfig = {
  id: '${validGameId}',
  title: '${validGameId}',
  version: '1.0.0',
  story: { defaultLocale: 'en', locales: { en: './story/en/main.ink' } },
  data: { scenes: './data/scenes/' },
  plugins: [{
    id: 'ink-wash',
    name: 'Ink Wash',
    version: '1.0.0',
    type: 'plugin',
    entry: './plugins/ink-wash/index.ts',
    capabilities: ['renderer'],
    renderers: { background: ['ink-wash'] },
  }],
}

export default config
`)

    const valid = await validateGame(validGameId)
    expect(valid.issues.map(issue => issue.code)).not.toContain('renderer_unknown')

    await build(validGameId)
    const manifest = JSON.parse(readFileSync(join(ROOT, 'dist', validGameId, 'manifest.json'), 'utf8')) as {
      pluginPolicy: { remoteEntriesAllowed: boolean; apiVersion: string }
      plugins: Array<{ id: string; entry: string | null; renderers: { background?: string[] } }>
    }
    expect(manifest.plugins[0]?.id).toBe('ink-wash')
    expect(manifest.plugins[0]?.renderers.background).toEqual(['ink-wash'])
    expect(manifest.pluginPolicy.remoteEntriesAllowed).toBe(false)
    expect(manifest.pluginPolicy.apiVersion).toBe('vn-plugin-api-v1')
    expect(manifest.plugins[0]?.entry).toBe('./plugins/ink-wash/index.js')
  })

  it('doctor rejects remote plugin entries and reserved plugin ids', async () => {
    const gameId = 'plugin-security-doctor'
    writeMinimalGame(gameId, `plugins: [{
    id: 'vn-core',
    name: 'Bad Plugin',
    version: '1.0.0',
    type: 'plugin',
    entry: 'https://example.test/plugin.js',
    capabilities: ['engine-event'],
  }, {
    id: 'remote-plugin',
    name: 'Remote Plugin',
    version: '1.0.0',
    type: 'plugin',
    entry: 'https://example.test/plugin.js',
    capabilities: ['engine-event'],
  }],`)

    const result = await validateGame(gameId)
    const codes = result.issues.map(issue => issue.code)
    expect(codes).toContain('plugin_manifest_invalid')
    expect(codes).toContain('plugin_entry_remote')
  })
})
