import { describe, expect, it } from 'bun:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { VnBacklog } from '../VnBacklog.tsx'
import type { BacklogEntry } from '../../types/save.d.ts'

const entries: BacklogEntry[] = [
  {
    index: 1,
    speaker: 'Kai',
    text: 'The rain keeps its own rhythm.',
    timestamp: 1,
    voice: { type: 'voice', id: 'kai_ch01_001', file: 'audio/voice/kai/kai_ch01_001.ogg' },
  },
  {
    index: 2,
    speaker: 'Sara',
    text: 'Then listen closely.',
    timestamp: 2,
  },
]

describe('VnBacklog', () => {
  it('renders search and speaker filter controls', () => {
    const html = renderToString(createElement(VnBacklog, {
      isOpen: true,
      entries,
      onClose: () => {},
    }))

    expect(html).toContain('type="search"')
    expect(html).toContain('All speakers')
    expect(html).toContain('Kai')
    expect(html).toContain('Sara')
  })

  it('renders voice replay controls for voiced entries', () => {
    const html = renderToString(createElement(VnBacklog, {
      isOpen: true,
      entries,
      onClose: () => {},
      onReplayVoice: () => {},
    }))

    expect(html).toContain('Replay')
  })
})
