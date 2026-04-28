export const ASEPRITE_ATLAS_VERSION = 'aseprite-atlas-v1'
export const ASEPRITE_APP_NAME = 'ComfyUI Game Assets Maker'

export type AsepriteLayoutDirection = 'Horizontal' | 'Vertical' | 'Grid'
export type AsepriteAnimationDirection = 'forward' | 'reverse' | 'pingpong'

export interface AsepriteFrameRect {
  x: number
  y: number
  w: number
  h: number
}

export interface AsepriteFrame {
  frame: AsepriteFrameRect
  rotated: boolean
  trimmed: boolean
  spriteSourceSize: AsepriteFrameRect
  sourceSize: { w: number; h: number }
  duration: number
}

export interface AsepriteFrameTag {
  name: string
  from: number
  to: number
  direction: AsepriteAnimationDirection
  color?: string
}

export interface AsepriteAtlas {
  frames: Record<string, AsepriteFrame> | Array<AsepriteFrame & { filename?: string }>
  meta: {
    app?: string
    version?: string
    image?: string
    format?: string
    size?: { w: number; h: number }
    scale?: string
    spritesheetType?: string
    atlasType?: string
    layout?: {
      direction: string
      columns: number
      rows: number
      spriteCount: number
      frameWidth: number
      frameHeight: number
    }
    frameTags?: AsepriteFrameTag[]
    [key: string]: unknown
  }
}

export interface AsepriteFrameItem {
  key: string
  name: string
  frame: AsepriteFrame
  x: number
  y: number
  w: number
  h: number
}

export interface BuildAsepriteAtlasOptions {
  sheetWidth: number
  sheetHeight: number
  spritesheetType: string
  spriteCount: number
  layoutDirection: AsepriteLayoutDirection
  spriteNames: string[] | string
  columns?: number
  imageFilename: string
  frameDuration?: number
}

export interface BuildAsepriteAnimationAtlasOptions {
  sheetWidth: number
  sheetHeight: number
  frameCount: number
  layoutDirection: AsepriteLayoutDirection
  columns?: number
  animationTags: AsepriteFrameTag[] | string
  imageFilename: string
  frameDuration?: number
  frameNamePrefix?: string
}

export interface AsepriteValidationIssue {
  code: string
  message: string
}

function safeName(value: string, fallback: string): string {
  const cleaned = value.trim().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
  return cleaned || fallback
}

function parseNames(spriteNames: string[] | string, spriteCount: number): string[] {
  let names: string[] = []
  if (Array.isArray(spriteNames)) {
    names = spriteNames.map(name => String(name).trim())
  } else {
    const text = String(spriteNames || '').trim()
    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text) as unknown
        if (Array.isArray(parsed)) {
          names = parsed.map(name => String(name).trim())
        } else if (parsed && typeof parsed === 'object') {
          names = Array.from({ length: spriteCount }, (_, idx) => String((parsed as Record<string, unknown>)[String(idx + 1)] ?? '').trim())
        }
      } catch {
        names = text.split(',').map(name => name.trim())
      }
    } else {
      names = text.split(',').map(name => name.trim())
    }
  }

  return Array.from({ length: spriteCount }, (_, idx) => safeName(names[idx] ?? '', `sprite_${String(idx + 1).padStart(2, '0')}`))
}

function balancedGridColumns(itemCount: number): number {
  const count = Math.max(1, Math.floor(itemCount))
  let bestColumns = count
  let bestScore: [number, number, number] | null = null
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns)
    const emptyCells = columns * rows - count
    const score: [number, number, number] = [emptyCells, Math.abs(columns - rows), -columns]
    if (!bestScore || score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] < bestScore[1]) || (score[0] === bestScore[0] && score[1] === bestScore[1] && score[2] < bestScore[2])) {
      bestScore = score
      bestColumns = columns
    }
  }
  return bestColumns
}

export function buildAsepriteAtlas(options: BuildAsepriteAtlasOptions): AsepriteAtlas {
  const sheetWidth = Math.floor(options.sheetWidth)
  const sheetHeight = Math.floor(options.sheetHeight)
  const spriteCount = Math.floor(options.spriteCount)
  let columns = Math.floor(options.columns ?? 0)

  if (sheetWidth <= 0 || sheetHeight <= 0) throw new Error('Spritesheet width and height must be greater than zero')
  if (spriteCount <= 0) throw new Error('Sprite count must be greater than zero')

  const layoutDirection = options.layoutDirection || 'Horizontal'
  if (layoutDirection === 'Horizontal') columns = spriteCount
  else if (layoutDirection === 'Vertical') columns = 1
  else if (layoutDirection === 'Grid' && columns <= 0) columns = balancedGridColumns(spriteCount)
  else if (columns <= 0) columns = spriteCount
  if (columns > spriteCount) columns = spriteCount

  const rows = Math.ceil(spriteCount / columns)
  if (sheetWidth % columns !== 0) throw new Error(`Spritesheet width ${sheetWidth} is not divisible by columns ${columns}`)
  if (sheetHeight % rows !== 0) throw new Error(`Spritesheet height ${sheetHeight} is not divisible by calculated rows ${rows}`)

  const frameWidth = sheetWidth / columns
  const frameHeight = sheetHeight / rows
  const names = parseNames(options.spriteNames, spriteCount)
  const frames: Record<string, AsepriteFrame> = {}

  for (const [index, name] of names.entries()) {
    const col = index % columns
    const row = Math.floor(index / columns)
    frames[`${name}.png`] = {
      frame: { x: col * frameWidth, y: row * frameHeight, w: frameWidth, h: frameHeight },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: frameWidth, h: frameHeight },
      sourceSize: { w: frameWidth, h: frameHeight },
      duration: Math.floor(options.frameDuration ?? 100),
    }
  }

  return {
    frames,
    meta: {
      app: ASEPRITE_APP_NAME,
      version: ASEPRITE_ATLAS_VERSION,
      image: options.imageFilename || 'spritesheet.png',
      format: 'RGBA8888',
      size: { w: sheetWidth, h: sheetHeight },
      scale: '1',
      spritesheetType: options.spritesheetType,
      layout: {
        direction: layoutDirection,
        columns,
        rows,
        spriteCount,
        frameWidth,
        frameHeight,
      },
    },
  }
}

function parseFrameTags(animationTags: AsepriteFrameTag[] | string, frameCount: number): AsepriteFrameTag[] {
  const raw = Array.isArray(animationTags) ? animationTags : JSON.parse(String(animationTags || '[]')) as unknown
  if (!Array.isArray(raw)) throw new Error('animationTags must be an array')
  return raw.map((tag, index) => {
    const record = tag as Partial<AsepriteFrameTag>
    const name = safeName(String(record.name ?? `animation_${index + 1}`), `animation_${index + 1}`)
    const from = Math.max(0, Math.floor(Number(record.from ?? 0)))
    const to = Math.min(frameCount - 1, Math.floor(Number(record.to ?? from)))
    const direction = record.direction === 'reverse' || record.direction === 'pingpong' ? record.direction : 'forward'
    if (to < from) throw new Error(`Invalid frame tag "${name}": to must be greater than or equal to from`)
    return { name, from, to, direction, color: record.color ?? '#000000ff' }
  })
}

export function buildAsepriteAnimationAtlas(options: BuildAsepriteAnimationAtlasOptions): AsepriteAtlas {
  const frameCount = Math.floor(options.frameCount)
  const tags = parseFrameTags(options.animationTags, frameCount)
  const counters: Record<string, number> = {}
  const frameNames = Array.from({ length: frameCount }, (_, frameIndex) => {
    const owner = tags.find(tag => tag.from <= frameIndex && tag.to >= frameIndex)
    const base = safeName(owner?.name ?? options.frameNamePrefix ?? 'frame', 'frame')
    counters[base] = (counters[base] ?? 0) + 1
    return `${base}_${String(counters[base]).padStart(2, '0')}`
  })
  const atlasOptions: BuildAsepriteAtlasOptions = {
    sheetWidth: options.sheetWidth,
    sheetHeight: options.sheetHeight,
    spritesheetType: 'Animation',
    spriteCount: frameCount,
    layoutDirection: options.layoutDirection,
    spriteNames: frameNames,
    imageFilename: options.imageFilename,
  }
  if (options.columns !== undefined) atlasOptions.columns = options.columns
  if (options.frameDuration !== undefined) atlasOptions.frameDuration = options.frameDuration
  const atlas = buildAsepriteAtlas(atlasOptions)
  atlas.meta.frameTags = tags
  atlas.meta.atlasType = 'Animation'
  return atlas
}

export function getAsepriteFrameItems(atlas: AsepriteAtlas): AsepriteFrameItem[] {
  const frames = atlas.frames
  if (Array.isArray(frames)) {
    return frames.map((frame, index) => {
      const key = frame.filename ?? `sprite_${String(index + 1).padStart(2, '0')}.png`
      return frameItemFromEntry(key, frame)
    })
  }
  return Object.entries(frames ?? {}).map(([key, frame]) => frameItemFromEntry(key, frame))
}

function frameItemFromEntry(key: string, frame: AsepriteFrame): AsepriteFrameItem {
  return {
    key,
    name: safeName(key, key),
    frame,
    x: frame.frame.x,
    y: frame.frame.y,
    w: frame.frame.w,
    h: frame.frame.h,
  }
}

export function getAsepriteFrameTags(atlas: AsepriteAtlas): AsepriteFrameTag[] {
  if (Array.isArray(atlas.meta?.frameTags) && atlas.meta.frameTags.length > 0) {
    return atlas.meta.frameTags
  }
  return getAsepriteFrameItems(atlas).map((item, index) => ({
    name: item.name,
    from: index,
    to: index,
    direction: 'forward',
    color: '#000000ff',
  }))
}

export function validateAsepriteAtlas(atlas: unknown, options: { requireAnimationTags?: boolean; requireGameAssetsMaker?: boolean } = {}): AsepriteValidationIssue[] {
  const issues: AsepriteValidationIssue[] = []
  if (!atlas || typeof atlas !== 'object' || Array.isArray(atlas)) return [{ code: 'atlas_invalid', message: 'Atlas must be a JSON object.' }]
  const candidate = atlas as AsepriteAtlas
  const meta = candidate.meta ?? {}
  if (options.requireGameAssetsMaker && (meta.app !== ASEPRITE_APP_NAME || meta.version !== ASEPRITE_ATLAS_VERSION)) {
    issues.push({ code: 'atlas_contract_mismatch', message: `Atlas must use ${ASEPRITE_APP_NAME} ${ASEPRITE_ATLAS_VERSION}.` })
  }
  if (meta.version && meta.version !== ASEPRITE_ATLAS_VERSION && meta.app === ASEPRITE_APP_NAME) {
    issues.push({ code: 'atlas_version_unsupported', message: `Unsupported atlas version: ${meta.version}` })
  }
  if (!meta.image) issues.push({ code: 'atlas_image_missing', message: 'Atlas meta.image is required.' })
  if (!meta.size || typeof meta.size.w !== 'number' || typeof meta.size.h !== 'number') {
    issues.push({ code: 'atlas_size_missing', message: 'Atlas meta.size with numeric w/h is required.' })
  }

  const items = getAsepriteFrameItems(candidate)
  if (items.length === 0) issues.push({ code: 'atlas_frames_empty', message: 'Atlas must contain at least one frame.' })
  const width = meta.size?.w ?? 0
  const height = meta.size?.h ?? 0
  if (width > 0 && height > 0) {
    for (const item of items) {
      if (item.x < 0 || item.y < 0 || item.w <= 0 || item.h <= 0 || item.x + item.w > width || item.y + item.h > height) {
        issues.push({ code: 'atlas_frame_out_of_bounds', message: `Frame "${item.key}" is outside meta.size bounds.` })
      }
    }
  }

  const tags = candidate.meta?.frameTags ?? []
  if (options.requireAnimationTags && tags.length === 0) {
    issues.push({ code: 'atlas_frame_tags_missing', message: 'Animation atlas requires meta.frameTags.' })
  }
  for (const tag of tags) {
    if (!tag.name || tag.from < 0 || tag.to < tag.from || tag.to >= items.length) {
      issues.push({ code: 'atlas_frame_tag_invalid', message: `Invalid frame tag "${tag.name ?? '(unnamed)'}".` })
    }
    if (!['forward', 'reverse', 'pingpong'].includes(tag.direction)) {
      issues.push({ code: 'atlas_frame_tag_direction_invalid', message: `Invalid frame tag direction for "${tag.name}".` })
    }
  }
  return issues
}
