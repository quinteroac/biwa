import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { DIALOG_TYPE_MS, createDialogRevealPlan, getDialogCompletionAdvanceMode } from './DialogReveal.ts'

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
    const completionAdvanceMode = getDialogCompletionAdvanceMode(dialog?.advanceMode ?? 'none')
    if (completionAdvanceMode) onComplete(completionAdvanceMode)
  }, [finishTyping, dialog, onComplete])

  useImperativeHandle(ref, () => ({
    get isTyping() { return typingRef.current },
    skip,
  }), [skip])

  useEffect(() => {
    if (!dialog) return

    if (timerRef.current !== null) clearTimeout(timerRef.current)
    const plan = createDialogRevealPlan(dialog.text, dialog.advanceMode)
    const chars = plan.characters
    charsRef.current = chars
    setRevealedLen(plan.initialRevealedLen)

    if (!plan.isTyping) {
      typingRef.current = false
      if (plan.completionAdvanceMode) onComplete(plan.completionAdvanceMode)
      return
    }

    typingRef.current = true
    let i = 0
    const tick = () => {
      i++
      setRevealedLen(i)
      if (i >= chars.length) {
        typingRef.current = false
        if (plan.completionAdvanceMode) onComplete(plan.completionAdvanceMode)
        return
      }
      timerRef.current = setTimeout(tick, DIALOG_TYPE_MS)
    }
    timerRef.current = setTimeout(tick, DIALOG_TYPE_MS)

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
      display: 'flex', justifyContent: 'center',
      padding: '0 64px 24px',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: '100%', maxWidth: 900,
        background: 'rgba(0,0,0,0.65)',
        borderTop: '0.5px solid rgba(255,255,255,0.15)',
        padding: '20px 24px 8px',
        fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
      }}>
        {dialog.speaker && (
          <div style={{
            fontSize: 11,
            fontWeight: 500,
            marginBottom: 12,
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            lineHeight: 1,
          }}>
            {dialog.speaker}
          </div>
        )}
        <div style={{
          fontSize: 18,
          fontWeight: 300,
          lineHeight: 1.8,
          letterSpacing: '0.01em',
          color: '#e5e2e1',
          minHeight: '3.6em',
        }}>
          <span>{revealed}</span>
          <span style={{ color: 'transparent', userSelect: 'none' }}>{ghost}</span>
        </div>
        {isComplete && (
          <div style={{
            textAlign: 'right',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 12,
            marginTop: 4,
            letterSpacing: '0.1em',
          }}>›</div>
        )}
      </div>
    </div>
  )
})
