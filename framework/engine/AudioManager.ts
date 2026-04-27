import { VolumeController } from './VolumeController.ts'
import type { AudioChannel } from '../types/audio.d.ts'

export interface AudioPlaybackData {
  file?: string
  volume?: number
}

/**
 * Central runtime facade for browser audio playback.
 *
 * `VnStage` owns event subscriptions; this class owns concrete audio elements,
 * channel registration and cleanup.
 */
export class AudioManager {
  #volume: VolumeController
  #bgm: HTMLAudioElement | null = null
  #bgmId: string | null = null
  #ambience: HTMLAudioElement | null = null
  #ambienceId: string | null = null
  #voice: HTMLAudioElement | null = null
  #sfx = new Set<HTMLAudioElement>()

  constructor(volumeController = new VolumeController()) {
    this.#volume = volumeController
  }

  playBgm(id: string, audioData: AudioPlaybackData | null): void {
    if (id === 'stop') {
      this.#stopBgm()
      return
    }
    if (this.#bgmId === id) return
    this.#stopBgm()
    const src = audioData?.file ? `./assets/${audioData.file}` : `./assets/audio/bgm/${id}.ogg`
    const audio = new Audio(src)
    audio.loop = true
    this.#volume.registerSource('bgm', audio, audioData?.volume ?? 0.8)
    void audio.play().catch(() => {})
    this.#bgm = audio
    this.#bgmId = id
  }

  playAmbience(id: string, audioData: AudioPlaybackData | null): void {
    if (id === 'stop') {
      this.#stopAmbience()
      return
    }
    if (this.#ambienceId === id) return
    this.#stopAmbience()
    const src = audioData?.file ? `./assets/${audioData.file}` : `./assets/audio/ambience/${id}.ogg`
    const audio = new Audio(src)
    audio.loop = true
    this.#volume.registerSource('ambience', audio, audioData?.volume ?? 0.5)
    void audio.play().catch(() => {})
    this.#ambience = audio
    this.#ambienceId = id
  }

  playSfx(id: string, audioData: AudioPlaybackData | null): void {
    if (id === 'stop') return
    const src = audioData?.file ? `./assets/${audioData.file}` : `./assets/audio/sfx/${id}.ogg`
    const audio = new Audio(src)
    this.#volume.registerSource('sfx', audio, audioData?.volume ?? 1.0)
    this.#sfx.add(audio)
    audio.addEventListener('ended', () => {
      this.#volume.unregisterSource('sfx', audio)
      this.#sfx.delete(audio)
    }, { once: true })
    void audio.play().catch(() => {})
  }

  playVoice(id: string, audioData: AudioPlaybackData | null): void {
    if (id === 'stop') {
      this.#stopVoice()
      return
    }
    this.#stopVoice()
    const src = audioData?.file ? `./assets/${audioData.file}` : `./assets/audio/voice/${id}.ogg`
    const audio = new Audio(src)
    audio.loop = false
    this.#volume.registerSource('voice', audio, audioData?.volume ?? 1.0)
    audio.addEventListener('ended', () => {
      this.#volume.unregisterSource('voice', audio)
      if (this.#voice === audio) this.#voice = null
    }, { once: true })
    void audio.play().catch(() => {})
    this.#voice = audio
  }

  setVolume(channel: AudioChannel, volume: number): void {
    this.#volume.setVolume(channel, volume)
  }

  getVolumes(): Record<AudioChannel, number> {
    return this.#volume.getVolumes()
  }

  stopAll(): void {
    this.#stopBgm()
    this.#stopAmbience()
    this.#stopVoice()
    for (const audio of this.#sfx) {
      this.#volume.unregisterSource('sfx', audio)
      audio.pause()
      audio.src = ''
    }
    this.#sfx.clear()
  }

  #stopBgm(): void {
    if (!this.#bgm) return
    this.#volume.unregisterSource('bgm', this.#bgm)
    this.#bgm.pause()
    this.#bgm.src = ''
    this.#bgm = null
    this.#bgmId = null
  }

  #stopAmbience(): void {
    if (!this.#ambience) return
    this.#volume.unregisterSource('ambience', this.#ambience)
    this.#ambience.pause()
    this.#ambience.src = ''
    this.#ambience = null
    this.#ambienceId = null
  }

  #stopVoice(): void {
    if (!this.#voice) return
    this.#volume.unregisterSource('voice', this.#voice)
    this.#voice.pause()
    this.#voice.src = ''
    this.#voice = null
  }
}
