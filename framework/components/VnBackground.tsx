import { useEffect, useRef } from 'react'

interface SceneData {
  data?: {
    background?: {
      type: 'static' | 'parallax' | 'video' | 'canvas' | 'spine' | 'three'
      image?: string
      variants?: Record<string, { image?: string }>
      defaultVariant?: string
      layers?: Array<{ image: string; depth: number }>
      intensity?: number
      src?: string
      file?: string
    }
  }
}

interface VnBackgroundProps {
  scene: { id: string; data: SceneData['data'] } | null
}

export function VnBackground({ scene }: VnBackgroundProps) {
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bgRef.current
    if (!el) return

    el.innerHTML = ''
    const bg = scene?.data?.background

    if (!bg) {
      el.style.background = '#111'
      return
    }

    const resolveImg = (path: string | undefined): string | null => {
      if (!path) return null
      if (path.startsWith('http') || path.startsWith('/')) return path
      return `./assets/${path}`
    }

    if (bg.type === 'static') {
      let img = bg.image
      if (!img && bg.variants) {
        const defaultVariant = bg.defaultVariant ?? Object.keys(bg.variants)[0]!
        img = defaultVariant ? bg.variants[defaultVariant]?.image : undefined
      }
      const div = document.createElement('div')
      div.style.cssText = 'position:absolute;inset:0;background-size:cover;background-position:center;background-repeat:no-repeat;'
      div.style.backgroundImage = img ? `url("${resolveImg(img)}")` : 'none'
      el.appendChild(div)
    } else if (bg.type === 'parallax') {
      const layers = bg.layers ?? []
      const layerEls: Array<{ el: HTMLDivElement; depth: number }> = []
      for (const layer of layers) {
        const div = document.createElement('div')
        div.style.cssText = 'position:absolute;inset:0;background-size:cover;background-position:center;background-repeat:no-repeat;will-change:transform;'
        div.style.backgroundImage = `url("${resolveImg(layer.image)}")`
        el.appendChild(div)
        layerEls.push({ el: div, depth: layer.depth ?? 1 })
      }
      const intensity = bg.intensity ?? 20
      const handler = (e: MouseEvent) => {
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2
        const dx = (e.clientX - cx) / cx, dy = (e.clientY - cy) / cy
        for (const { el: layerEl, depth } of layerEls) {
          layerEl.style.transform = `translate(${-dx * intensity * depth}px, ${-dy * intensity * depth}px)`
        }
      }
      window.addEventListener('mousemove', handler)
      return () => window.removeEventListener('mousemove', handler)
    } else if (bg.type === 'video') {
      const video = document.createElement('video')
      video.src = resolveImg(bg.src ?? bg.file) ?? ''
      video.autoplay = true
      video.loop = true
      video.muted = true
      video.playsInline = true
      video.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;'
      el.appendChild(video)
      void video.play().catch(() => {})
    }
  }, [scene])

  return (
    <div
      ref={bgRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden', background: '#111' }}
    />
  )
}
