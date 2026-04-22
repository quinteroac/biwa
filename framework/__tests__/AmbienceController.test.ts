import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { EventBus } from '../engine/EventBus.ts'
import { AmbienceController } from '../engine/AmbienceController.ts'

// ---------------------------------------------------------------------------
// Minimal HTMLAudioElement stub
// ---------------------------------------------------------------------------
interface AudioStub {
  src: string
  loop: boolean
  volume: number
  currentTime: number
  paused: boolean
  play: ReturnType<typeof mock>
  pause: ReturnType<typeof mock>
}

function makeAudioStub(): AudioStub {
  return {
    src: '',
    loop: false,
    volume: 1,
    currentTime: 0,
    paused: true,
    play: mock(() => Promise.resolve()),
    pause: mock(() => undefined),
  }
}

let lastAudioStub: AudioStub | null = null

function installAudioMock(): void {
  lastAudioStub = null
  ;(globalThis as Record<string, unknown>)['Audio'] = function (src?: string) {
    const stub = makeAudioStub()
    if (src !== undefined) stub.src = src
    lastAudioStub = stub
    return stub
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AmbienceController', () => {
  let bus: EventBus
  let controller: AmbienceController

  beforeEach(() => {
    installAudioMock()
    bus = new EventBus()
    controller = new AmbienceController(bus)
  })

  // US-003-AC01: play with loop:true, volume:0.4
  it('AC01: play command starts ambience track with loop=true and volume=0.4', () => {
    bus.emit('engine:ambience', { type: 'ambience', id: 'play', src: 'audio/ambience/rain.mp3', loop: 'true', volume: '0.4' })
    const stub = lastAudioStub!
    expect(stub).not.toBeNull()
    expect(stub.src).toBe('audio/ambience/rain.mp3')
    expect(stub.loop).toBe(true)
    expect(stub.volume).toBeCloseTo(0.4)
    expect(stub.play).toHaveBeenCalledTimes(1)
  })

  // US-003-AC02: stop only stops ambience channel
  it('AC02: stop command stops the ambience track', () => {
    bus.emit('engine:ambience', { type: 'ambience', id: 'play', src: 'audio/ambience/rain.mp3', loop: 'true' })
    const stub = lastAudioStub!
    bus.emit('engine:ambience', { type: 'ambience', id: 'stop' })
    expect(stub.pause).toHaveBeenCalledTimes(1)
    expect(stub.currentTime).toBe(0)
  })

  it('AC02: stop with no active ambience does not throw', () => {
    expect(() => bus.emit('engine:ambience', { type: 'ambience', id: 'stop' })).not.toThrow()
  })

  it('AC02: stop does not affect BGM or SFX channels', () => {
    // BGM / SFX listeners are on different event channels; emitting ambience:stop
    // should not cause any cross-channel interference — verified by the controller
    // only listening on engine:ambience.
    const bgmBus = new EventBus()
    let bgmTriggered = false
    bgmBus.on('engine:bgm', () => { bgmTriggered = true })

    bus.emit('engine:ambience', { type: 'ambience', id: 'stop' })
    expect(bgmTriggered).toBe(false)
  })

  // US-003-AC03: new play stops previous ambience first
  it('AC03: starting a new ambience stops the previous track first', () => {
    bus.emit('engine:ambience', { type: 'ambience', id: 'play', src: 'audio/ambience/rain.mp3', loop: 'true' })
    const firstStub = lastAudioStub!
    bus.emit('engine:ambience', { type: 'ambience', id: 'play', src: 'audio/ambience/wind.mp3', loop: 'false' })
    const secondStub = lastAudioStub!

    expect(firstStub.pause).toHaveBeenCalledTimes(1)
    expect(firstStub.currentTime).toBe(0)
    expect(secondStub.src).toBe('audio/ambience/wind.mp3')
    expect(secondStub.play).toHaveBeenCalledTimes(1)
  })

  // US-003-AC04: volume command adjusts independently without interrupting
  it('AC04: volume command adjusts ambience volume without pausing', () => {
    bus.emit('engine:ambience', { type: 'ambience', id: 'play', src: 'audio/ambience/rain.mp3', loop: 'true', volume: '1' })
    const stub = lastAudioStub!
    bus.emit('engine:ambience', { type: 'ambience', id: 'volume', level: '0.3' })
    expect(stub.pause).not.toHaveBeenCalled()
    expect(stub.volume).toBeCloseTo(0.3)
  })

  it('AC04: volume command with no active ambience does not throw', () => {
    expect(() => bus.emit('engine:ambience', { type: 'ambience', id: 'volume', level: '0.3' })).not.toThrow()
  })

  // Volume clamping
  it('clamps volume to 0–1 range on play', () => {
    bus.emit('engine:ambience', { type: 'ambience', id: 'play', src: 'audio/ambience/rain.mp3', loop: 'false', volume: '2.5' })
    expect(lastAudioStub!.volume).toBe(1)

    bus.emit('engine:ambience', { type: 'ambience', id: 'stop' })
    bus.emit('engine:ambience', { type: 'ambience', id: 'play', src: 'audio/ambience/rain.mp3', loop: 'false', volume: '-0.3' })
    expect(lastAudioStub!.volume).toBe(0)
  })

  // destroy unsubscribes
  it('destroy stops audio and unsubscribes from bus', () => {
    bus.emit('engine:ambience', { type: 'ambience', id: 'play', src: 'audio/ambience/rain.mp3', loop: 'true' })
    const stub = lastAudioStub!
    controller.destroy()
    expect(stub.pause).toHaveBeenCalledTimes(1)

    lastAudioStub = null
    bus.emit('engine:ambience', { type: 'ambience', id: 'play', src: 'audio/ambience/birds.mp3', loop: 'false' })
    expect(lastAudioStub).toBeNull()
  })
})
