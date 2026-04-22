import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { EventBus } from '../engine/EventBus.ts'
import { BgmController } from '../engine/BgmController.ts'

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
describe('BgmController', () => {
  let bus: EventBus
  let controller: BgmController

  beforeEach(() => {
    installAudioMock()
    bus = new EventBus()
    controller = new BgmController(bus)
  })

  // AC01: play with loop:true, volume:0.8
  it('AC01: play command starts track with loop=true and volume=0.8', () => {
    bus.emit('engine:bgm', { type: 'bgm', id: 'play', src: 'audio/theme.mp3', loop: 'true', volume: '0.8' })
    const stub = lastAudioStub!
    expect(stub).not.toBeNull()
    expect(stub.src).toBe('audio/theme.mp3')
    expect(stub.loop).toBe(true)
    expect(stub.volume).toBeCloseTo(0.8)
    expect(stub.play).toHaveBeenCalledTimes(1)
  })

  // AC02: play with loop:false plays once (loop=false)
  it('AC02: play command with loop:false sets loop=false', () => {
    bus.emit('engine:bgm', { type: 'bgm', id: 'play', src: 'audio/jingle.mp3', loop: 'false' })
    const stub = lastAudioStub!
    expect(stub.loop).toBe(false)
    expect(stub.play).toHaveBeenCalledTimes(1)
  })

  // AC03: stop command pauses and clears the audio
  it('AC03: stop command pauses the current BGM', () => {
    bus.emit('engine:bgm', { type: 'bgm', id: 'play', src: 'audio/theme.mp3', loop: 'true' })
    const stub = lastAudioStub!
    bus.emit('engine:bgm', { type: 'bgm', id: 'stop' })
    expect(stub.pause).toHaveBeenCalledTimes(1)
    expect(stub.currentTime).toBe(0)
  })

  // AC03: stop when nothing is playing should not throw
  it('AC03: stop with no active BGM does not throw', () => {
    expect(() => bus.emit('engine:bgm', { type: 'bgm', id: 'stop' })).not.toThrow()
  })

  // AC04: volume command adjusts volume without stopping
  it('AC04: volume command adjusts volume without pausing', () => {
    bus.emit('engine:bgm', { type: 'bgm', id: 'play', src: 'audio/theme.mp3', loop: 'true', volume: '1' })
    const stub = lastAudioStub!
    bus.emit('engine:bgm', { type: 'bgm', id: 'volume', level: '0.5' })
    expect(stub.pause).not.toHaveBeenCalled()
    expect(stub.volume).toBeCloseTo(0.5)
  })

  // AC04: volume with no active BGM should not throw
  it('AC04: volume command with no active BGM does not throw', () => {
    expect(() => bus.emit('engine:bgm', { type: 'bgm', id: 'volume', level: '0.5' })).not.toThrow()
  })

  // AC05: starting a new BGM stops the previous one
  it('AC05: starting a new BGM stops the previous track first', () => {
    bus.emit('engine:bgm', { type: 'bgm', id: 'play', src: 'audio/track1.mp3', loop: 'true' })
    const firstStub = lastAudioStub!
    bus.emit('engine:bgm', { type: 'bgm', id: 'play', src: 'audio/track2.mp3', loop: 'false' })
    const secondStub = lastAudioStub!

    expect(firstStub.pause).toHaveBeenCalledTimes(1)
    expect(firstStub.currentTime).toBe(0)
    expect(secondStub.src).toBe('audio/track2.mp3')
    expect(secondStub.play).toHaveBeenCalledTimes(1)
  })

  // volume clamping
  it('clamps volume to 0–1 range', () => {
    bus.emit('engine:bgm', { type: 'bgm', id: 'play', src: 'audio/theme.mp3', loop: 'false', volume: '2.5' })
    expect(lastAudioStub!.volume).toBe(1)

    bus.emit('engine:bgm', { type: 'bgm', id: 'stop' })
    bus.emit('engine:bgm', { type: 'bgm', id: 'play', src: 'audio/theme.mp3', loop: 'false', volume: '-0.3' })
    expect(lastAudioStub!.volume).toBe(0)
  })

  // destroy unsubscribes from bus
  it('destroy stops audio and unsubscribes from bus', () => {
    bus.emit('engine:bgm', { type: 'bgm', id: 'play', src: 'audio/theme.mp3', loop: 'true' })
    const stub = lastAudioStub!
    controller.destroy()
    expect(stub.pause).toHaveBeenCalledTimes(1)

    // After destroy, further bgm events should be ignored (new stub should NOT be created)
    lastAudioStub = null
    bus.emit('engine:bgm', { type: 'bgm', id: 'play', src: 'audio/new.mp3', loop: 'false' })
    expect(lastAudioStub).toBeNull()
  })
})
