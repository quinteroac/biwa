import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import {
  buildAsepriteAnimationAtlas,
  buildAsepriteAtlas,
  getAsepriteFrameItems,
  getAsepriteFrameTags,
} from '../../framework/engine/AsepriteAtlas.ts'
import type { AsepriteAnimationDirection, AsepriteFrameTag, AsepriteLayoutDirection } from '../../framework/engine/AsepriteAtlas.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')

interface ParsedArgs {
  positional: string[]
  flags: Record<string, string | boolean>
}

interface WrittenAssetResult {
  atlasPath: string
  frameCount: number
}

function usage(): string {
  return `Usage:
  bun manager/cli.ts assets character-atlas <gameId> <characterId> [options]
  bun manager/cli.ts assets animation-atlas <gameId> <assetId> [options]

Character options:
  --width <px>          Spritesheet width. Default: 2048
  --height <px>         Spritesheet height. Default: 2048
  --type <name>         Half Body, Full Body, or Face Expressions. Default: Half Body
  --count <n>           Sprite count. Default: number of names
  --layout <mode>       Horizontal, Vertical, or Grid. Default: Horizontal
  --columns <n>         Grid columns. Default: 0
  --names <list|json>   Sprite names. Default: neutral,happy,sad,angry
  --image <filename>    Future spritesheet filename. Default: <characterId>_spritesheet.png
  --duration <ms>       Frame duration. Default: 100
  --out <path>          Atlas output path relative to game dir

Animation options:
  --width <px>          Spritesheet width. Default: 1024
  --height <px>         Spritesheet height. Default: 1024
  --frames <n>          Frame count. Default: 4
  --layout <mode>       Horizontal, Vertical, or Grid. Default: Horizontal
  --columns <n>         Grid columns. Default: 0
  --tags <json>         Aseprite frameTags JSON
  --image <filename>    Future spritesheet filename. Default: <assetId>_spritesheet.png
  --duration <ms>       Frame duration. Default: 100
  --frame-prefix <name> Frame name prefix. Default: frame
  --out <path>          Atlas output path relative to game dir`
}

function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const key = arg.slice(2)
    const next = args[i + 1]
    if (!next || next.startsWith('--')) {
      flags[key] = true
      continue
    }
    flags[key] = next
    i++
  }
  return { positional, flags }
}

function strFlag(flags: Record<string, string | boolean>, key: string, fallback: string): string {
  const value = flags[key]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function intFlag(flags: Record<string, string | boolean>, key: string, fallback: number): number {
  const value = flags[key]
  if (typeof value !== 'string') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback
}

function layoutFlag(flags: Record<string, string | boolean>): AsepriteLayoutDirection {
  const raw = strFlag(flags, 'layout', 'Horizontal')
  if (raw === 'Vertical' || raw === 'Grid') return raw
  return 'Horizontal'
}

function parseNameList(raw: string): string[] {
  const text = raw.trim()
  if (!text) return []
  if (text.startsWith('[')) {
    const parsed = JSON.parse(text) as unknown
    if (!Array.isArray(parsed)) throw new Error('--names JSON must be an array')
    return parsed.map(value => String(value))
  }
  return text.split(',').map(name => name.trim()).filter(Boolean)
}

function parseTags(raw: string): AsepriteFrameTag[] {
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) throw new Error('--tags must be a JSON array')
  return parsed.map((value, index) => {
    const tag = value as Partial<AsepriteFrameTag>
    const direction: AsepriteAnimationDirection = tag.direction === 'reverse' || tag.direction === 'pingpong' ? tag.direction : 'forward'
    return {
      name: String(tag.name ?? `animation_${index + 1}`),
      from: Math.floor(Number(tag.from ?? 0)),
      to: Math.floor(Number(tag.to ?? tag.from ?? 0)),
      direction,
      color: tag.color ?? '#000000ff',
    }
  })
}

function gameDir(gameId: string): string {
  const dir = join(ROOT, 'games', gameId)
  if (!existsSync(dir)) throw new Error(`Game "${gameId}" does not exist at games/${gameId}/`)
  return dir
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function outputPathFlag(
  gameDirPath: string,
  flags: Record<string, string | boolean>,
  key: string,
  fallback: string,
  defaultFilename: string,
): string {
  const raw = strFlag(flags, key, fallback)
  const fullPath = join(gameDirPath, raw)
  const isDirectoryLike = raw === '.' || raw === './' || raw.endsWith('/') || raw.endsWith('\\')
  if (isDirectoryLike || (existsSync(fullPath) && statSync(fullPath).isDirectory())) {
    return join(raw, defaultFilename).replace(/\\/g, '/')
  }
  return raw
}

export function createCharacterAtlas(gameId: string, characterId: string, flags: Record<string, string | boolean> = {}): WrittenAssetResult {
  const dir = gameDir(gameId)
  const names = parseNameList(strFlag(flags, 'names', 'neutral,happy,sad,angry'))
  const spriteCount = intFlag(flags, 'count', names.length || 4)
  const imageFilename = strFlag(flags, 'image', `${characterId}_spritesheet.png`)
  const atlas = buildAsepriteAtlas({
    sheetWidth: intFlag(flags, 'width', 2048),
    sheetHeight: intFlag(flags, 'height', 2048),
    spritesheetType: strFlag(flags, 'type', 'Half Body'),
    spriteCount,
    layoutDirection: layoutFlag(flags),
    spriteNames: names,
    columns: intFlag(flags, 'columns', 0),
    imageFilename,
    frameDuration: intFlag(flags, 'duration', 100),
  })

  const out = outputPathFlag(dir, flags, 'out', `assets/characters/${characterId}/${characterId}_atlas.json`, `${characterId}_atlas.json`)
  const frameItems = getAsepriteFrameItems(atlas)

  writeJson(join(dir, out), atlas)
  return { atlasPath: out, frameCount: frameItems.length }
}

export function createAnimationAtlas(gameId: string, assetId: string, flags: Record<string, string | boolean> = {}): WrittenAssetResult {
  const dir = gameDir(gameId)
  const frameCount = intFlag(flags, 'frames', 4)
  const tags = parseTags(strFlag(flags, 'tags', `[{"name":"${assetId}","from":0,"to":${frameCount - 1},"direction":"forward","color":"#000000ff"}]`))
  const imageFilename = strFlag(flags, 'image', `${assetId}_spritesheet.png`)
  const atlas = buildAsepriteAnimationAtlas({
    sheetWidth: intFlag(flags, 'width', 1024),
    sheetHeight: intFlag(flags, 'height', 1024),
    frameCount,
    layoutDirection: layoutFlag(flags),
    columns: intFlag(flags, 'columns', 0),
    animationTags: tags,
    imageFilename,
    frameDuration: intFlag(flags, 'duration', 100),
    frameNamePrefix: strFlag(flags, 'frame-prefix', 'frame'),
  })

  const out = outputPathFlag(dir, flags, 'out', `assets/animations/${assetId}/${assetId}_atlas.json`, `${assetId}_atlas.json`)
  const frameItems = getAsepriteFrameItems(atlas)

  writeJson(join(dir, out), atlas)
  return { atlasPath: out, frameCount: frameItems.length }
}

export async function assets(...args: string[]): Promise<void> {
  const [subcommand, ...rest] = args
  if (!subcommand || subcommand === 'help') {
    console.log(usage())
    process.exit(subcommand ? 1 : 0)
  }

  if (subcommand !== 'character-atlas' && subcommand !== 'animation-atlas') {
    console.log(usage())
    throw new Error(`Unknown assets subcommand: ${subcommand}`)
  }

  const parsed = parseArgs(rest)
  const [gameId, assetId, ...extra] = parsed.positional
  if (!gameId) throw new Error(`Missing gameId.\n\n${usage()}`)
  if (!assetId) {
    const label = subcommand === 'character-atlas' ? 'characterId' : 'assetId'
    throw new Error(`Missing ${label}. Example: bun manager/cli.ts assets ${subcommand} ${gameId} ${subcommand === 'character-atlas' ? 'kai' : 'idle'}`)
  }
  if (extra.length > 0) throw new Error(`Unexpected assets argument: ${extra[0]}`)

  const result = subcommand === 'character-atlas'
    ? createCharacterAtlas(gameId, assetId, parsed.flags)
    : createAnimationAtlas(gameId, assetId, parsed.flags)

  console.log(`\nGenerated ${subcommand} for ${gameId}/${assetId}`)
  console.log(`  atlas:  games/${gameId}/${result.atlasPath}`)
  console.log(`  frames: ${result.frameCount}\n`)
}
