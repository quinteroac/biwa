import { describe, it, expect, beforeEach } from 'bun:test'
import { VolumeController } from '../engine/VolumeController.ts'

// ---------------------------------------------------------------------------
// Minimal HTMLAudioElement stub
// ---------------------------------------------------------------------------
interface AudioStub {
  src: string
  volume: number
}

function makeAudioStub(src: string): AudioStub {
  return { src, volume: 1 }
}

function installAudioMock(): () => AudioStub[] {
  const instances: AudioStub[] = []
  ;(globalThis as Record<string, unknown>)['Audio'] = function (src?: string) {
    const stub = makeAudioStub(src ?? '')
    instances.push(stub)
    return stub
  }
  return () => instances
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('VolumeController', () => {
  let controller: VolumeController
  let getInstances: () => AudioStub[]
  const store: Record<string, string> = {}

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key]
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value },
        removeItem: (key: string) => { delete store[key] },
        clear: () => { for (const key of Object.keys(store)) delete store[key] },
      },
      writable: true,
      configurable: true,
    })
    controller = new VolumeController()
    getInstances = installAudioMock()
  })

  // US-001-AC01: VolumeController class exists in framework/engine/VolumeController.ts
  it('AC01: VolumeController is importable from framework/engine/VolumeController.ts', () => {
    expect(typeof VolumeController).toBe('function')
    expect(controller).toBeInstanceOf(VolumeController)
  })

  // US-001-AC02: setVolume and getVolume methods exist for all channels
  it('AC02: setVolume and getVolume work for master channel', () => {
    controller.setVolume('master', 0.75)
    expect(controller.getVolume('master')).toBeCloseTo(0.75)
  })

  it('AC02: setVolume and getVolume work for bgm channel', () => {
    controller.setVolume('bgm', 0.5)
    expect(controller.getVolume('bgm')).toBeCloseTo(0.5)
  })

  it('AC02: setVolume and getVolume work for ambience channel', () => {
    controller.setVolume('ambience', 0.45)
    expect(controller.getVolume('ambience')).toBeCloseTo(0.45)
  })

  it('AC02: setVolume and getVolume work for sfx channel', () => {
    controller.setVolume('sfx', 0.3)
    expect(controller.getVolume('sfx')).toBeCloseTo(0.3)
  })

  it('AC02: setVolume and getVolume work for voice channel', () => {
    controller.setVolume('voice', 0.8)
    expect(controller.getVolume('voice')).toBeCloseTo(0.8)
  })

  it('AC02: channels default to 1.0', () => {
    expect(controller.getVolume('master')).toBeCloseTo(1.0)
    expect(controller.getVolume('bgm')).toBeCloseTo(1.0)
    expect(controller.getVolume('ambience')).toBeCloseTo(1.0)
    expect(controller.getVolume('sfx')).toBeCloseTo(1.0)
    expect(controller.getVolume('voice')).toBeCloseTo(1.0)
  })

  // US-001-AC03: Volume values are normalized to 0.0–1.0
  it('AC03: volumes above 1.0 are clamped to 1.0', () => {
    controller.setVolume('bgm', 1.5)
    expect(controller.getVolume('bgm')).toBeCloseTo(1.0)
  })

  it('AC03: volumes below 0.0 are clamped to 0.0', () => {
    controller.setVolume('sfx', -0.5)
    expect(controller.getVolume('sfx')).toBeCloseTo(0.0)
  })

  it('AC03: boundary values 0.0 and 1.0 are accepted as-is', () => {
    controller.setVolume('master', 0.0)
    expect(controller.getVolume('master')).toBeCloseTo(0.0)
    controller.setVolume('master', 1.0)
    expect(controller.getVolume('master')).toBeCloseTo(1.0)
  })

  // US-001-AC04: Setting volume applies to all active audio sources in that channel
  it('AC04: registering a source sets its volume to the channel volume', () => {
    controller.setVolume('bgm', 0.6)
    const stub = makeAudioStub('test.mp3')
    controller.registerSource('bgm', stub as unknown as HTMLAudioElement)
    expect(stub.volume).toBeCloseTo(0.6)
  })

  it('AC04: registering a source applies source base volume before channel volume', () => {
    controller.setVolume('master', 0.5)
    controller.setVolume('bgm', 0.8)
    const stub = makeAudioStub('test.mp3')
    controller.registerSource('bgm', stub as unknown as HTMLAudioElement, 0.25)
    expect(stub.volume).toBeCloseTo(0.1)
  })

  it('AC04: updating source base volume preserves master and channel mixing', () => {
    controller.setVolume('master', 0.5)
    controller.setVolume('ambience', 0.4)
    const stub = makeAudioStub('rain.mp3')
    controller.registerSource('ambience', stub as unknown as HTMLAudioElement, 1)

    controller.setSourceVolume('ambience', stub as unknown as HTMLAudioElement, 0.25)

    expect(stub.volume).toBeCloseTo(0.05)
  })

  it('AC04: setting channel volume updates all registered sources', () => {
    const stub1 = makeAudioStub('a.mp3')
    const stub2 = makeAudioStub('b.mp3')
    controller.registerSource('sfx', stub1 as unknown as HTMLAudioElement)
    controller.registerSource('sfx', stub2 as unknown as HTMLAudioElement)

    controller.setVolume('sfx', 0.4)
    expect(stub1.volume).toBeCloseTo(0.4)
    expect(stub2.volume).toBeCloseTo(0.4)
  })

  it('AC04: unregistering a source excludes it from volume changes', () => {
    const stub1 = makeAudioStub('a.mp3')
    const stub2 = makeAudioStub('b.mp3')
    controller.registerSource('voice', stub1 as unknown as HTMLAudioElement)
    controller.registerSource('voice', stub2 as unknown as HTMLAudioElement)

    controller.unregisterSource('voice', stub2 as unknown as HTMLAudioElement)
    controller.setVolume('voice', 0.2)

    expect(stub1.volume).toBeCloseTo(0.2)
    // stub2 was unregistered before the setVolume call, so it keeps its original volume
    expect(stub2.volume).toBeCloseTo(1.0)
  })

  it('AC04: master volume affects all channels', () => {
    const bgmStub = makeAudioStub('bgm.mp3')
    const ambienceStub = makeAudioStub('rain.mp3')
    const sfxStub = makeAudioStub('sfx.mp3')
    controller.registerSource('bgm', bgmStub as unknown as HTMLAudioElement)
    controller.registerSource('ambience', ambienceStub as unknown as HTMLAudioElement)
    controller.registerSource('sfx', sfxStub as unknown as HTMLAudioElement)

    controller.setVolume('bgm', 0.8)
    controller.setVolume('ambience', 0.7)
    controller.setVolume('sfx', 0.6)

    // Set master to 0.5
    controller.setVolume('master', 0.5)

    // bgm: 0.8 * 0.5 = 0.4
    expect(bgmStub.volume).toBeCloseTo(0.4)
    // ambience: 0.7 * 0.5 = 0.35
    expect(ambienceStub.volume).toBeCloseTo(0.35)
    // sfx: 0.6 * 0.5 = 0.3
    expect(sfxStub.volume).toBeCloseTo(0.3)
  })

  it('persists channel volume changes to localStorage', () => {
    controller.setVolume('bgm', 0.42)
    expect(store['vn:volume:bgm']).toBe('0.42')
  })

  it('loads persisted channel volumes on construction', () => {
    store['vn:volume:master'] = '0.5'
    store['vn:volume:voice'] = '0.25'
    const restored = new VolumeController()
    expect(restored.getVolume('master')).toBeCloseTo(0.5)
    expect(restored.getVolume('voice')).toBeCloseTo(0.25)
  })

  it('setMuted forces active source output to zero without changing stored volumes', () => {
    const stub = makeAudioStub('bgm.mp3')
    controller.setVolume('bgm', 0.8)
    controller.registerSource('bgm', stub as unknown as HTMLAudioElement)
    controller.setMuted(true)
    expect(stub.volume).toBeCloseTo(0)
    expect(controller.getVolume('bgm')).toBeCloseTo(0.8)
    expect(controller.isMuted()).toBe(true)
    expect(store['vn:volume:muted']).toBe('true')
  })

  it('unmuting restores effective volume to active sources', () => {
    const stub = makeAudioStub('bgm.mp3')
    controller.setVolume('master', 0.5)
    controller.setVolume('bgm', 0.8)
    controller.registerSource('bgm', stub as unknown as HTMLAudioElement)
    controller.setMuted(true)
    controller.setMuted(false)
    expect(stub.volume).toBeCloseTo(0.4)
    expect(controller.isMuted()).toBe(false)
  })

  it('loads persisted mute state on construction', () => {
    store['vn:volume:muted'] = 'true'
    const restored = new VolumeController()
    expect(restored.isMuted()).toBe(true)
  })

  // US-001-AC05: Throws if channel name is invalid
  it('AC05: setVolume throws on invalid channel name', () => {
    expect(() => controller.setVolume('music' as any, 0.5)).toThrow(/Invalid audio channel/)
  })

  it('AC05: getVolume throws on invalid channel name', () => {
    expect(() => controller.getVolume('music' as any)).toThrow(/Invalid audio channel/)
  })

  it('AC05: registerSource throws on invalid channel name', () => {
    const stub = makeAudioStub('test.mp3')
    expect(() => controller.registerSource('music' as any, stub as unknown as HTMLAudioElement))
      .toThrow(/Invalid audio channel/)
  })

  it('AC05: unregisterSource throws on invalid channel name', () => {
    const stub = makeAudioStub('test.mp3')
    expect(() => controller.unregisterSource('music' as any, stub as unknown as HTMLAudioElement))
      .toThrow(/Invalid audio channel/)
  })

  // Edge cases
  it('handles zero volume correctly', () => {
    controller.setVolume('bgm', 0)
    const stub = makeAudioStub('test.mp3')
    controller.registerSource('bgm', stub as unknown as HTMLAudioElement)
    expect(stub.volume).toBe(0)
  })

  it('handles very small volume values', () => {
    controller.setVolume('master', 0.01)
    expect(controller.getVolume('master')).toBeCloseTo(0.01, 2)
  })

  // US-004-AC04: getChannelNames() returns available channels
  it('AC04: getChannelNames() returns all five channels', () => {
    const names = VolumeController.getChannelNames()
    expect(names).toEqual(['master', 'bgm', 'ambience', 'sfx', 'voice'])
  })

  it('AC04: getChannelNames() returns a readonly array', () => {
    const names = VolumeController.getChannelNames()
    expect(Array.isArray(names)).toBe(true)
    expect(names.length).toBe(5)
  })

  // US-004-AC02: Master volume acts as multiplier
  it('AC02: effective volume is master × channel for bgm', () => {
    const stub = makeAudioStub('bgm.mp3')
    controller.setVolume('bgm', 0.8)
    controller.setVolume('master', 0.5)
    controller.registerSource('bgm', stub as unknown as HTMLAudioElement)
    // effective = 0.8 * 0.5 = 0.4
    expect(stub.volume).toBeCloseTo(0.4)
  })

  it('AC02: effective volume is master × channel for voice', () => {
    const stub = makeAudioStub('voice.mp3')
    controller.setVolume('voice', 0.6)
    controller.setVolume('master', 0.25)
    controller.registerSource('voice', stub as unknown as HTMLAudioElement)
    // effective = 0.6 * 0.25 = 0.15
    expect(stub.volume).toBeCloseTo(0.15)
  })

  // US-004-AC03: Changing one channel does not affect others
  it('AC03: changing bgm volume does not affect sfx stored volume', () => {
    controller.setVolume('bgm', 0.3)
    controller.setVolume('sfx', 0.7)
    controller.setVolume('bgm', 0.9)
    // sfx stored value unchanged
    expect(controller.getVolume('sfx')).toBeCloseTo(0.7)
  })

  it('AC03: changing master does not change individual channel stored values', () => {
    controller.setVolume('bgm', 0.6)
    controller.setVolume('sfx', 0.4)
    controller.setVolume('master', 0.5)
    // stored values remain unchanged
    expect(controller.getVolume('bgm')).toBeCloseTo(0.6)
    expect(controller.getVolume('sfx')).toBeCloseTo(0.4)
    expect(controller.getVolume('master')).toBeCloseTo(0.5)
  })
})
