import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { EventBus } from '../engine/EventBus.ts'
import { SfxController } from '../engine/SfxController.ts'

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
describe('SfxController', () => {
  let bus: EventBus
  let controller: SfxController

  beforeEach(() => {
    installAudioMock()
    bus = new EventBus()
    controller = new SfxController(bus)
  })

  // US-002-AC01: play with volume
  it('AC01: play command starts SFX at the given volume', () => {
    bus.emit('engine:sfx', { type: 'sfx', id: 'play', src: 'audio/fx/click.mp3', volume: '1.0' })
    const stub = lastAudioStub!
    expect(stub).not.toBeNull()
    expect(stub.src).toBe('audio/fx/click.mp3')
    expect(stub.volume).toBeCloseTo(1.0)
    expect(stub.play).toHaveBeenCalledTimes(1)
  })

  // US-002-AC02: loop defaults to false when omitted
  it('AC02: loop defaults to false when omitted', () => {
    bus.emit('engine:sfx', { type: 'sfx', id: 'play', src: 'audio/fx/click.mp3' })
    expect(lastAudioStub!.loop).toBe(false)
  })

  // US-002-AC02: loop:true is respected
  it('AC02: loop:true is applied when specified', () => {
    bus.emit('engine:sfx', { type: 'sfx', id: 'play', src: 'audio/fx/loop.mp3', loop: 'true' })
    expect(lastAudioStub!.loop).toBe(true)
  })

  // US-002-AC03: stop command pauses and clears the audio
  it('AC03: stop command pauses the current SFX', () => {
    bus.emit('engine:sfx', { type: 'sfx', id: 'play', src: 'audio/fx/click.mp3' })
    const stub = lastAudioStub!
    bus.emit('engine:sfx', { type: 'sfx', id: 'stop' })
    expect(stub.pause).toHaveBeenCalledTimes(1)
    expect(stub.currentTime).toBe(0)
  })

  // US-002-AC03: stop when nothing is playing should not throw
  it('AC03: stop with no active SFX does not throw', () => {
    expect(() => bus.emit('engine:sfx', { type: 'sfx', id: 'stop' })).not.toThrow()
  })

  // US-002-AC04: volume command adjusts volume without stopping
  it('AC04: volume command adjusts volume without pausing', () => {
    bus.emit('engine:sfx', { type: 'sfx', id: 'play', src: 'audio/fx/click.mp3', volume: '1' })
    const stub = lastAudioStub!
    bus.emit('engine:sfx', { type: 'sfx', id: 'volume', level: '0.6' })
    expect(stub.pause).not.toHaveBeenCalled()
    expect(stub.volume).toBeCloseTo(0.6)
  })

  // US-002-AC04: volume with no active SFX should not throw
  it('AC04: volume command with no active SFX does not throw', () => {
    expect(() => bus.emit('engine:sfx', { type: 'sfx', id: 'volume', level: '0.6' })).not.toThrow()
  })

  // volume clamping
  it('clamps volume to 0–1 range', () => {
    bus.emit('engine:sfx', { type: 'sfx', id: 'play', src: 'audio/fx/click.mp3', volume: '2.5' })
    expect(lastAudioStub!.volume).toBe(1)

    bus.emit('engine:sfx', { type: 'sfx', id: 'stop' })
    bus.emit('engine:sfx', { type: 'sfx', id: 'play', src: 'audio/fx/click.mp3', volume: '-0.3' })
    expect(lastAudioStub!.volume).toBe(0)
  })

  // destroy unsubscribes from bus
  it('destroy stops audio and unsubscribes from bus', () => {
    bus.emit('engine:sfx', { type: 'sfx', id: 'play', src: 'audio/fx/click.mp3' })
    const stub = lastAudioStub!
    controller.destroy()
    expect(stub.pause).toHaveBeenCalledTimes(1)

    lastAudioStub = null
    bus.emit('engine:sfx', { type: 'sfx', id: 'play', src: 'audio/fx/new.mp3' })
    expect(lastAudioStub).toBeNull()
  })
})
