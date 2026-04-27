import type { EventBus } from './EventBus.ts'
import type { TagCommand } from '../TagParser.ts'

/**
 * Controls voice line playback by listening to `engine:voice` events
 * emitted by `GameEngine`. Supported commands: `play`, `stop`, `volume`.
 * Voice lines always play once (loop is always false).
 */
export class VoiceController {
  #audio: HTMLAudioElement | null = null
  #bus: EventBus<any>
  #unsubscribe: () => void

  constructor(bus: EventBus<any>) {
    this.#bus = bus
    this.#unsubscribe = this.#bus.on<TagCommand>('engine:voice', cmd => this.#handle(cmd))
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
   * Plays a voice line. Stops any currently playing voice line first.
   * Loop is always false for voice lines.
   * @param cmd Parsed tag command with `src` and optional `volume` fields.
   */
  #play(cmd: TagCommand): void {
    this.#stop()

    const src = cmd['src'] as string | undefined
    if (!src) return

    const audio = new Audio(src)
    audio.loop = false

    const volRaw = cmd['volume']
    const volume = volRaw !== undefined ? parseFloat(String(volRaw)) : 1
    audio.volume = isNaN(volume) ? 1 : Math.max(0, Math.min(1, volume))

    this.#audio = audio
    void audio.play().catch(e => console.warn('[VoiceController] play() failed:', e))
  }

  /**
   * Stops the currently playing voice line immediately.
   */
  #stop(): void {
    if (this.#audio) {
      this.#audio.pause()
      this.#audio.currentTime = 0
      this.#audio = null
    }
  }

  /**
   * Adjusts the voice volume without interrupting playback.
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
