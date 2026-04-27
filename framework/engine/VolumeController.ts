import type { AudioChannel } from '../types/audio.d.ts'

export type { AudioChannel }

/**
 * Manages volume levels across audio channels.
 * Tracks active audio sources per channel and applies volume changes
 * to all active sources immediately.
 */
const MUTE_STORAGE_KEY = 'vn:volume:muted'
const VOLUME_STORAGE_PREFIX = 'vn:volume:'

export class VolumeController {
  static readonly #CHANNELS: readonly AudioChannel[] = Object.freeze(['master', 'bgm', 'ambience', 'sfx', 'voice'] as const)

  #volumes: Map<AudioChannel, number>
  #sources: Map<AudioChannel, Set<HTMLAudioElement>>
  #baseVolumes: WeakMap<HTMLAudioElement, number>
  #muted: boolean

  constructor() {
    this.#volumes = new Map()
    this.#sources = new Map()
    this.#baseVolumes = new WeakMap()
    this.#muted = false
    for (const ch of VolumeController.#CHANNELS) {
      this.#volumes.set(ch, 1.0)
      this.#sources.set(ch, new Set())
    }
    this.#loadVolumes()
    this.#loadMuteState()
  }

  /**
   * Sets the volume for a specific channel and applies it to all active sources.
   * Volume values are normalized to the 0.0–1.0 range.
   * When the master channel is set, it cascades to all other channels.
   * @param channel The audio channel to adjust.
   * @param value The desired volume level (will be clamped to 0.0–1.0).
   * @throws Error if the channel name is invalid.
   */
  setVolume(channel: AudioChannel, value: number): void {
    this.#validateChannel(channel)
    const normalized = this.#normalize(value)
    this.#volumes.set(channel, normalized)
    this.#persistVolume(channel, normalized)
    this.#applyToChannel(channel)
  }

  /**
   * Returns the current volume level for a channel (0.0–1.0).
   * @param channel The audio channel to query.
   * @returns The normalized volume level for the channel.
   * @throws Error if the channel name is invalid.
   */
  getVolume(channel: AudioChannel): number {
    this.#validateChannel(channel)
    return this.#volumes.get(channel) ?? 1.0
  }

  /**
   * Registers an audio element as active in a channel.
   * Sets its initial volume to the effective channel volume.
   * @param channel The channel this source belongs to.
   * @param source The HTMLAudioElement to track.
   * @param baseVolume The source's own volume before channel mixing.
   */
  registerSource(channel: AudioChannel, source: HTMLAudioElement, baseVolume = 1): void {
    this.#validateChannel(channel)
    this.#sources.get(channel)!.add(source)
    this.setSourceVolume(channel, source, baseVolume)
  }

  /**
   * Updates one registered source's own volume before channel mixing.
   * Useful for fades while preserving master and channel volume controls.
   */
  setSourceVolume(channel: AudioChannel, source: HTMLAudioElement, baseVolume: number): void {
    this.#validateChannel(channel)
    const normalized = this.#normalize(baseVolume)
    this.#baseVolumes.set(source, normalized)
    source.volume = this.#normalize(normalized * this.#getEffectiveVolume(channel))
  }

  /**
   * Unregisters an audio element from its channel.
   * @param channel The channel the source belongs to.
   * @param source The HTMLAudioElement to remove.
   */
  unregisterSource(channel: AudioChannel, source: HTMLAudioElement): void {
    this.#validateChannel(channel)
    this.#sources.get(channel)!.delete(source)
    this.#baseVolumes.delete(source)
  }

  /** Returns a copy of all channel volumes. */
  getVolumes(): Record<AudioChannel, number> {
    return {
      master: this.getVolume('master'),
      bgm: this.getVolume('bgm'),
      ambience: this.getVolume('ambience'),
      sfx: this.getVolume('sfx'),
      voice: this.getVolume('voice'),
    }
  }

  /**
   * Enables or disables mute. Muting preserves stored channel values while
   * forcing active source output to zero.
   */
  setMuted(muted: boolean): void {
    this.#muted = muted
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, String(muted))
    } catch { /* non-fatal */ }
    for (const channel of VolumeController.#CHANNELS) {
      this.#applyToSources(channel)
    }
  }

  /** Returns whether output is currently muted. */
  isMuted(): boolean {
    return this.#muted
  }

  /** Toggles mute and returns the new muted state. */
  toggleMuted(): boolean {
    this.setMuted(!this.#muted)
    return this.#muted
  }

  /**
   * Calculates the effective volume for a channel, accounting for master volume.
   * @param channel The channel to calculate for.
   * @returns The effective volume (channel × master), clamped to 0.0–1.0.
   */
  #getEffectiveVolume(channel: AudioChannel): number {
    if (this.#muted) return 0
    const channelVol = this.#volumes.get(channel) ?? 1.0
    const masterVol = this.#volumes.get('master') ?? 1.0
    return this.#normalize(channelVol * masterVol)
  }

  /**
   * Applies the effective volume to all active sources in a channel.
   * For master channel, applies to all sources across all channels.
   * @param channel The channel to update.
   */
  #applyToChannel(channel: AudioChannel): void {
    if (channel === 'master') {
      for (const ch of VolumeController.#CHANNELS) {
        this.#applyToSources(ch)
      }
    } else {
      this.#applyToSources(channel)
    }
  }

  /**
   * Sets the effective volume on all tracked sources for a channel.
   * @param channel The channel whose sources to update.
   */
  #applyToSources(channel: AudioChannel): void {
    const sources = this.#sources.get(channel)
    if (!sources) return
    for (const source of sources) {
      const baseVolume = this.#baseVolumes.get(source) ?? 1
      source.volume = this.#normalize(baseVolume * this.#getEffectiveVolume(channel))
    }
  }

  #validateChannel(channel: AudioChannel): void {
    if (!VolumeController.#CHANNELS.includes(channel)) {
      throw new Error(`Invalid audio channel: "${channel}". Valid channels: ${VolumeController.#CHANNELS.join(', ')}`)
    }
  }

  #normalize(value: number): number {
    return Math.max(0, Math.min(1, value))
  }

  #loadMuteState(): void {
    try {
      this.#muted = localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
    } catch {
      this.#muted = false
    }
  }

  #loadVolumes(): void {
    for (const channel of VolumeController.#CHANNELS) {
      try {
        const raw = localStorage.getItem(`${VOLUME_STORAGE_PREFIX}${channel}`)
        if (raw === null) continue
        const value = Number(raw)
        if (!Number.isNaN(value)) {
          this.#volumes.set(channel, this.#normalize(value))
        }
      } catch { /* non-fatal */ }
    }
  }

  #persistVolume(channel: AudioChannel, value: number): void {
    try {
      localStorage.setItem(`${VOLUME_STORAGE_PREFIX}${channel}`, String(value))
    } catch { /* non-fatal */ }
  }

  /**
   * Returns the list of available audio channel names.
   * @returns A readonly array of channel name strings.
   */
  static getChannelNames(): readonly AudioChannel[] {
    return VolumeController.#CHANNELS
  }
}
