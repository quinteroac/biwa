import { useEffect, useMemo } from 'react'

export interface VnEffectState {
  key: string
  type: string
  persistent?: boolean
  params: Record<string, unknown>
}

export interface VnEffectsLayerProps {
  effects: VnEffectState[]
  reduceMotion?: boolean
}

function numberParam(params: Record<string, unknown>, key: string, fallback: number): number {
  const value = params[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function stringParam(params: Record<string, unknown>, key: string, fallback: string): string {
  const value = params[key]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function boolParam(params: Record<string, unknown>, key: string, fallback = false): boolean {
  const value = params[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['true', 'yes', '1'].includes(value.toLowerCase())
  return fallback
}

export function effectDurationMs(params: Record<string, unknown>, fallback = 600): number {
  const value = params['duration'] ?? params['time']
  if (typeof value === 'number' && Number.isFinite(value)) return value > 10 ? value : value * 1000
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed > 10 ? parsed : parsed * 1000
  }
  return fallback
}

function ScreenEffect({ effect, reduceMotion }: { effect: VnEffectState; reduceMotion: boolean }) {
  const { type, params } = effect
  const duration = effectDurationMs(params)
  const intensity = numberParam(params, 'intensity', 0.5)
  const color = stringParam(params, 'color', '#fff')
  const strength = numberParam(params, 'strength', intensity)

  if (type === 'flash') {
    return (
      <div
        data-vn-effect="flash"
        style={{
          position: 'absolute',
          inset: 0,
          background: color,
          opacity: Math.min(1, Math.max(0, strength)),
          animation: reduceMotion ? undefined : `vn-effect-fade-out ${duration}ms ease-out forwards`,
        }}
      />
    )
  }

  if (type === 'shake') {
    const distance = Math.round(18 * Math.min(1, Math.max(0, intensity)))
    return (
      <div
        data-vn-effect="shake"
        style={{
          position: 'absolute',
          inset: 0,
          outline: `${distance}px solid transparent`,
          animation: reduceMotion ? undefined : `vn-effect-shake ${duration}ms ease-in-out forwards`,
          ['--vn-effect-shake-distance' as string]: `${distance}px`,
        }}
      />
    )
  }

  if (type === 'vignette') {
    return (
      <div
        data-vn-effect="vignette"
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at center, transparent 42%, rgba(0,0,0,${Math.min(0.9, 0.35 + strength * 0.45)}) 100%)`,
          opacity: effect.persistent ? 1 : undefined,
          animation: effect.persistent || reduceMotion ? undefined : `vn-effect-fade-out ${duration}ms ease-out forwards`,
        }}
      />
    )
  }

  if (type === 'blur' || type === 'desaturate' || type === 'pulse' || type === 'heartbeat') {
    const blur = type === 'blur' ? numberParam(params, 'amount', 4) : 0
    const saturate = type === 'desaturate' ? Math.max(0, 1 - strength) : 1
    const opacity = type === 'pulse' || type === 'heartbeat' ? Math.min(0.5, 0.16 + strength * 0.3) : 0.16
    return (
      <div
        data-vn-effect={type}
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: `blur(${blur}px) saturate(${saturate})`,
          background: type === 'heartbeat' ? 'rgba(130,0,24,0.22)' : `rgba(255,255,255,${opacity})`,
          animation: effect.persistent || reduceMotion ? undefined : `vn-effect-pulse ${duration}ms ease-in-out forwards`,
        }}
      />
    )
  }

  if (type === 'rain') {
    const opacity = numberParam(params, 'opacity', 0.34)
    const speed = numberParam(params, 'speed', 8)
    const skew = numberParam(params, 'angle', -12)
    return (
      <div
        data-vn-effect="rain"
        style={{
          position: 'absolute',
          inset: '-12%',
          opacity,
          mixBlendMode: 'screen',
          transform: `skewX(${skew}deg)`,
          animation: reduceMotion ? undefined : `vn-effect-rain-drift ${speed}s linear infinite`,
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: [
            'repeating-linear-gradient(105deg, rgba(255,255,255,.72) 0 1px, transparent 1px 13px)',
            'repeating-linear-gradient(103deg, rgba(190,215,255,.38) 0 1px, transparent 1px 19px)',
          ].join(','),
          backgroundSize: '84px 122px, 131px 181px',
          backgroundPosition: '0 0, 37px 53px',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.72,
          backgroundImage: [
            'repeating-linear-gradient(100deg, rgba(255,255,255,.48) 0 1px, transparent 1px 23px)',
            'repeating-linear-gradient(112deg, rgba(160,190,255,.26) 0 1px, transparent 1px 31px)',
          ].join(','),
          backgroundSize: '153px 217px, 97px 151px',
          backgroundPosition: '61px 89px, 19px 31px',
          animation: reduceMotion ? undefined : `vn-effect-rain-drift ${Math.max(2, speed * 0.72)}s linear infinite reverse`,
        }} />
      </div>
    )
  }

  if (type === 'snow' || type === 'dust' || type === 'fog') {
    const opacity = numberParam(params, 'opacity', type === 'fog' ? 0.32 : 0.24)
    const speed = numberParam(params, 'speed', type === 'snow' ? 12 : 8)
    const background = type === 'fog'
      ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)'
      : 'radial-gradient(circle, rgba(255,255,255,.8) 0 1px, transparent 1px)'
    return (
      <div
        data-vn-effect={type}
        style={{
          position: 'absolute',
          inset: '-10%',
          opacity,
          backgroundImage: background,
          backgroundSize: type === 'fog' ? '60% 100%' : '34px 34px',
          filter: type === 'fog' ? 'blur(14px)' : undefined,
          animation: reduceMotion ? undefined : `vn-effect-drift ${speed}s linear infinite`,
        }}
      />
    )
  }

  if (boolParam(params, 'debug')) {
    return <div data-vn-effect={type} />
  }

  return null
}

export function VnEffectsLayer({ effects, reduceMotion }: VnEffectsLayerProps) {
  const visibleEffects = useMemo(() => effects.filter(effect => effect.type.length > 0), [effects])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (document.getElementById('vn-effects-layer-styles')) return
    const style = document.createElement('style')
    style.id = 'vn-effects-layer-styles'
    style.textContent = `
      @keyframes vn-effect-fade-out { from { opacity: var(--vn-effect-opacity, 1); } to { opacity: 0; } }
      @keyframes vn-effect-shake {
        0%, 100% { transform: translate(0, 0); }
        20% { transform: translate(var(--vn-effect-shake-distance), calc(var(--vn-effect-shake-distance) * -0.45)); }
        40% { transform: translate(calc(var(--vn-effect-shake-distance) * -0.8), calc(var(--vn-effect-shake-distance) * 0.35)); }
        60% { transform: translate(calc(var(--vn-effect-shake-distance) * 0.55), calc(var(--vn-effect-shake-distance) * 0.3)); }
        80% { transform: translate(calc(var(--vn-effect-shake-distance) * -0.35), calc(var(--vn-effect-shake-distance) * -0.2)); }
      }
      @keyframes vn-effect-pulse { 0%, 100% { opacity: 0; } 38%, 70% { opacity: 1; } }
      @keyframes vn-effect-drift { from { transform: translate3d(0, -6%, 0); } to { transform: translate3d(-6%, 6%, 0); } }
      @keyframes vn-effect-rain-drift { from { background-position: 0 0; transform: translate3d(0, -8%, 0); } to { background-position: -80px 180px; transform: translate3d(-4%, 8%, 0); } }
    `
    document.head.appendChild(style)
  }, [])

  if (visibleEffects.length === 0) return null

  return (
    <div
      data-testid="vn-effects-layer"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 35 }}
    >
      {visibleEffects.map(effect => (
        <ScreenEffect key={effect.key} effect={effect} reduceMotion={Boolean(reduceMotion)} />
      ))}
    </div>
  )
}
