import { useEffect, useRef } from 'react'

interface TransitionConfig {
  type?: 'fade' | 'fade-color' | 'slide' | 'wipe' | 'cut'
  duration?: number
  color?: string
  direction?: 'left' | 'right' | 'up' | 'down'
}

interface VnTransitionProps {
  config: TransitionConfig
  onDone: () => void
}

export function VnTransition({ config, onDone }: VnTransitionProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ov = overlayRef.current
    if (!config || !ov) return
    void runTransition(ov, config).then(onDone)
  }, [config])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none' }}>
      <div ref={overlayRef} style={{ position: 'absolute', inset: 0, opacity: 0, background: '#000', willChange: 'opacity, transform' }} />
    </div>
  )
}

function animate(el: HTMLElement, props: Record<string, string>, durationSec: number): Promise<void> {
  return new Promise(resolve => {
    const keyframe: Keyframe = {}
    for (const [k, v] of Object.entries(props)) {
      (keyframe as Record<string, string>)[k] = v
    }
    const anim = el.animate([keyframe], { duration: durationSec * 1000, fill: 'forwards', easing: 'ease-in-out' })
    anim.onfinish = () => {
      for (const [k, v] of Object.entries(props)) {
        (el.style as unknown as Record<string, string>)[k] = v
      }
      resolve()
    }
  })
}

async function runTransition(ov: HTMLElement, config: TransitionConfig): Promise<void> {
  const { type = 'fade', duration = 0.5, color = '#000', direction = 'left' } = config
  ov.style.background = color
  ov.style.opacity = '0'
  ov.style.transform = 'none'

  if (type === 'cut') return

  if (type === 'fade' || type === 'fade-color') {
    await animate(ov, { opacity: '1' }, duration / 2)
    await animate(ov, { opacity: '0' }, duration / 2)
  } else if (type === 'slide') {
    const axis = direction === 'up' || direction === 'down' ? 'Y' : 'X'
    const sign = direction === 'right' || direction === 'down' ? '-' : ''
    ov.style.opacity = '1'
    ov.style.transform = `translate${axis}(${sign}100%)`
    await animate(ov, { transform: 'translate(0,0)' }, duration / 2)
    await animate(ov, { transform: `translate${axis}(${sign === '' ? '-' : ''}100%)` }, duration / 2)
    ov.style.opacity = '0'
  } else if (type === 'wipe') {
    ov.style.opacity = '1'
    ov.style.clipPath = 'inset(0 100% 0 0)'
    await animate(ov, { clipPath: 'inset(0 0% 0 0)' }, duration / 2)
    await animate(ov, { clipPath: 'inset(0 0 0 100%)' }, duration / 2)
    ov.style.opacity = '0'
    ov.style.clipPath = 'none'
  }
}
