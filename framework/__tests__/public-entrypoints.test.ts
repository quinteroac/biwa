import { describe, expect, it } from 'bun:test'
import { GameEngine, mountVnApp, officialPluginCatalog, officialPlugins, VN_PLUGIN_API_VERSION } from '../index.ts'
import { GameEngine as EngineEntrypoint } from '../engine.ts'
import { mountVnApp as ReactEntrypoint } from '../react.ts'
import { officialPlugins as PluginsEntrypoint } from '../plugins.ts'
import type { GameConfig, VnPluginModule } from '../types.ts'
import smokeConfig from '../../games/smoke-fixture/game.config.ts'
import smokeLogger from '../../games/smoke-fixture/plugins/smoke-logger/index.ts'

describe('public framework entrypoints', () => {
  it('exposes core runtime, React mount and official plugin factories from framework/index.ts', () => {
    expect(GameEngine).toBe(EngineEntrypoint)
    expect(mountVnApp).toBe(ReactEntrypoint)
    expect(officialPlugins).toBe(PluginsEntrypoint)
    expect(VN_PLUGIN_API_VERSION).toBe('vn-plugin-api-v1')
    expect(officialPluginCatalog.length).toBeGreaterThan(0)
  })

  it('allows smoke-fixture to type against public framework exports', () => {
    const config: GameConfig = smokeConfig
    const plugin: VnPluginModule = smokeLogger

    expect(config.id).toBe('smoke-fixture')
    expect(config.plugins?.some(item => item.id === 'official-screen-effects')).toBe(true)
    expect(typeof plugin.setup).toBe('function')
  })
})
