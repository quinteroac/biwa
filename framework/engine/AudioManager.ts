import { VolumeController } from './VolumeController.ts'
import type { AudioChannel } from '../types/audio.d.ts'

export interface AudioPlaybackData {
  file?: string
  volume?: number
  fade?: number
  duration?: number
  fadeIn?: number
  fadeOut?: number
  restored?: boolean
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
  #bgmBaseVolume = 0.8
  #ambience: HTMLAudioElement | null = null
  #ambienceId: string | null = null
  #ambienceBaseVolume = 0.5
  #voice: HTMLAudioElement | null = null
  #sfx = new Set<HTMLAudioElement>()
  #fadeTimers = new WeakMap<HTMLAudioElement, ReturnType<typeof setInterval>>()

  constructor(volumeController = new VolumeController()) {
    this.#volume = volumeController
  }

  playBgm(id: string, audioData: AudioPlaybackData | null): void {
    if (id === 'stop') {
      this.#stopBgm(this.#resolveFade(audioData, 'fadeOut'))
      return
    }
    if (this.#bgmId === id) return
    this.#stopBgm(this.#resolveFade(audioData, 'fadeOut'))
    const src = audioData?.file ? `./assets/${audioData.file}` : `./assets/audio/bgm/${id}.ogg`
    const audio = new Audio(src)
    audio.loop = true
    const baseVolume = audioData?.volume ?? 0.8
    const fadeIn = audioData?.restored ? 0 : this.#resolveFade(audioData, 'fadeIn')
    this.#volume.registerSource('bgm', audio, fadeIn > 0 ? 0 : baseVolume)
    void audio.play().catch(() => {})
    this.#bgm = audio
    this.#bgmId = id
    this.#bgmBaseVolume = baseVolume
    if (fadeIn > 0) this.#fadeSource('bgm', audio, 0, baseVolume, fadeIn)
  }

  playAmbience(id: string, audioData: AudioPlaybackData | null): void {
    if (id === 'stop') {
      this.#stopAmbience(this.#resolveFade(audioData, 'fadeOut'))
      return
    }
    if (this.#ambienceId === id) return
    this.#stopAmbience(this.#resolveFade(audioData, 'fadeOut'))
    const src = audioData?.file ? `./assets/${audioData.file}` : `./assets/audio/ambience/${id}.ogg`
    const audio = new Audio(src)
    audio.loop = true
    const baseVolume = audioData?.volume ?? 0.5
    const fadeIn = audioData?.restored ? 0 : this.#resolveFade(audioData, 'fadeIn')
    this.#volume.registerSource('ambience', audio, fadeIn > 0 ? 0 : baseVolume)
    void audio.play().catch(() => {})
    this.#ambience = audio
    this.#ambienceId = id
    this.#ambienceBaseVolume = baseVolume
    if (fadeIn > 0) this.#fadeSource('ambience', audio, 0, baseVolume, fadeIn)
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

  #stopBgm(fadeOut = 0): void {
    if (!this.#bgm) return
    const audio = this.#bgm
    const from = this.#bgmBaseVolume
    this.#bgm = null
    this.#bgmId = null
    this.#bgmBaseVolume = 0.8
    if (fadeOut > 0) {
      this.#fadeSource('bgm', audio, from, 0, fadeOut, () => this.#releaseSource('bgm', audio))
      return
    }
    this.#releaseSource('bgm', audio)
  }

  #stopAmbience(fadeOut = 0): void {
    if (!this.#ambience) return
    const audio = this.#ambience
    const from = this.#ambienceBaseVolume
    this.#ambience = null
    this.#ambienceId = null
    this.#ambienceBaseVolume = 0.5
    if (fadeOut > 0) {
      this.#fadeSource('ambience', audio, from, 0, fadeOut, () => this.#releaseSource('ambience', audio))
      return
    }
    this.#releaseSource('ambience', audio)
  }

  #releaseSource(channel: AudioChannel, audio: HTMLAudioElement): void {
    this.#clearFade(audio)
    this.#volume.unregisterSource(channel, audio)
    audio.pause()
    audio.src = ''
  }

  #resolveFade(audioData: AudioPlaybackData | null, key: 'fadeIn' | 'fadeOut'): number {
    const raw = audioData?.[key] ?? audioData?.fade ?? audioData?.duration ?? 0
    return Math.max(0, Number(raw) || 0)
  }

  #fadeSource(
    channel: AudioChannel,
    audio: HTMLAudioElement,
    from: number,
    to: number,
    durationSeconds: number,
    onDone?: () => void,
  ): void {
    this.#clearFade(audio)
    if (durationSeconds <= 0) {
      this.#volume.setSourceVolume(channel, audio, to)
      onDone?.()
      return
    }

    const stepMs = 50
    const steps = Math.max(1, Math.ceil(durationSeconds * 1000 / stepMs))
    let step = 0
    const timer = setInterval(() => {
      step += 1
      const t = Math.min(1, step / steps)
      this.#volume.setSourceVolume(channel, audio, from + ((to - from) * t))
      if (t >= 1) {
        this.#clearFade(audio)
        onDone?.()
      }
    }, stepMs)
    this.#fadeTimers.set(audio, timer)
  }

  #clearFade(audio: HTMLAudioElement): void {
    const timer = this.#fadeTimers.get(audio)
    if (!timer) return
    clearInterval(timer)
    this.#fadeTimers.delete(audio)
  }

  #stopVoice(): void {
    if (!this.#voice) return
    this.#volume.unregisterSource('voice', this.#voice)
    this.#voice.pause()
    this.#voice.src = ''
    this.#voice = null
  }
}
