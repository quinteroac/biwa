import { useEffect, useState } from 'react'

interface CharacterData {
  displayName?: string
  nameColor?: string
  animation?: {
    type: string
    sprites?: Record<string, string>
  }
}

interface VnCharacterProps {
  id: string
  charData: CharacterData | null
  position: 'left' | 'center' | 'right'
  expression: string
  exiting: boolean
  onExited: (id: string) => void
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

  const anim = charData?.animation
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
      {spriteSrc && (
        <img
          src={spriteSrc}
          alt={`${charData?.displayName ?? id} - ${expression}`}
          style={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none' }}
        />
      )}
    </div>
  )
}
