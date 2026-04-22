import type { EventBus } from './EventBus.ts'
import type { TagCommand } from '../TagParser.ts'

/**
 * Controls ambient soundscape playback by listening to `engine:ambience` events
 * emitted by `GameEngine`. Supported commands: `play`, `stop`, `volume`.
 */
export class AmbienceController {
  #audio: HTMLAudioElement | null = null
  #bus: EventBus
  #unsubscribe: () => void

  constructor(bus: EventBus) {
    this.#bus = bus
    this.#unsubscribe = this.#bus.on<TagCommand>('engine:ambience', cmd => this.#handle(cmd))
  }

  #handle(cmd: TagCommand): void {
    switch (cmd.id) {
      case 'play':
        this.#play(cmd)
        break
      case 'stop':
        this.#stop()
        break
      case 'volume':
        this.#setVolume(cmd)
        break
    }
  }

  /**
   * Starts an ambience track. Stops any currently playing ambience first.
   * @param cmd Parsed tag command with `src`, `loop`, and optional `volume` fields.
   */
  #play(cmd: TagCommand): void {
    this.#stop()

    const src = cmd['src'] as string | undefined
    if (!src) return

    const audio = new Audio(src)

    const loopRaw = cmd['loop']
    audio.loop = loopRaw === 'true' || loopRaw === true

    const volRaw = cmd['volume']
    const volume = volRaw !== undefined ? parseFloat(String(volRaw)) : 1
    audio.volume = isNaN(volume) ? 1 : Math.max(0, Math.min(1, volume))

    this.#audio = audio
    void audio.play().catch(e => console.warn('[AmbienceController] play() failed:', e))
  }

  /**
   * Stops the currently playing ambience track immediately.
   */
  #stop(): void {
    if (this.#audio) {
      this.#audio.pause()
      this.#audio.currentTime = 0
      this.#audio = null
    }
  }

  /**
   * Adjusts the ambience volume without interrupting playback.
   * @param cmd Parsed tag command with a `level` field (0.0–1.0).
   */
  #setVolume(cmd: TagCommand): void {
    if (!this.#audio) return
    const level = parseFloat(String(cmd['level'] ?? 1))
    if (!isNaN(level)) {
      this.#audio.volume = Math.max(0, Math.min(1, level))
    }
  }

  /** Releases the current audio element and detaches the event listener. */
  destroy(): void {
    this.#stop()
    this.#unsubscribe()
  }
}
