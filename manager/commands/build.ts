import { readdirSync, readFileSync, mkdirSync, writeFileSync, cpSync, existsSync } from 'fs'
import { dirname, join, relative } from 'path'
import yaml from 'js-yaml'
import { Compiler } from 'inkjs/compiler/Compiler.js'
import { CompilerOptions } from 'inkjs/compiler/CompilerOptions.js'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')

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

function walkFiles(dir: string, exts: string[]): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, exts))
    } else if (exts.some(e => entry.name.endsWith(e))) {
      results.push(fullPath)
    }
  }
  return results
}

function writeDataIndexes(dataSrcDir: string, dataOutDir: string): void {
  const mdFiles = walkFiles(dataSrcDir, ['.md'])
  const dirs = new Set<string>([dataSrcDir])
  for (const mdFile of mdFiles) {
    let current = dirname(mdFile)
    while (current.startsWith(dataSrcDir)) {
      dirs.add(current)
      if (current === dataSrcDir) break
      current = dirname(current)
    }
  }

  for (const dir of dirs) {
    const relDir = relative(dataSrcDir, dir)
    const files = mdFiles
      .filter(file => file.startsWith(dir))
      .map(file => relative(dir, file).replace(/\\/g, '/').replace(/\.md$/, '.json'))
    const outDir = join(dataOutDir, relDir)
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, 'index.json'), JSON.stringify(files, null, 2))
  }
}

export async function build(gameId?: string): Promise<void> {
  if (!gameId) {
    console.error('Please specify a gameId: bun build <gameId>')
    process.exit(1)
  }

  const gameDir  = join(ROOT, 'games', gameId)
  const distDir  = join(ROOT, 'dist', gameId)
  const frameworkDir = join(ROOT, 'framework')

  console.log(`\n🔨 Building "${gameId}" → dist/${gameId}/\n`)

  mkdirSync(distDir, { recursive: true })

  // 1. Compile all .ink files
  console.log('  Compiling ink files...')
  const inkFiles = walkFiles(join(gameDir, 'story'), ['.ink'])
    .filter(f => !f.endsWith('.inc'))
  for (const inkFile of inkFiles) {
    const rel = relative(join(gameDir, 'story'), inkFile)
    const outPath = join(distDir, 'story', rel.replace('.ink', '.json'))
    mkdirSync(join(outPath, '..'), { recursive: true })
    try {
      const json = await compileInk(inkFile)
      writeFileSync(outPath, json)
      console.log(`    ✓ ${rel}`)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.warn(`    ✗ ${rel}: ${err.message}`)
    }
  }

  // 2. Convert .md data files to .json
  console.log('  Converting data files...')
  const mdFiles = walkFiles(join(gameDir, 'data'), ['.md'])
  for (const mdFile of mdFiles) {
    const rel = relative(join(gameDir, 'data'), mdFile)
    const outPath = join(distDir, 'data', rel.replace('.md', '.json'))
    mkdirSync(join(outPath, '..'), { recursive: true })
    try {
      const text = readFileSync(mdFile, 'utf8')
      const data = parseFrontmatter(text) ?? {}
      writeFileSync(outPath, JSON.stringify(data, null, 2))
      console.log(`    ✓ ${rel}`)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.warn(`    ✗ ${rel}: ${err.message}`)
    }
  }
  writeDataIndexes(join(gameDir, 'data'), join(distDir, 'data'))

  // 3. Copy framework (skip .ts/.tsx → bundled separately)
  console.log('  Copying framework...')
  mkdirSync(join(distDir, 'framework'), { recursive: true })
  cpSync(frameworkDir, join(distDir, 'framework'), {
    recursive: true,
    filter: (src) => !src.endsWith('.tsx') && !src.endsWith('.ts') || src.endsWith('.d.ts'),
  })

  // Bundle React vendor dependencies
  const vendorDir = join(distDir, 'framework', 'vendor')
  mkdirSync(vendorDir, { recursive: true })
  const reactBundles = [
    { pkg: join(ROOT, 'node_modules/react/index.js'),           out: 'react.js',                 external: [] as string[] },
    { pkg: join(ROOT, 'node_modules/react/jsx-runtime.js'),     out: 'react-jsx-runtime.js',     external: [] as string[] },
    { pkg: join(ROOT, 'node_modules/react/jsx-dev-runtime.js'), out: 'react-jsx-dev-runtime.js', external: [] as string[] },
    { pkg: join(ROOT, 'node_modules/react-dom/client.js'),      out: 'react-dom-client.js',      external: ['react'] },
  ]
  for (const { pkg, out, external } of reactBundles) {
    const result = await Bun.build({ entrypoints: [pkg], format: 'esm', outdir: vendorDir, naming: out, external })
    if (!result.success) console.warn(`  Failed to bundle ${out}`)
    else console.log(`    ✓ vendor/${out}`)
  }

  // Bundle the entire app (TS + TSX) into one file
  console.log('  Bundling app...')
  const appResult = await Bun.build({
    entrypoints: [join(gameDir, 'index.html')],
    outdir: distDir,
    format: 'esm',
    external: ['react', 'react/*', 'react-dom/*'],
    minify: true,
  })
  if (!appResult.success) {
    // Fallback: transpile individual .tsx/.ts files
    const tsxFiles = walkFiles(frameworkDir, ['.tsx', '.ts']).filter(f => !f.endsWith('.d.ts'))
    for (const tsxFile of tsxFiles) {
      const rel = relative(frameworkDir, tsxFile)
      const outPath = join(distDir, 'framework', rel.replace(/\.tsx?$/, '.js'))
      mkdirSync(join(outPath, '..'), { recursive: true })
      try {
        const r = await Bun.build({ entrypoints: [tsxFile], format: 'esm', external: ['react', 'react/*', 'react-dom/*', './*', '../*'] })
        if (r.success) {
          let code = await r.outputs[0]!.text()
          code = code.replace(/from\s+(['"])(\..*?)\.tsx?\1/g, `from $1$2.js$1`)
          writeFileSync(outPath, code)
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        console.warn(`    ✗ ${rel}: ${err.message}`)
      }
    }
  } else {
    console.log(`    ✓ app bundled`)
  }

  // 4. Copy assets
  const assetsDir = join(gameDir, 'assets')
  if (existsSync(assetsDir)) {
    console.log('  Copying assets...')
    cpSync(assetsDir, join(distDir, 'assets'), { recursive: true })
  }

  // 5. Copy minigames
  const mgDir = join(gameDir, 'minigames')
  if (existsSync(mgDir)) {
    cpSync(mgDir, join(distDir, 'minigames'), { recursive: true })
  }

  // 6. Write production index.html
  const indexSrc = join(gameDir, 'index.html')
  if (existsSync(indexSrc)) {
    let html = readFileSync(indexSrc, 'utf8')
    html = html.replace(/\.\.\/\.\.\/framework\//g, './framework/')
    // Rewrite .ts/.tsx imports to .js in the inline script
    html = html.replace(/(['"])(\..*?)\.tsx?\1/g, `$1$2.js$1`)
    const importMap = JSON.stringify({ imports: {
      react: './framework/vendor/react.js',
      'react/jsx-runtime': './framework/vendor/react-jsx-runtime.js',
      'react/jsx-dev-runtime': './framework/vendor/react-jsx-dev-runtime.js',
      'react-dom/client': './framework/vendor/react-dom-client.js',
      inkjs: './framework/vendor/inkjs.esm.js',
    }})
    const tag = `<script type="importmap">${importMap}</script>`
    html = html.includes('<head>') ? html.replace('<head>', `<head>\n  ${tag}`) : tag + '\n' + html
    writeFileSync(join(distDir, 'index.html'), html)
  }

  console.log(`\n✅ Build complete: dist/${gameId}/\n`)
}
