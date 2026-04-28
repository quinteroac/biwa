import { useEffect, useRef, useState } from 'react'
import { getAsepriteFrameItems, getAsepriteFrameTags } from '../engine/AsepriteAtlas.ts'
import { defaultRendererRegistry } from '../renderers/RendererRegistry.ts'
import type { AsepriteAtlas } from '../engine/AsepriteAtlas.ts'

interface CharacterLayer {
  id: string
  animation: {
    type: string
    sprites?: Record<string, string>
  }
  default: string
}

export interface CharacterData {
  displayName?: string
  nameColor?: string
  defaultPosition?: 'left' | 'center' | 'right'
  defaultExpression?: string
  scale?: number
  offset?: { x?: number; y?: number }
  animation?: {
    type: string
    sprites?: Record<string, string>
    file?: string
    atlas?: string
    expressions?: Record<string, string>
  }
  layers?: CharacterLayer[]
}

export interface VnCharacterProps {
  id: string
  charData: CharacterData | null
  position: 'left' | 'center' | 'right'
  expression: string
  exiting: boolean
  onExited: (id: string) => void
}

export function AsepriteSpritesheetRenderer({ file, atlas, expression, expressions, assetBase = './assets/' }: {
  file: string
  atlas: string
  expression: string
  expressions: Record<string, string>
  assetBase?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef    = useRef<HTMLImageElement | null>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const [atlasData, setAtlasData] = useState<AsepriteAtlas | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${assetBase}${atlas}`)
      .then(r => r.json())
      .then((data: AsepriteAtlas) => { if (!cancelled) setAtlasData(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [assetBase, atlas])

  useEffect(() => {
    const img = new Image()
    img.src = `${assetBase}${file}`
    imgRef.current = img
  }, [assetBase, file])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!atlasData || !canvasRef.current) return

    const animName = expressions[expression] ?? expressions['neutral'] ?? Object.values(expressions)[0]
    if (!animName) return
    const tags = getAsepriteFrameTags(atlasData)
    const tag = tags.find(t => t.name === animName)
    if (!tag) return

    const frames = getAsepriteFrameItems(atlasData)
    const frameCount = tag.to - tag.from + 1
    let currentFrame = 0

    const drawFrame = (img: HTMLImageElement, frameIdx: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const frameItem = frames[tag.from + frameIdx]
      if (!frameItem) return
      const { x, y, w, h } = frameItem
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h)
    }

    const startAnimation = (img: HTMLImageElement) => {
      drawFrame(img, 0)
      if (frameCount > 1) {
        const duration = frames[tag.from]?.frame.duration ?? 100
        timerRef.current = setInterval(() => {
          currentFrame = (currentFrame + 1) % frameCount
          drawFrame(img, currentFrame)
        }, duration)
      }
    }

    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      startAnimation(imgRef.current)
    } else if (imgRef.current) {
      imgRef.current.onload = () => { startAnimation(imgRef.current!) }
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [atlasData, expression, expressions])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none' }}
    />
  )
}

export function VnCharacter({ id, charData, position, expression, exiting, onExited }: VnCharacterProps) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!exiting) return
    const timer = setTimeout(() => onExited(id), 400)
    return () => clearTimeout(timer)
  }, [exiting, id, onExited])

  const anim   = charData?.animation
  const layers = charData?.layers
  const externalRenderer = anim ? defaultRendererRegistry.get('character', anim.type) : undefined

  let spriteSrc: string | null = null
  if (anim?.type === 'sprites' && anim.sprites) {
    const sprites = anim.sprites
    const path = sprites[expression] ?? sprites['neutral'] ?? Object.values(sprites)[0]
    if (path) spriteSrc = `./assets/${path}`
  }

  const visible = entered && !exiting
  const scale = charData?.scale ?? 1
  const offsetX = charData?.offset?.x ?? 0
  const offsetY = charData?.offset?.y ?? 0

  let posStyle: React.CSSProperties
  if (position === 'left') {
    posStyle = {
      left: `calc(2% + ${offsetX}px)`,
      right: 'auto',
      transform: visible ? `translateY(${offsetY}px) scale(${scale})` : `translateY(${offsetY + 20}px) scale(${scale})`,
    }
  } else if (position === 'right') {
    posStyle = {
      left: 'auto',
      right: `calc(2% - ${offsetX}px)`,
      transform: visible ? `translateY(${offsetY}px) scale(${scale})` : `translateY(${offsetY + 20}px) scale(${scale})`,
    }
  } else {
    posStyle = {
      left: `calc(50% + ${offsetX}px)`,
      right: 'auto',
      transform: visible ? `translateX(-50%) translateY(${offsetY}px) scale(${scale})` : `translateX(-50%) translateY(${offsetY + 20}px) scale(${scale})`,
    }
  }

  const unsupportedAnimationType = anim && !['sprites', 'spritesheet'].includes(anim.type) && (!layers || layers.length === 0)

  return (
    <div style={{
      position: 'absolute', bottom: 0,
      width: '40%', maxWidth: 480,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      ...posStyle,
    }}>
      {anim && externalRenderer && (() => {
        const ExternalCharacter = externalRenderer.component
        return (
          <ExternalCharacter
            id={id}
            charData={charData as Record<string, unknown> | null}
            animation={anim as unknown as Record<string, unknown>}
            position={position}
            expression={expression}
            exiting={exiting}
            assetBase="./assets/"
            onExited={onExited}
          />
        )
      })()}
      {!externalRenderer && anim?.type === 'spritesheet' && anim.file && anim.atlas && anim.expressions && (
        <AsepriteSpritesheetRenderer
          file={anim.file}
          atlas={anim.atlas}
          expression={expression}
          expressions={anim.expressions}
        />
      )}
      {!externalRenderer && spriteSrc && (
        <img
          src={spriteSrc}
          alt={`${charData?.displayName ?? id} - ${expression}`}
          style={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none' }}
        />
      )}
      {!externalRenderer && unsupportedAnimationType && (
        <div
          data-testid="vn-character-renderer-fallback"
          style={{
            minHeight: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.16)',
            color: 'rgba(229,226,225,0.62)',
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            background: 'rgba(0,0,0,0.28)',
          }}
        >
          Unsupported character renderer: {anim.type}
        </div>
      )}
      {!externalRenderer && layers && layers.length > 0 && (() => {
        const layerImgs = layers.flatMap(layer => {
          const sprites = layer.animation?.sprites
          if (!sprites) return []
          const path = sprites[expression] ?? sprites[layer.default] ?? Object.values(sprites)[0]
          if (!path) return []
          return [<img
            key={layer.id}
            src={`./assets/${path}`}
            alt={`${charData?.displayName ?? id} - ${layer.id}`}
            style={{ display: 'block', position: 'absolute', bottom: 0, left: 0, width: '100%', height: 'auto', userSelect: 'none' }}
          />]
        })
        if (layerImgs.length === 0) return null
        return (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 2' }}>
            {layerImgs}
          </div>
        )
      })()}
    </div>
  )
}
