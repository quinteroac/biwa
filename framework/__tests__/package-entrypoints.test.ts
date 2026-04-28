import { describe, expect, it } from 'bun:test'
import {
  GameEngine,
  VN_FRAMEWORK_PACKAGE_ENTRYPOINTS,
  VN_FRAMEWORK_PEER_DEPENDENCIES,
  VN_FRAMEWORK_VERSION,
} from '@vn-experiment/core'
import { GameEngine as EngineEntrypoint } from '@vn-experiment/core/engine'
import { mountVnApp, VnStage } from '@vn-experiment/core/react'
import { officialPlugins, VN_PLUGIN_API_VERSION } from '@vn-experiment/plugins'
import { build, doctor, validateGame } from '@vn-experiment/manager'
import type { GameConfig } from '@vn-experiment/core/types'

describe('package-style entrypoints', () => {
  it('resolves local aliases for future public packages', () => {
    expect(GameEngine).toBe(EngineEntrypoint)
    expect(typeof mountVnApp).toBe('function')
    expect(typeof VnStage).toBe('function')
    expect(typeof officialPlugins.screenEffects).toBe('function')
    expect(typeof build).toBe('function')
    expect(typeof doctor).toBe('function')
    expect(typeof validateGame).toBe('function')
  })

  it('exposes package metadata for manifests and docs', () => {
    const config = {
      id: 'package-style-fixture',
      title: 'Package Style Fixture',
      version: '0.1.0',
      story: { defaultLocale: 'en', locales: { en: './story/en/main.ink' } },
    } satisfies GameConfig

    expect(config.id).toBe('package-style-fixture')
    expect(VN_FRAMEWORK_VERSION).toBe('0.1.0')
    expect(VN_PLUGIN_API_VERSION).toBe('vn-plugin-api-v1')
    expect(VN_FRAMEWORK_PACKAGE_ENTRYPOINTS.core).toBe('@vn-experiment/core')
    expect(VN_FRAMEWORK_PACKAGE_ENTRYPOINTS.plugins).toBe('@vn-experiment/plugins')
    expect(VN_FRAMEWORK_PEER_DEPENDENCIES.react).toBe('^19.2.5')
    expect(VN_FRAMEWORK_PEER_DEPENDENCIES.inkjs).toBe('^2.3.0')
  })
})
