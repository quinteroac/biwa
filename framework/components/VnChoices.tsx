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
        padding: 24, gap: 10,
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
            padding: '12px 20px',
            background: i === focused ? 'var(--vn-choice-hover, rgba(192,132,252,0.15))' : 'var(--vn-dialog-bg, rgba(10,10,20,0.85))',
            color: 'var(--vn-dialog-text, #f8f8f8)',
            border: '1px solid var(--vn-accent, #c084fc)',
            borderRadius: 8,
            fontSize: 16,
            fontFamily: 'var(--vn-font, "Georgia", serif)',
            cursor: 'pointer',
            textAlign: 'left',
            transform: i === focused ? 'translateX(4px)' : 'none',
            transition: 'background 0.15s, transform 0.15s',
          }}
        >
          {choice.text}
        </button>
      ))}
    </div>
  )
}
