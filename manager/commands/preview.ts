import { existsSync } from 'fs'
import { extname, join, normalize } from 'path'
import { build } from './build.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')

export interface PreviewOptions {
  build?: boolean
  port?: number
}

export interface PreviewArgs {
  gameId: string
  options: PreviewOptions
}

export interface PreviewServer {
  url: string
  distDir: string
  stop(): void
}

function usage(): string {
  return `Usage: bun manager/cli.ts preview <gameId> [--build] [--port <port>]`
}

function mime(path: string): string {
  const ext = extname(path).toLowerCase()
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.svg':  'image/svg+xml',
    '.mp3':  'audio/mpeg',
    '.ogg':  'audio/ogg',
    '.wav':  'audio/wav',
    '.webm': 'video/webm',
    '.ttf':  'font/ttf',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
  } as Record<string, string>)[ext] ?? 'application/octet-stream'
}

export function parsePreviewArgs(args: string[]): PreviewArgs {
  let gameId: string | undefined
  const options: PreviewOptions = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--build') {
      options.build = true
      continue
    }
    if (arg === '--port') {
      const raw = args[++i]
      const port = Number(raw)
      if (!raw || !Number.isInteger(port) || port <= 0) throw new Error('Invalid --port value.')
      options.port = port
      continue
    }
    if (arg.startsWith('--')) throw new Error(`Unknown preview option: ${arg}`)
    if (!gameId) {
      gameId = arg
      continue
    }
    throw new Error(`Unexpected preview argument: ${arg}`)
  }
  if (!gameId) throw new Error(`Missing gameId.\n\n${usage()}`)
  return { gameId, options }
}

export function startPreviewServer(gameId: string, options: PreviewOptions = {}): PreviewServer {
  const distDir = join(ROOT, 'dist', gameId)
  if (!existsSync(distDir)) {
    throw new Error(`Build output not found: dist/${gameId}/. Run \`bun manager/cli.ts build ${gameId}\` or use \`preview ${gameId} --build\`.`)
  }

  const port = options.port ?? Number(process.env['PORT'] ?? 4173)
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port,
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url)
      const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
      const resolved = normalize(join(distDir, pathname))
      if (!resolved.startsWith(distDir)) return new Response('Forbidden', { status: 403 })
      const file = Bun.file(resolved)
      if (await file.exists()) {
        return new Response(file, { headers: { 'Content-Type': mime(resolved) } })
      }
      return new Response('Not found', { status: 404 })
    },
  })

  return {
    url: `http://127.0.0.1:${server.port}`,
    distDir,
    stop: () => server.stop(true),
  }
}

export async function preview(...args: string[]): Promise<void> {
  const { gameId, options } = parsePreviewArgs(args)
  if (options.build) await build(gameId)

  let server: PreviewServer
  try {
    server = startPreviewServer(gameId, options)
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    if (err.message.includes('EADDRINUSE')) {
      throw new Error(`Port ${options.port ?? Number(process.env['PORT'] ?? 4173)} is already in use. Try --port <other-port>.`)
    }
    throw err
  }

  console.log(`\nPreviewing dist/${gameId}/`)
  console.log(`  URL:  ${server.url}`)
  console.log('  Mode: static distribution output')
  console.log('\nPress Ctrl+C to stop.\n')
}
