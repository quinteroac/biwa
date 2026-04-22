import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { EventBus } from '../engine/EventBus.ts'
import { VoiceController } from '../engine/VoiceController.ts'

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
describe('VoiceController', () => {
  let bus: EventBus
  let controller: VoiceController

  beforeEach(() => {
    installAudioMock()
    bus = new EventBus()
    controller = new VoiceController(bus)
  })

  // US-004-AC01: play with src and volume:1.0; loop defaults to false
  it('AC01: play command starts voice line once (loop=false) with given volume', () => {
    bus.emit('engine:voice', { type: 'voice', id: 'play', src: 'audio/voice/char01_line03.mp3', volume: '1.0' })
    const stub = lastAudioStub!
    expect(stub).not.toBeNull()
    expect(stub.src).toBe('audio/voice/char01_line03.mp3')
    expect(stub.loop).toBe(false)
    expect(stub.volume).toBeCloseTo(1.0)
    expect(stub.play).toHaveBeenCalledTimes(1)
  })

  it('AC01: play defaults volume to 1 when not provided', () => {
    bus.emit('engine:voice', { type: 'voice', id: 'play', src: 'audio/voice/char01_line03.mp3' })
    expect(lastAudioStub!.volume).toBeCloseTo(1)
    expect(lastAudioStub!.loop).toBe(false)
  })

  // US-004-AC02: stop command stops voice playback immediately
  it('AC02: stop command stops voice playback immediately', () => {
    bus.emit('engine:voice', { type: 'voice', id: 'play', src: 'audio/voice/char01_line03.mp3' })
    const stub = lastAudioStub!
    bus.emit('engine:voice', { type: 'voice', id: 'stop' })
    expect(stub.pause).toHaveBeenCalledTimes(1)
    expect(stub.currentTime).toBe(0)
  })

  it('AC02: stop with no active voice does not throw', () => {
    expect(() => bus.emit('engine:voice', { type: 'voice', id: 'stop' })).not.toThrow()
  })

  // US-004-AC03: starting a new voice line stops the previous one first
  it('AC03: starting a new voice line stops the previous one first', () => {
    bus.emit('engine:voice', { type: 'voice', id: 'play', src: 'audio/voice/char01_line03.mp3' })
    const firstStub = lastAudioStub!
    bus.emit('engine:voice', { type: 'voice', id: 'play', src: 'audio/voice/char02_line01.mp3' })
    const secondStub = lastAudioStub!

    expect(firstStub.pause).toHaveBeenCalledTimes(1)
    expect(firstStub.currentTime).toBe(0)
    expect(secondStub.src).toBe('audio/voice/char02_line01.mp3')
    expect(secondStub.play).toHaveBeenCalledTimes(1)
  })

  // US-004-AC04: volume command adjusts voice volume without stopping playback
  it('AC04: volume command adjusts voice volume without pausing', () => {
    bus.emit('engine:voice', { type: 'voice', id: 'play', src: 'audio/voice/char01_line03.mp3', volume: '1' })
    const stub = lastAudioStub!
    bus.emit('engine:voice', { type: 'voice', id: 'volume', level: '0.9' })
    expect(stub.pause).not.toHaveBeenCalled()
    expect(stub.volume).toBeCloseTo(0.9)
  })

  it('AC04: volume command with no active voice does not throw', () => {
    expect(() => bus.emit('engine:voice', { type: 'voice', id: 'volume', level: '0.9' })).not.toThrow()
  })

  // Volume clamping
  it('clamps volume to 0–1 range on play', () => {
    bus.emit('engine:voice', { type: 'voice', id: 'play', src: 'audio/voice/char01_line03.mp3', volume: '2.5' })
    expect(lastAudioStub!.volume).toBe(1)

    bus.emit('engine:voice', { type: 'voice', id: 'stop' })
    bus.emit('engine:voice', { type: 'voice', id: 'play', src: 'audio/voice/char01_line03.mp3', volume: '-0.3' })
    expect(lastAudioStub!.volume).toBe(0)
  })

  // destroy unsubscribes
  it('destroy stops audio and unsubscribes from bus', () => {
    bus.emit('engine:voice', { type: 'voice', id: 'play', src: 'audio/voice/char01_line03.mp3' })
    const stub = lastAudioStub!
    controller.destroy()
    expect(stub.pause).toHaveBeenCalledTimes(1)

    lastAudioStub = null
    bus.emit('engine:voice', { type: 'voice', id: 'play', src: 'audio/voice/char02_line01.mp3' })
    expect(lastAudioStub).toBeNull()
  })
})
