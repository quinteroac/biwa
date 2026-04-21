import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

const TYPE_MS = 30

export interface DialogOptions {
  text: string
  speaker?: string | null
  nameColor?: string | null
  canContinue: boolean
  advanceMode: 'none' | 'next' | 'choices'
}

export interface VnDialogHandle {
  readonly isTyping: boolean
  skip: () => void
}

interface VnDialogProps {
  dialog: DialogOptions | null
  onComplete: (advanceMode: DialogOptions['advanceMode']) => void
}

export const VnDialog = forwardRef<VnDialogHandle, VnDialogProps>(function VnDialog({ dialog, onComplete }, ref) {
  const [revealedLen, setRevealedLen] = useState(0)
  const typingRef = useRef(false)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const charsRef  = useRef<string[]>([])

  const finishTyping = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    typingRef.current = false
    setRevealedLen(charsRef.current.length)
  }, [])

  const skip = useCallback(() => {
    if (!typingRef.current) return
    finishTyping()
    onComplete(dialog?.advanceMode ?? 'none')
  }, [finishTyping, dialog, onComplete])

  useImperativeHandle(ref, () => ({
    get isTyping() { return typingRef.current },
    skip,
  }), [skip])

  useEffect(() => {
    if (!dialog) return

    if (timerRef.current !== null) clearTimeout(timerRef.current)
    const chars = [...dialog.text]
    charsRef.current = chars
    setRevealedLen(0)

    if (dialog.advanceMode === 'choices') {
      typingRef.current = false
      setRevealedLen(chars.length)
      onComplete(dialog.advanceMode)
      return
    }

    typingRef.current = true
    let i = 0
    const tick = () => {
      i++
      setRevealedLen(i)
      if (i >= chars.length) {
        typingRef.current = false
        onComplete(dialog.advanceMode)
        return
      }
      timerRef.current = setTimeout(tick, TYPE_MS)
    }
    timerRef.current = setTimeout(tick, TYPE_MS)

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      typingRef.current = false
    }
  }, [dialog])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!dialog) return null

  const chars = [...dialog.text]
  const revealed  = chars.slice(0, revealedLen).join('')
  const ghost     = chars.slice(revealedLen).join('')
  const isComplete = revealedLen >= chars.length

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      display: 'flex', justifyContent: 'center',
      padding: 24,
      pointerEvents: 'none',
    }}>
      <div style={{
        width: '100%', maxWidth: 900,
        background: 'var(--vn-dialog-bg, rgba(10,10,20,0.85))',
        borderRadius: 12,
        padding: '20px 24px',
        fontFamily: 'var(--vn-font, "Georgia", serif)',
      }}>
        {dialog.speaker && (
          <div style={{
            fontSize: 16, fontWeight: 'bold', marginBottom: 8,
            color: dialog.nameColor ?? 'var(--vn-name-color, #e2e8f0)',
          }}>
            {dialog.speaker}
          </div>
        )}
        <div style={{ fontSize: '1.1rem', lineHeight: 1.7, color: '#f8f8f8', minHeight: '3.4em' }}>
          <span>{revealed}</span>
          <span style={{ color: 'transparent', userSelect: 'none' }}>{ghost}</span>
        </div>
        {isComplete && (
          <div style={{
            textAlign: 'right',
            color: 'var(--vn-accent, #c084fc)',
            fontSize: 19,
            animation: 'vn-bounce 0.8s ease-in-out infinite',
            marginTop: 4,
          }}>▼</div>
        )}
      </div>
    </div>
  )
})
