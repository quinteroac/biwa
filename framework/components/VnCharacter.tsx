import { useEffect, useRef, useState } from 'react'

interface AsepriteFrame {
  frame: { x: number; y: number; w: number; h: number }
  duration: number
}

interface AsepriteAtlas {
  frames: Record<string, AsepriteFrame>
  meta: {
    frameTags: Array<{ name: string; from: number; to: number }>
  }
}

interface CharacterLayer {
  id: string
  animation: {
    type: string
    sprites?: Record<string, string>
  }
  default: string
}

interface CharacterData {
  displayName?: string
  nameColor?: string
  animation?: {
    type: string
    sprites?: Record<string, string>
    file?: string
    atlas?: string
    expressions?: Record<string, string>
  }
  layers?: CharacterLayer[]
}

interface VnCharacterProps {
  id: string
  charData: CharacterData | null
  position: 'left' | 'center' | 'right'
  expression: string
  exiting: boolean
  onExited: (id: string) => void
}

function SpritesheetRenderer({ file, atlas, expression, expressions }: {
  file: string
  atlas: string
  expression: string
  expressions: Record<string, string>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef    = useRef<HTMLImageElement | null>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const [atlasData, setAtlasData] = useState<AsepriteAtlas | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`./assets/${atlas}`)
      .then(r => r.json())
      .then((data: AsepriteAtlas) => { if (!cancelled) setAtlasData(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [atlas])

  useEffect(() => {
    const img = new Image()
    img.src = `./assets/${file}`
    imgRef.current = img
  }, [file])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!atlasData || !canvasRef.current) return

    const animName = expressions[expression] ?? expressions['neutral'] ?? Object.values(expressions)[0]
    if (!animName) return
    const tag = atlasData.meta.frameTags.find(t => t.name === animName)
    if (!tag) return

    const frameKeys  = Object.keys(atlasData.frames)
    const frameCount = tag.to - tag.from + 1
    let currentFrame = 0

    const drawFrame = (img: HTMLImageElement, frameIdx: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const frameKey = frameKeys[tag.from + frameIdx]
      if (!frameKey) return
      const frameData = atlasData.frames[frameKey]
      if (!frameData) return
      const { x, y, w, h } = frameData.frame
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h)
    }

    const startAnimation = (img: HTMLImageElement) => {
      drawFrame(img, 0)
      if (frameCount > 1) {
        const firstFrameKey = frameKeys[tag.from]
        const duration = firstFrameKey ? atlasData.frames[firstFrameKey]?.duration ?? 100 : 100
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

  let spriteSrc: string | null = null
  if (anim?.type === 'sprites' && anim.sprites) {
    const sprites = anim.sprites
    const path = sprites[expression] ?? sprites['neutral'] ?? Object.values(sprites)[0]
    if (path) spriteSrc = `./assets/${path}`
  }

  const visible = entered && !exiting

  let posStyle: React.CSSProperties
  if (position === 'left') {
    posStyle = { left: '2%', right: 'auto', transform: visible ? 'translateY(0)' : 'translateY(20px)' }
  } else if (position === 'right') {
    posStyle = { left: 'auto', right: '2%', transform: visible ? 'translateY(0)' : 'translateY(20px)' }
  } else {
    posStyle = { left: '50%', right: 'auto', transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)' }
  }

  return (
    <div style={{
      position: 'absolute', bottom: 0,
      width: '40%', maxWidth: 480,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      ...posStyle,
    }}>
      {anim?.type === 'spritesheet' && anim.file && anim.atlas && anim.expressions && (
        <SpritesheetRenderer
          file={anim.file}
          atlas={anim.atlas}
          expression={expression}
          expressions={anim.expressions}
        />
      )}
      {spriteSrc && (
        <img
          src={spriteSrc}
          alt={`${charData?.displayName ?? id} - ${expression}`}
          style={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none' }}
        />
      )}
      {layers && layers.length > 0 && (() => {
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
