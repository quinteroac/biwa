import { describe, expect, it } from 'bun:test'
import {
  ASEPRITE_ATLAS_VERSION,
  buildAsepriteAnimationAtlas,
  buildAsepriteAtlas,
  getAsepriteAtlasKind,
  getAsepriteFrameItems,
  getAsepriteFrameTags,
  getAsepritePlaybackFrameIndices,
  validateAsepriteAtlas,
} from '../engine/AsepriteAtlas.ts'

describe('AsepriteAtlas', () => {
  it('builds ComfyUI Game Assets Maker compatible visual novel atlases', () => {
    const atlas = buildAsepriteAtlas({
      sheetWidth: 2048,
      sheetHeight: 2048,
      spritesheetType: 'Half Body',
      spriteCount: 4,
      layoutDirection: 'Grid',
      columns: 0,
      spriteNames: ['neutral', 'happy', 'sad', 'angry'],
      imageFilename: 'kai_spritesheet.png',
      frameDuration: 100,
    })

    expect(atlas.meta.app).toBe('ComfyUI Game Assets Maker')
    expect(atlas.meta.version).toBe(ASEPRITE_ATLAS_VERSION)
    expect(atlas.meta.image).toBe('kai_spritesheet.png')
    expect(getAsepriteAtlasKind(atlas)).toBe('Visual Novel')
    expect(atlas.meta.layout?.columns).toBe(2)
    expect(atlas.meta.layout?.rows).toBe(2)
    expect(Object.keys(atlas.frames)).toEqual(['neutral.png', 'happy.png', 'sad.png', 'angry.png'])
  })

  it('infers single-frame tags from visual novel frame names when frameTags are absent', () => {
    const atlas = buildAsepriteAtlas({
      sheetWidth: 1024,
      sheetHeight: 512,
      spritesheetType: 'Face Expressions',
      spriteCount: 2,
      layoutDirection: 'Horizontal',
      spriteNames: ['neutral', 'surprised'],
      imageFilename: 'faces.png',
    })

    expect(getAsepriteFrameTags(atlas)).toEqual([
      { name: 'neutral', from: 0, to: 0, direction: 'forward', color: '#000000ff' },
      { name: 'surprised', from: 1, to: 1, direction: 'forward', color: '#000000ff' },
    ])
  })

  it('builds animation atlases with Aseprite frameTags', () => {
    const atlas = buildAsepriteAnimationAtlas({
      sheetWidth: 1024,
      sheetHeight: 1024,
      frameCount: 4,
      layoutDirection: 'Horizontal',
      animationTags: [{ name: 'idle', from: 0, to: 3, direction: 'forward', color: '#000000ff' }],
      imageFilename: 'idle_spritesheet.png',
    })

    expect(atlas.meta.spritesheetType).toBe('Animation')
    expect(atlas.meta.atlasType).toBe('Animation')
    expect(getAsepriteAtlasKind(atlas)).toBe('Animation')
    expect(atlas.meta.frameTags).toEqual([{ name: 'idle', from: 0, to: 3, direction: 'forward', color: '#000000ff' }])
    expect(getAsepriteFrameItems(atlas).map(item => item.key)).toEqual(['idle_01.png', 'idle_02.png', 'idle_03.png', 'idle_04.png'])
  })

  it('resolves Aseprite playback order from frame tag direction', () => {
    expect(getAsepritePlaybackFrameIndices({ name: 'idle', from: 0, to: 3, direction: 'forward' })).toEqual([0, 1, 2, 3])
    expect(getAsepritePlaybackFrameIndices({ name: 'idle', from: 0, to: 3, direction: 'reverse' })).toEqual([3, 2, 1, 0])
    expect(getAsepritePlaybackFrameIndices({ name: 'idle', from: 0, to: 3, direction: 'pingpong' })).toEqual([0, 1, 2, 3, 2, 1])
  })

  it('validates required atlas fields and frame bounds', () => {
    const issues = validateAsepriteAtlas({
      frames: {
        'bad.png': {
          frame: { x: 900, y: 0, w: 200, h: 100 },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: 200, h: 100 },
          sourceSize: { w: 200, h: 100 },
          duration: 100,
        },
      },
      meta: { size: { w: 1000, h: 1000 } },
    })

    expect(issues.map(issue => issue.code)).toContain('atlas_image_missing')
    expect(issues.map(issue => issue.code)).toContain('atlas_frame_out_of_bounds')
  })

  it('can require the ComfyUI Game Assets Maker atlas contract', () => {
    const issues = validateAsepriteAtlas({
      frames: {},
      meta: { image: 'bad.png', size: { w: 1, h: 1 } },
    }, { requireGameAssetsMaker: true })

    expect(issues.map(issue => issue.code)).toContain('atlas_contract_mismatch')
  })
})
