import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs'
import { join, extname, relative } from 'path'
import yaml from 'js-yaml'
import { Compiler } from 'inkjs/compiler/Compiler.js'
import { CompilerOptions } from 'inkjs/compiler/CompilerOptions.js'
import { validateGame } from './doctor.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const VENDOR_DIR = join(ROOT, 'framework', 'vendor')

const IMPORT_MAP = JSON.stringify({
  imports: {
    react: '/framework/vendor/react.js',
    'react/jsx-runtime': '/framework/vendor/react-jsx-runtime.js',
    'react/jsx-dev-runtime': '/framework/vendor/react-jsx-dev-runtime.js',
    'react-dom/client': '/framework/vendor/react-dom-client.js',
    inkjs: '/node_modules/inkjs/dist/ink.mjs',

  },
})

interface WatchSnapshot {
  files: Map<string, number>
  status: 'ok' | 'error'
}

export interface DevWatcher {
  stop(): void
}

async function bundleVendorModule(pkg: string, out: string, external: string[] = []): Promise<void> {
  const result = await Bun.build({ entrypoints: [pkg], format: 'esm', outdir: VENDOR_DIR, naming: out, external })
  if (!result.success) throw new Error(`Failed to bundle ${out}: ${result.logs.map(l => l.message).join('\n')}`)

  const mod = require(pkg) as Record<string, unknown>
  const keys = Object.keys(mod).filter(k => k !== '__esModule' && k !== 'default')
  if (keys.length === 0) return

  const outPath = join(VENDOR_DIR, out)
  const code = readFileSync(outPath, 'utf8')
  const matched = code.match(/export default (require_\w+\(\));/)
  const named = `\nvar __mod = (${matched?.[1] ?? 'null'});\nexport default __mod;\n${keys.map(k => `export const ${k} = __mod.${k};`).join('\n')}\n`
  writeFileSync(outPath, code.replace(/export default require_\w+\(\);\s*$/, named))
}

async function ensureReactVendor(): Promise<void> {
  if (existsSync(join(VENDOR_DIR, 'react.js'))) return
  mkdirSync(VENDOR_DIR, { recursive: true })
  console.log('  Bundling React vendor files...')

  const bundles = [
    { pkg: join(ROOT, 'node_modules/react/index.js'),               out: 'react.js',                  external: [] as string[] },
    { pkg: join(ROOT, 'node_modules/react/jsx-runtime.js'),         out: 'react-jsx-runtime.js',      external: [] as string[] },
    { pkg: join(ROOT, 'node_modules/react/jsx-dev-runtime.js'),     out: 'react-jsx-dev-runtime.js',  external: [] as string[] },
    { pkg: join(ROOT, 'node_modules/react-dom/client.js'),          out: 'react-dom-client.js',       external: ['react'] },
  ]

  for (const { pkg, out, external } of bundles) {
    try {
      await bundleVendorModule(pkg, out, external)
      console.log(`  ✓ ${out}`)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.error(`  ✗ ${err.message}`)
      process.exit(1)
    }
  }
}

async function transpileTs(filePath: string): Promise<string> {
  const result = await Bun.build({
    entrypoints: [filePath],
    format: 'esm',
    external: ['react', 'react/*', 'react-dom/*', './*', '../*', '../../*', '../../../*'],
  })
  if (!result.success) throw new Error(result.logs.map(l => l.message).join('\n'))
  return result.outputs[0]!.text()
}

function parseFrontmatter(text: string): Record<string, unknown> | null {
  const match = text.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null
  try {
    return yaml.load(match[1]!) as Record<string, unknown>
  } catch { return null }
}

async function compileInk(filePath: string): Promise<string> {
  const content = readFileSync(filePath, 'utf8')
  const errors: string[] = []
  const opts = new CompilerOptions(
    filePath, [], false,
    (msg: string, type: number) => { if (type === 0) errors.push(msg) },
    {
      ResolveInkFilename: (name: string) => join(filePath, '..', name),
      LoadInkFileContents: (path: string) => readFileSync(path, 'utf8'),
    }
  )
  const compiler = new Compiler(content, opts)
  const story = compiler.Compile()
  if (errors.length) throw new Error(`Ink compilation errors in ${filePath}:\n${errors.join('\n')}`)
  return story.ToJson()
}

function detectGameId(): string | null {
  const gamesDir = join(ROOT, 'games')
  try {
    const entries = readdirSync(gamesDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
    if (entries.length === 1) return entries[0]!
    return null
  } catch { return null }
}

function walkMdRelative(dir: string, baseDir = dir): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkMdRelative(fullPath, baseDir))
    } else if (entry.name.endsWith('.md')) {
      results.push(fullPath.slice(baseDir.length + 1).replace(/\\/g, '/').replace(/\.md$/, '.json'))
    }
  }
  return results
}

function injectImportMap(html: string): string {
  const tag = `<script type="importmap">${IMPORT_MAP}</script>`
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n  ${tag}`)
  }
  return tag + '\n' + html
}

function mime(path: string): string {
  const ext = extname(path).toLowerCase()
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript',
    '.mjs':  'application/javascript',
    '.ts':   'application/javascript',
    '.tsx':  'application/javascript',
    '.jsx':  'application/javascript',
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
    '.webm': 'audio/webm',
    '.ttf':  'font/ttf',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
  } as Record<string, string>)[ext] ?? 'application/octet-stream'
}

async function serveFile(filePath: string): Promise<Response | null> {
  const file = Bun.file(filePath)
  if (!(await file.exists())) return null
  return new Response(file, { headers: { 'Content-Type': mime(filePath) } })
}

function isTranspilable(pathname: string): boolean {
  return pathname.endsWith('.tsx') || pathname.endsWith('.ts') || pathname.endsWith('.jsx')
}

function isWatchedFile(filePath: string): boolean {
  return [
    '.ink',
    '.md',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.json',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    '.mp3',
    '.ogg',
    '.wav',
    '.webm',
  ].some(ext => filePath.endsWith(ext))
}

function scanWatchFiles(dirs: string[]): Map<string, number> {
  const files = new Map<string, number>()
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return
    const stat = statSync(dir)
    if (stat.isFile()) {
      if (isWatchedFile(dir)) files.set(dir, stat.mtimeMs)
      return
    }
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'dist' || entry.name === 'node_modules' || entry.name === '.git') continue
        walk(fullPath)
      } else if (isWatchedFile(fullPath)) {
        files.set(fullPath, statSync(fullPath).mtimeMs)
      }
    }
  }
  for (const dir of dirs) walk(dir)
  return files
}

function changedFiles(previous: Map<string, number>, next: Map<string, number>): string[] {
  const changed = new Set<string>()
  for (const [file, mtime] of next) {
    if (previous.get(file) !== mtime) changed.add(file)
  }
  for (const file of previous.keys()) {
    if (!next.has(file)) changed.add(file)
  }
  return Array.from(changed).sort()
}

export function createDevWatcher(gameId: string, options: { intervalMs?: number; log?: (message: string) => void } = {}): DevWatcher {
  const log = options.log ?? console.log
  const gameDir = join(ROOT, 'games', gameId)
  const watchDirs = [
    join(gameDir, 'story'),
    join(gameDir, 'data'),
    join(gameDir, 'assets'),
    join(gameDir, 'game.config.ts'),
    join(ROOT, 'framework'),
  ]
  const dirs = watchDirs.filter(path => existsSync(path))
  const snapshot: WatchSnapshot = {
    files: scanWatchFiles(dirs),
    status: 'ok',
  }

  const timer = setInterval(async () => {
    const next = scanWatchFiles(dirs)
    const changed = changedFiles(snapshot.files, next)
    if (changed.length === 0) return
    snapshot.files = next

    for (const file of changed.slice(0, 6)) {
      const rel = file.startsWith(ROOT) ? relative(ROOT, file) : file
      log(`[dev] changed: ${rel}`)
    }
    if (changed.length > 6) log(`[dev] changed: +${changed.length - 6} more files`)

    try {
      const { issues } = await validateGame(gameId)
      const errors = issues.filter(issue => issue.severity === 'error')
      if (errors.length > 0) {
        snapshot.status = 'error'
        log(`[dev] validation failed: ${errors[0]!.path}: ${errors[0]!.message}`)
        return
      }
      if (snapshot.status === 'error') {
        log('[dev] recovered: validation is clean again.')
      } else {
        log('[dev] validation ok.')
      }
      snapshot.status = 'ok'
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      snapshot.status = 'error'
      log(`[dev] validation failed: ${err.message}`)
    }
  }, options.intervalMs ?? 750)

  return { stop: () => clearInterval(timer) }
}

function diagnosticResponse(title: string, detail: string, suggestion: string, contentType = 'text/plain; charset=utf-8'): Response {
  return new Response([
    title,
    '',
    detail,
    '',
    `Suggestion: ${suggestion}`,
  ].join('\n'), {
    status: 500,
    headers: { 'Content-Type': contentType },
  })
}

export async function dev(gameId?: string): Promise<void> {
  if (!gameId) {
    gameId = detectGameId() ?? undefined
    if (!gameId) {
      console.error('Please specify a gameId: bun dev <gameId>')
      process.exit(1)
    }
  }

  const gameDir = join(ROOT, 'games', gameId)
  const port = parseInt(process.env['PORT'] ?? '3000')

  ;(globalThis as typeof globalThis & { jsYaml: typeof yaml }).jsYaml = yaml

  await ensureReactVendor()

  console.log(`\n🎭 Visual Novel Dev Server`)
  console.log(`   Game: ${gameId}`)
  console.log(`   URL:  http://localhost:${port}\n`)
  console.log('   Watching story/data/assets through on-demand recompilation.')
  console.log(`   Validate content with: bun manager/cli.ts doctor ${gameId}\n`)
  createDevWatcher(gameId)

  Bun.serve({
    port,
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url)
      let pathname = url.pathname

      if (pathname === '/') pathname = '/index.html'

      // ── TypeScript / TSX / JSX → transpile to JS
      if (isTranspilable(pathname)) {
        const filePath = pathname.startsWith('/framework/')
          ? join(ROOT, pathname)
          : join(gameDir, pathname)
        if (!(await Bun.file(filePath).exists())) return new Response('Not found', { status: 404 })
        try {
          const js = await transpileTs(filePath)
          return new Response(js, { headers: { 'Content-Type': 'application/javascript' } })
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e))
          console.error('[transpile]', err.message)
          return diagnosticResponse(
            'Transpile error',
            err.message,
            'Check the TypeScript import path and exported names in the file shown above.',
            'application/javascript; charset=utf-8',
          )
        }
      }

      // ── framework/ → serve from project root framework/
      if (pathname.startsWith('/framework/')) {
        const filePath = join(ROOT, pathname)
        const res = await serveFile(filePath)
        if (res) return res
      }

      // ── node_modules/ → serve from project root
      if (pathname.startsWith('/node_modules/')) {
        const filePath = join(ROOT, pathname)
        const res = await serveFile(filePath)
        if (res) return res
      }

      // ── .ink files → compile to JSON
      if (pathname.endsWith('.ink')) {
        const filePath = join(gameDir, pathname)
        try {
          const json = await compileInk(filePath)
          return new Response(json, { headers: { 'Content-Type': 'application/json' } })
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e))
          console.error('[ink compile]', err.message)
          return diagnosticResponse(
            'Ink compile error',
            err.message,
            'Fix the referenced .ink file, then refresh. Includes are resolved relative to the entry file.',
          )
        }
      }

      // ── /data/**/index.json → directory listing of .md files as id.json names
      if (pathname.match(/^\/data\/.*\/index\.json$/)) {
        const dirPath = join(gameDir, pathname.replace('/index.json', ''))
        try {
          const files = walkMdRelative(dirPath)
          return new Response(JSON.stringify(files), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch {
          return new Response('[]', { headers: { 'Content-Type': 'application/json' } })
        }
      }

      // ── /data/**/*.json → parse .md frontmatter as JSON
      if (pathname.startsWith('/data/') && pathname.endsWith('.json')) {
        const mdPath = join(gameDir, pathname.replace('.json', '.md'))
        try {
          const text = readFileSync(mdPath, 'utf8')
          const data = parseFrontmatter(text) ?? {}
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e))
          console.error('[data]', `${pathname}: ${err.message}`)
          return diagnosticResponse(
            'Data file error',
            `${pathname}: ${err.message}`,
            'Create the matching .md file under data/ or update the id referenced in Ink.',
            'application/json; charset=utf-8',
          )
        }
      }

      // ── HTML files → inject import map
      if (pathname.endsWith('.html')) {
        const filePath = join(gameDir, pathname)
        const file = Bun.file(filePath)
        if (await file.exists()) {
          const html = await file.text()
          return new Response(injectImportMap(html), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        }
      }

      // ── Everything else → serve from game directory
      const filePath = join(gameDir, pathname)
      const res = await serveFile(filePath)
      if (res) return res

      return new Response('Not found', { status: 404 })
    },
  })
}
