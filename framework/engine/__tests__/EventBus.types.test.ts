import { describe, expect, it } from 'bun:test'
import { EventBus } from '../EventBus.ts'
import type { EngineEventMap } from '../../types/events.d.ts'

describe('EventBus typed events', () => {
  it('delivers typed engine dialog payloads', () => {
    const bus = new EventBus<EngineEventMap>()
    let text = ''

    bus.on('engine:dialog', event => {
      text = event.text
    })

    bus.emit('engine:dialog', {
      text: 'Hello',
      speaker: 'Kai',
      nameColor: null,
      canContinue: true,
      advanceMode: 'none',
    })

    expect(text).toBe('Hello')
  })
})
