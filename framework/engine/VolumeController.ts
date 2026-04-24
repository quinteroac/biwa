/**
 * Audio channel identifiers for volume control.
 */
export type AudioChannel = 'master' | 'bgm' | 'sfx' | 'voice'

/**
 * Manages volume levels across audio channels.
 * Tracks active audio sources per channel and applies volume changes
 * to all active sources immediately.
 */
export class VolumeController {
  static readonly #CHANNELS = Object.freeze(['master', 'bgm', 'sfx', 'voice'] as const)

  #volumes: Map<AudioChannel, number>
  #sources: Map<AudioChannel, Set<HTMLAudioElement>>

  constructor() {
    this.#volumes = new Map()
    this.#sources = new Map()
    for (const ch of VolumeController.#CHANNELS) {
      this.#volumes.set(ch, 1.0)
      this.#sources.set(ch, new Set())
    }
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
   */
  registerSource(channel: AudioChannel, source: HTMLAudioElement): void {
    this.#validateChannel(channel)
    this.#sources.get(channel)!.add(source)
    source.volume = this.#getEffectiveVolume(channel)
  }

  /**
   * Unregisters an audio element from its channel.
   * @param channel The channel the source belongs to.
   * @param source The HTMLAudioElement to remove.
   */
  unregisterSource(channel: AudioChannel, source: HTMLAudioElement): void {
    this.#validateChannel(channel)
    this.#sources.get(channel)!.delete(source)
  }

  /**
   * Calculates the effective volume for a channel, accounting for master volume.
   * @param channel The channel to calculate for.
   * @returns The effective volume (channel × master), clamped to 0.0–1.0.
   */
  #getEffectiveVolume(channel: AudioChannel): number {
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
    const volume = this.#getEffectiveVolume(channel)
    for (const source of sources) {
      source.volume = volume
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
}
