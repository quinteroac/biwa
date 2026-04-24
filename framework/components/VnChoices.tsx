import { useEffect, useState } from 'react'
import type { StepChoice } from '../engine/ScriptRunner.ts'

interface VnChoicesProps {
  choices: StepChoice[]
  onChoose: (index: number) => void
}

export function VnChoices({ choices, onChoose }: VnChoicesProps) {
  const [focused, setFocused] = useState(0)

  useEffect(() => {
    setFocused(0)
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocused(f => (f + 1) % choices.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocused(f => (f <= 0 ? choices.length - 1 : f - 1))
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setFocused(f => { onChoose(choices[f]!.index); return f })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [choices, onChoose])

  return (
    <div
      style={{
        position: 'absolute', top: '50%', left: 0, right: 0,
        transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '0 64px', gap: 20,
        zIndex: 10,
      }}
    >
      {choices.map((choice, i) => (
        <button
          key={choice.index}
          onClick={(e) => { e.stopPropagation(); onChoose(choice.index) }}
          onMouseEnter={() => setFocused(i)}
          style={{
            width: '100%', maxWidth: 600,
            padding: '14px 24px',
            background: i === focused ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.62)',
            color: i === focused ? '#ffffff' : '#e5e2e1',
            border: i === focused ? '1px solid rgba(255,255,255,0.45)' : '1px solid rgba(255,255,255,0.18)',
            borderRadius: 0,
            fontSize: 14,
            fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
            fontWeight: 300,
            letterSpacing: '0.02em',
            lineHeight: 1.6,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'color 0.1s linear, border-color 0.1s linear',
          }}
        >
          {choice.text}
        </button>
      ))}
    </div>
  )
}
