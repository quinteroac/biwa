const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])
const AUDIO_EXTS = new Set(['mp3', 'ogg', 'wav', 'webm'])

type LoadedAsset = HTMLImageElement | HTMLAudioElement

export class AssetLoader {
  #cache = new Map<string, LoadedAsset>()
  #basePath: string

  constructor(basePath = '') {
    this.#basePath = basePath
  }

  #resolve(url: string): string {
    if (url.startsWith('http') || url.startsWith('/') || url.startsWith('./')) return url
    return this.#basePath ? `${this.#basePath}/${url}` : url
  }

  #ext(url: string): string {
    return url.split('.').pop()!.toLowerCase().split('?')[0]!
  }

  #loadOne(url: string): Promise<LoadedAsset> {
    const resolved = this.#resolve(url)
    if (this.#cache.has(resolved)) return Promise.resolve(this.#cache.get(resolved)!)

    const ext = this.#ext(resolved)
    return new Promise((resolve, reject) => {
      if (IMAGE_EXTS.has(ext)) {
        const img = new Image()
        img.onload = () => { this.#cache.set(resolved, img); resolve(img) }
        img.onerror = reject
        img.src = resolved
      } else if (AUDIO_EXTS.has(ext)) {
        const audio = new Audio()
        audio.oncanplaythrough = () => { this.#cache.set(resolved, audio); resolve(audio) }
        audio.onerror = reject
        audio.src = resolved
      } else {
        reject(new Error(`Unsupported asset type: ${ext}`))
      }
    })
  }

  async preload(
    urls: string[],
    onProgress?: (progress: number, url: string) => void,
  ): Promise<PromiseSettledResult<LoadedAsset>[]> {
    let done = 0
    const total = urls.length
    return Promise.allSettled(
      urls.map(url => this.#loadOne(url).then(asset => {
        done++
        onProgress?.(done / total, url)
        return asset
      }))
    )
  }

  get(url: string): LoadedAsset | undefined {
    return this.#cache.get(this.#resolve(url))
  }

  has(url: string): boolean {
    return this.#cache.has(this.#resolve(url))
  }

  clear(): void {
    this.#cache.clear()
  }
}
