import { describe, expect, it } from 'bun:test'
import {
  backgroundSizeForFit,
  objectFitForFit,
  selectBackgroundVariant,
} from '../VnBackground.tsx'

describe('VnBackground helpers', () => {
  it('maps background fit values to CSS background-size', () => {
    expect(backgroundSizeForFit(undefined)).toBe('cover')
    expect(backgroundSizeForFit('cover')).toBe('cover')
    expect(backgroundSizeForFit('contain')).toBe('contain')
    expect(backgroundSizeForFit('fill')).toBe('100% 100%')
  })

  it('maps fit values to valid object-fit values for video', () => {
    expect(objectFitForFit(undefined)).toBe('cover')
    expect(objectFitForFit('fill')).toBe('fill')
  })

  it('selects requested variants before default variants', () => {
    const bg = {
      type: 'static',
      defaultVariant: 'day',
      image: 'fallback.png',
      variants: {
        day: { image: 'day.png' },
        night: { image: 'night.png' },
      },
    }
    expect(selectBackgroundVariant(bg, 'night').image).toBe('night.png')
    expect(selectBackgroundVariant(bg).image).toBe('day.png')
  })
})
