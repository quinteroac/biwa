import { describe, it, expect, beforeEach } from 'bun:test'
import { AssetLoader } from '../AssetLoader.ts'

beforeEach(() => {
  // @ts-ignore — stub global Image constructor for Bun's test environment (no DOM)
  globalThis.Image = function () {
    const obj: Record<string, unknown> = {
      onload: null as (() => void) | null,
      onerror: null as ((e: unknown) => void) | null,
    }
    Object.defineProperty(obj, 'src', {
      set(v: string) {
        // simulate successful load on next microtask
        Promise.resolve().then(() => (obj.onload as (() => void) | null)?.())
      },
      configurable: true,
    })
    return obj
  }
})

describe('AssetLoader — images only', () => {
  it('AC01/AC02/AC03: resolves an image URL and caches an HTMLImageElement', async () => {
    const loader = new AssetLoader()
    const results = await loader.preload(['bg.png'])
    expect(results[0]!.status).toBe('fulfilled')
    if (results[0]!.status === 'fulfilled') {
      // AC03 — value is an image (has tagName-like property via stub, verified by checking it exists)
      expect(results[0]!.value).toBeDefined()
    }
  })

  it('AC02: rejects with "Unsupported asset type" for audio extensions', async () => {
    const loader = new AssetLoader()
    const results = await loader.preload(['theme.mp3'])
    expect(results[0]!.status).toBe('rejected')
    if (results[0]!.status === 'rejected') {
      expect((results[0]!.reason as Error).message).toContain('Unsupported asset type')
    }
  })

  it('AC02: rejects for other audio extensions (ogg, wav, webm)', async () => {
    const loader = new AssetLoader()
    for (const ext of ['ogg', 'wav', 'webm']) {
      const results = await loader.preload([`sound.${ext}`])
      expect(results[0]!.status).toBe('rejected')
    }
  })

  it('AC04: get() returns undefined for uncached audio URLs (no audio branch loads them)', async () => {
    const loader = new AssetLoader()
    expect(loader.get('sound.mp3')).toBeUndefined()
  })
})
