import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { AudioManager } from '../engine/AudioManager.ts'
import { VolumeController } from '../engine/VolumeController.ts'

interface AudioStub {
  src: string
  loop: boolean
  volume: number
  currentTime: number
  play: ReturnType<typeof mock>
  pause: ReturnType<typeof mock>
  addEventListener: ReturnType<typeof mock>
}

function makeAudioStub(src = ''): AudioStub {
  return {
    src,
    loop: false,
    volume: 1,
    currentTime: 0,
    play: mock(() => Promise.resolve()),
    pause: mock(() => undefined),
    addEventListener: mock(() => undefined),
  }
}

function installAudioMock(): () => AudioStub[] {
  const instances: AudioStub[] = []
  ;(globalThis as Record<string, unknown>)['Audio'] = function (src?: string) {
    const stub = makeAudioStub(src)
    instances.push(stub)
    return stub
  }
  return () => instances
}

describe('AudioManager', () => {
  let manager: AudioManager
  let volume: VolumeController
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
    getInstances = installAudioMock()
    volume = new VolumeController()
    manager = new AudioManager(volume)
  })

  it('plays BGM through the bgm channel', () => {
    volume.setVolume('bgm', 0.5)
    manager.playBgm('theme', { file: 'audio/theme.ogg', volume: 0.8 })

    const [audio] = getInstances()
    expect(audio!.src).toBe('./assets/audio/theme.ogg')
    expect(audio!.loop).toBe(true)
    expect(audio!.volume).toBeCloseTo(0.4)
    expect(audio!.play).toHaveBeenCalledTimes(1)
  })

  it('plays ambience through an independent ambience channel', () => {
    volume.setVolume('bgm', 0.1)
    volume.setVolume('ambience', 0.4)
    manager.playAmbience('rain', { file: 'audio/rain.ogg', volume: 0.5 })

    const [audio] = getInstances()
    expect(audio!.src).toBe('./assets/audio/rain.ogg')
    expect(audio!.loop).toBe(true)
    expect(audio!.volume).toBeCloseTo(0.2)

    volume.setVolume('bgm', 1)
    expect(audio!.volume).toBeCloseTo(0.2)
  })

  it('replaces active ambience before starting a new ambience track', () => {
    manager.playAmbience('rain', null)
    const first = getInstances()[0]!
    manager.playAmbience('wind', null)
    const second = getInstances()[1]!

    expect(first.pause).toHaveBeenCalledTimes(1)
    expect(first.src).toBe('')
    expect(second.src).toBe('./assets/audio/ambience/wind.ogg')
    expect(second.play).toHaveBeenCalledTimes(1)
  })

  it('registers one-shot SFX and removes it on end', () => {
    manager.playSfx('click', { volume: 0.25 })
    const audio = getInstances()[0]!

    expect(audio.src).toBe('./assets/audio/sfx/click.ogg')
    expect(audio.volume).toBeCloseTo(0.25)
    expect(audio.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function), { once: true })
  })

  it('stopAll cleans every active source', () => {
    manager.playBgm('theme', null)
    manager.playAmbience('rain', null)
    manager.playVoice('line', null)
    manager.playSfx('click', null)
    const instances = getInstances()

    manager.stopAll()

    for (const audio of instances) {
      expect(audio.pause).toHaveBeenCalledTimes(1)
      expect(audio.src).toBe('')
    }
  })
})
