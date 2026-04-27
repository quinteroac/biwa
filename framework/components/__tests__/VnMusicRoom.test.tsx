import { describe, expect, it } from 'bun:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { VnMusicRoom } from '../VnMusicRoom.tsx'

describe('VnMusicRoom', () => {
  it('renders unlocked tracks and replay status', () => {
    const html = renderToString(createElement(VnMusicRoom, {
      isOpen: true,
      tracks: [
        { id: 'theme', title: 'Theme', file: 'audio/bgm/theme.ogg' },
        { id: 'secret', title: 'Secret', file: 'audio/bgm/secret.ogg' },
      ],
      unlockedTrackIds: ['theme'],
      replayScenes: [{ id: 'chapter_01', title: 'Chapter 01' }],
      unlockedReplayIds: [],
      onClose: () => {},
    }))

    expect(html).toContain('Music Room')
    expect(html).toContain('Theme')
    expect(html).toContain('Locked track')
    expect(html).toContain('Locked replay')
  })
})
