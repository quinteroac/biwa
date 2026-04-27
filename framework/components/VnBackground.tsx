import { useEffect, useRef } from 'react'

type BackgroundFit = 'cover' | 'contain' | 'fill'

export interface BackgroundVariant {
  image?: string
  fit?: BackgroundFit
  position?: string
  layers?: Array<{ image: string; depth: number; fit?: BackgroundFit }>
  intensity?: number
}

export interface BackgroundConfig extends BackgroundVariant {
  type: 'static' | 'parallax' | 'video' | 'canvas' | 'spine' | 'three'
  poster?: string
  variants?: Record<string, BackgroundVariant>
  defaultVariant?: string
  src?: string
  file?: string
}

interface SceneData {
  data?: {
    background?: BackgroundConfig
  }
}

export interface VnBackgroundProps {
  scene: { id: string; data: SceneData['data']; variant?: string } | null
}

function resolveAsset(path: string | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http') || path.startsWith('/')) return path
  return `./assets/${path}`
}

export function backgroundSizeForFit(fit: BackgroundFit | undefined): string {
  return fit === 'fill' ? '100% 100%' : fit ?? 'cover'
}

export function objectFitForFit(fit: BackgroundFit | undefined): string {
  return fit ?? 'cover'
}

export function selectBackgroundVariant(
  bg: { variants?: Record<string, BackgroundVariant>; defaultVariant?: string },
  requestedVariant?: string,
): BackgroundVariant {
  if (!bg.variants) return {}
  const variantKey = requestedVariant ?? bg.defaultVariant ?? Object.keys(bg.variants)[0]
  return variantKey ? (bg.variants[variantKey] ?? {}) : {}
}

function renderUnsupportedBackground(el: HTMLDivElement, type: string): void {
  const fallback = document.createElement('div')
  fallback.style.cssText = [
    'position:absolute',
    'inset:0',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:#111',
    'color:rgba(229,226,225,0.62)',
    'font:11px var(--vn-font, "Manrope", sans-serif)',
    'letter-spacing:0.18em',
    'text-transform:uppercase',
  ].join(';')
  fallback.textContent = `Unsupported background renderer: ${type}`
  el.appendChild(fallback)
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

    if (bg.type === 'static') {
      const selected = selectBackgroundVariant(bg, scene?.variant)
      const img = selected.image ?? bg.image
      const div = document.createElement('div')
      div.style.cssText = [
        'position:absolute',
        'inset:0',
        `background-size:${backgroundSizeForFit(selected.fit ?? bg.fit)}`,
        `background-position:${selected.position ?? bg.position ?? 'center'}`,
        'background-repeat:no-repeat',
      ].join(';')
      div.style.backgroundImage = img ? `url("${resolveAsset(img)}")` : 'none'
      el.appendChild(div)
    } else if (bg.type === 'parallax') {
      const selected = selectBackgroundVariant(bg, scene?.variant)
      const layers = selected.layers ?? bg.layers ?? []
      const layerEls: Array<{ el: HTMLDivElement; depth: number }> = []
      for (const layer of layers) {
        const div = document.createElement('div')
        div.style.cssText = [
          'position:absolute',
          'inset:0',
          `background-size:${backgroundSizeForFit(layer.fit)}`,
          'background-position:center',
          'background-repeat:no-repeat',
          'will-change:transform',
        ].join(';')
        div.style.backgroundImage = `url("${resolveAsset(layer.image)}")`
        el.appendChild(div)
        layerEls.push({ el: div, depth: layer.depth ?? 1 })
      }
      const intensity = selected.intensity ?? bg.intensity ?? 20
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
      video.src = resolveAsset(bg.src ?? bg.file) ?? ''
      const poster = resolveAsset(bg.poster)
      if (poster) video.poster = poster
      video.autoplay = true
      video.loop = true
      video.muted = true
      video.playsInline = true
      video.style.cssText = `width:100%;height:100%;object-fit:${objectFitForFit(bg.fit)};position:absolute;inset:0;`
      el.appendChild(video)
      void video.play().catch(() => {})
    } else {
      renderUnsupportedBackground(el, bg.type)
    }
  }, [scene])

  return (
    <div
      ref={bgRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden', background: '#111' }}
    />
  )
}
