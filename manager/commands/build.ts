import { readdirSync, readFileSync, mkdirSync, writeFileSync, cpSync, existsSync, rmSync, statSync } from 'fs'
import { dirname, join, relative } from 'path'
import yaml from 'js-yaml'
import { Compiler } from 'inkjs/compiler/Compiler.js'
import { CompilerOptions } from 'inkjs/compiler/CompilerOptions.js'
import { VN_PLUGIN_API_VERSION } from '../../framework/plugins/PluginRegistry.ts'
import { printIssues, summarizeIssues, validateGame } from './doctor.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const DISTRIBUTION_MODES = ['standalone', 'static', 'portal', 'embedded'] as const
type DistributionMode = typeof DISTRIBUTION_MODES[number]

interface BuildOptions {
  mode?: DistributionMode
}

function parseBuildArgs(gameId: string | undefined, args: string[]): { gameId: string | undefined; options: BuildOptions } {
  const options: BuildOptions = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--mode') {
      const mode = args[++i]
      if (!mode || !DISTRIBUTION_MODES.includes(mode as DistributionMode)) {
        throw new Error(`Unsupported build mode "${mode ?? ''}". Use one of: ${DISTRIBUTION_MODES.join(', ')}.`)
      }
      options.mode = mode as DistributionMode
      continue
    }
    if (arg.startsWith('--')) throw new Error(`Unknown build option: ${arg}`)
    if (!gameId) {
      gameId = arg
      continue
    }
    throw new Error(`Unexpected build argument: ${arg}`)
  }
  return { gameId, options }
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

function toImportPath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  return normalized.startsWith('.') ? normalized : `./${normalized}`
}

function replaceTsImportExtensions(code: string): string {
  return code
    .replace(/from\s+(['"])(\..*?)\.tsx?\1/g, 'from $1$2.js$1')
    .replace(/import\(\s*(['"])(\..*?)\.tsx?\1\s*\)/g, 'import($1$2.js$1)')
}

function rewriteGameFrameworkImports(code: string, outPath: string, distDir: string): string {
  const frameworkRel = toImportPath(relative(dirname(outPath), join(distDir, 'framework')))
  return code.replace(
    /(from\s+['"]|import\(\s*['"])(?:\.\.\/)+framework\/([^'"]+?)\.(?:tsx?|js)(['"]\s*\)?)/g,
    (_match, prefix: string, rest: string, suffix: string) => `${prefix}${frameworkRel}/${rest}.js${suffix}`,
  )
}

function rewriteBuiltGameConfig(outPath: string, config: Awaited<ReturnType<typeof validateGame>>['config']): void {
  let code = readFileSync(outPath, 'utf8')
  for (const storyPath of Object.values(config.story.locales)) {
    code = code.replaceAll(storyPath, storyPath.replace(/\.ink$/, '.json'))
  }
  writeFileSync(outPath, code)
}

function rewriteVendorNamedExports(outPath: string, outName: string): void {
  let code = readFileSync(outPath, 'utf8')
  const exportsByBundle: Record<string, string[]> = {
    'react.js': [
      'act',
      'Activity',
      'cache',
      'cacheSignal',
      'captureOwnerStack',
      'Children',
      'cloneElement',
      'Component',
      'createContext',
      'createElement',
      'createRef',
      'forwardRef',
      'Fragment',
      'isValidElement',
      'lazy',
      'memo',
      'Profiler',
      'PureComponent',
      'startTransition',
      'StrictMode',
      'Suspense',
      'unstable_useCacheRefresh',
      'use',
      'useActionState',
      'useCallback',
      'useContext',
      'useDebugValue',
      'useDeferredValue',
      'useEffect',
      'useId',
      'useImperativeHandle',
      'useInsertionEffect',
      'useLayoutEffect',
      'useMemo',
      'useOptimistic',
      'useReducer',
      'useRef',
      'useState',
      'useSyncExternalStore',
      'useTransition',
      'version',
      '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE',
      '__COMPILER_RUNTIME',
    ],
    'react-dom-client.js': ['createRoot', 'hydrateRoot', 'version'],
    'react-jsx-runtime.js': ['Fragment', 'jsx', 'jsxs'],
    'react-jsx-dev-runtime.js': ['Fragment', 'jsxDEV'],
  }
  const namedExports = exportsByBundle[outName]
  if (!namedExports) return
  const requireName = outName === 'react-dom-client.js'
    ? 'require_client'
    : outName === 'react-jsx-runtime.js'
      ? 'require_jsx_runtime'
      : outName === 'react-jsx-dev-runtime.js'
        ? 'require_jsx_dev_runtime'
        : 'require_react'
  code = code.replace(
    new RegExp(`export default ${requireName}\\(\\);\\s*$`),
    [
      `var __vn_vendor = ${requireName}();`,
      ...namedExports.map(name => `export const ${name} = __vn_vendor.${name};`),
      'export default __vn_vendor;',
      '',
    ].join('\n'),
  )
  writeFileSync(outPath, code)
}

async function transpileModule(filePath: string, outPath: string, distDir: string, rewriteFrameworkImports = false): Promise<void> {
  const result = await Bun.build({
    entrypoints: [filePath],
    format: 'esm',
    external: ['react', 'react/*', 'react-dom/*', './*', '../*', '../../*', '../../../*', '../../../../*'],
    minify: false,
  })
  if (!result.success) {
    throw new Error(result.logs.map(log => log.message).join('\n'))
  }

  let code = await result.outputs[0]!.text()
  code = replaceTsImportExtensions(code)
  if (rewriteFrameworkImports) code = rewriteGameFrameworkImports(code, outPath, distDir)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, code)
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

function writeConfiguredEmptyDataIndexes(
  gameDir: string,
  dataOutDir: string,
  config: Awaited<ReturnType<typeof validateGame>>['config'],
): void {
  const dataConfig = config.data ?? {}
  for (const configuredDir of Object.values(dataConfig)) {
    if (!configuredDir) continue
    const relDir = relative(join(gameDir, 'data'), join(gameDir, configuredDir))
    if (relDir.startsWith('..')) continue
    const indexPath = join(dataOutDir, relDir, 'index.json')
    if (existsSync(indexPath)) continue
    mkdirSync(dirname(indexPath), { recursive: true })
    writeFileSync(indexPath, JSON.stringify([], null, 2))
  }
}

function dirSize(dir: string): number {
  let total = 0
  if (!existsSync(dir)) return total
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) total += dirSize(fullPath)
    else total += statSync(fullPath).size
  }
  return total
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

function assertFile(path: string, label: string): void {
  if (!existsSync(path)) throw new Error(`Post-build smoke failed: missing ${label} (${path})`)
}

function assertJsImportsResolve(distDir: string): void {
  const jsFiles = walkFiles(distDir, ['.js'])
    .filter(file => !file.includes(`${join('framework', 'vendor')}`))
  const importRe = /(?:from\s+['"]|import\(\s*['"])(\.[^'"]+)(?:['"]\s*\)?)/g
  for (const file of jsFiles) {
    const code = readFileSync(file, 'utf8')
    for (const match of code.matchAll(importRe)) {
      const spec = match[1]!
      const resolved = join(dirname(file), spec)
      if (!resolved.startsWith(distDir)) {
        throw new Error(`Post-build smoke failed: ${relative(distDir, file)} imports outside dist: ${spec}`)
      }
      assertFile(resolved, `${relative(distDir, file)} import ${spec}`)
    }
  }
}

function readImportMap(html: string): Record<string, string> {
  const match = html.match(/<script\s+type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/)
  if (!match) return {}
  const parsed = JSON.parse(match[1]!) as { imports?: Record<string, string> }
  return parsed.imports ?? {}
}

function validateStaticOutput(distDir: string, config: Awaited<ReturnType<typeof validateGame>>['config']): void {
  const indexPath = join(distDir, 'index.html')
  assertFile(indexPath, 'index.html')
  assertFile(join(distDir, 'game.config.js'), 'game.config.js')
  assertFile(join(distDir, 'framework', 'engine', 'GameEngine.js'), 'framework engine')
  assertFile(join(distDir, 'framework', 'components', 'VnApp.js'), 'framework app component')
  assertFile(join(distDir, 'data', 'index.json'), 'data index')

  for (const storyPath of Object.values(config.story.locales)) {
    assertFile(join(distDir, storyPath.replace(/^\.\//, '').replace(/\.ink$/, '.json')), `story entry ${storyPath}`)
  }

  const html = readFileSync(indexPath, 'utf8')
  if (html.includes('../../framework/')) {
    throw new Error('Post-build smoke failed: index.html still references ../../framework/.')
  }
  const absoluteAssetRef = html.match(/\s(?:src|href)=["']\/(?!\/)/)
  if (absoluteAssetRef) {
    throw new Error('Post-build smoke failed: index.html contains root-absolute asset URLs.')
  }

  const importMap = readImportMap(html)
  for (const [name, target] of Object.entries(importMap)) {
    if (!target.startsWith('./')) throw new Error(`Post-build smoke failed: import "${name}" is not relative: ${target}`)
    assertFile(join(distDir, target), `import map target ${name}`)
  }
  assertJsImportsResolve(distDir)
}

function serializeDiagnostics(gameDir: string, issues: Awaited<ReturnType<typeof validateGame>>['issues']) {
  const summary = summarizeIssues(issues)
  return {
    summary,
    issues: issues.map(issue => ({
      severity: issue.severity,
      ...(issue.code ? { code: issue.code } : {}),
      path: issue.path.startsWith(gameDir) ? relative(gameDir, issue.path) : issue.path,
      message: issue.message,
      ...(issue.suggestion ? { suggestion: issue.suggestion } : {}),
      ...(issue.suppressed ? { suppressed: true } : {}),
      ...(issue.suppressionReason ? { suppressionReason: issue.suppressionReason } : {}),
    })),
  }
}

function writeBuildManifest(
  distDir: string,
  gameDir: string,
  config: Awaited<ReturnType<typeof validateGame>>['config'],
  issues: Awaited<ReturnType<typeof validateGame>>['issues'],
  mode: DistributionMode,
): void {
  const frameworkSize = dirSize(join(distDir, 'framework'))
  const assetsSize = dirSize(join(distDir, 'assets'))
  const storySize = dirSize(join(distDir, 'story'))
  const dataSize = dirSize(join(distDir, 'data'))
  const totalSize = dirSize(distDir)
  const plugins = (config.plugins ?? []).map(plugin => ({
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
    entry: plugin.entry ? plugin.entry.replace(/\.tsx?$/, '.js') : null,
    capabilities: plugin.capabilities,
    renderers: plugin.renderers ?? {},
    compatibility: plugin.compatibility ?? {},
  }))
  const manifest = {
    id: config.id,
    title: config.title,
    version: config.version,
    distribution: {
      mode,
      basePath: config.distribution?.basePath ?? null,
      strategy: 'esm-vendor-importmap',
      entry: 'index.html',
      wrappers: distributionWrapperFiles(mode),
    },
    pluginPolicy: {
      apiVersion: VN_PLUGIN_API_VERSION,
      trust: 'trusted-local-game-code',
      sandbox: 'none',
      load: 'declared-plugins-only',
      remoteEntriesAllowed: false,
    },
    warnings: issues.filter(issue => issue.severity === 'warning').length,
    diagnostics: serializeDiagnostics(gameDir, issues),
    plugins,
    sizes: {
      framework: frameworkSize,
      assets: assetsSize,
      story: storySize,
      data: dataSize,
      total: totalSize,
    },
  }
  writeFileSync(join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
}

function distributionWrapperFiles(mode: DistributionMode): string[] {
  if (mode === 'portal') return ['portal.json']
  if (mode === 'embedded') return ['embed.html']
  return []
}

function writeDistributionWrapper(distDir: string, config: Awaited<ReturnType<typeof validateGame>>['config'], mode: DistributionMode): void {
  if (mode === 'portal') {
    writeFileSync(join(distDir, 'portal.json'), JSON.stringify({
      contract: 'vn-portal-v1',
      id: config.id,
      title: config.title,
      version: config.version,
      basePath: config.distribution?.basePath ?? null,
      entry: 'index.html',
      manifest: 'manifest.json',
      assetsRoot: 'assets/',
      plugins: {
        count: config.plugins?.length ?? 0,
        policy: 'trusted-local-game-code',
        apiVersion: VN_PLUGIN_API_VERSION,
      },
    }, null, 2))
    return
  }

  if (mode === 'embedded') {
    writeFileSync(join(distDir, 'embed.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title} Embedded</title>
</head>
<body>
  <iframe src="./index.html" title="${config.title}" style="width:100%;height:100vh;border:0;display:block"></iframe>
</body>
</html>
`)
  }
}

export async function build(gameId?: string, ...args: string[]): Promise<void> {
  const parsed = parseBuildArgs(gameId, args)
  gameId = parsed.gameId
  if (!gameId) {
    console.error('Please specify a gameId: bun build <gameId>')
    process.exit(1)
  }

  const gameDir  = join(ROOT, 'games', gameId)
  const distDir  = join(ROOT, 'dist', gameId)
  const frameworkDir = join(ROOT, 'framework')

  console.log(`\n🔨 Building "${gameId}" → dist/${gameId}/\n`)

  console.log('  Validating content...')
  const { config, issues } = await validateGame(gameId)
  const mode = (parsed.options.mode ?? config.distribution?.mode ?? 'standalone') as DistributionMode
  if (mode !== 'standalone' && mode !== 'static') {
    issues.push({
      severity: 'info',
      path: 'game.config.ts',
      code: `distribution_${mode}_wrapper`,
      message: `Distribution mode "${mode}" uses the current static output plus a ${mode} wrapper contract.`,
      suggestion: 'Review manifest.json and wrapper files before integrating with the host.',
    })
  }
  const errors = issues.filter(issue => issue.severity === 'error')
  if (errors.length > 0) {
    printIssues(gameDir, issues)
    throw new Error(`Build blocked by ${errors.length} doctor error(s).`)
  }
  const warnings = issues.filter(issue => issue.severity === 'warning')
  const infos = issues.filter(issue => issue.severity === 'info')
  console.log(`    ✓ doctor passed (${warnings.length} warning${warnings.length === 1 ? '' : 's'}, ${infos.length} info)`)

  rmSync(distDir, { recursive: true, force: true })
  mkdirSync(distDir, { recursive: true })

  // 1. Compile configured story entrypoints. Included Ink files are compiled through these roots.
  console.log('  Compiling story entrypoints...')
  const storyEntries = Object.entries(config.story.locales)
  for (const [locale, storyPath] of storyEntries) {
    const inkFile = join(gameDir, storyPath)
    const rel = relative(join(gameDir, 'story'), inkFile)
    const outPath = join(distDir, 'story', rel.replace('.ink', '.json'))
    mkdirSync(join(outPath, '..'), { recursive: true })
    try {
      const json = await compileInk(inkFile)
      writeFileSync(outPath, json)
      console.log(`    ✓ ${locale}: ${rel}`)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      throw new Error(`Failed to compile ${rel}:\n${err.message}`)
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
      throw new Error(`Failed to convert data/${rel}:\n${err.message}`)
    }
  }
  writeDataIndexes(join(gameDir, 'data'), join(distDir, 'data'))
  writeConfiguredEmptyDataIndexes(gameDir, join(distDir, 'data'), config)

  // 3. Copy framework static files and transpile runtime TS/TSX as ESM.
  console.log('  Copying framework...')
  mkdirSync(join(distDir, 'framework'), { recursive: true })
  cpSync(frameworkDir, join(distDir, 'framework'), {
    recursive: true,
    filter: (src) => {
      if (src.includes('__tests__')) return false
      return (!src.endsWith('.tsx') && !src.endsWith('.ts')) || src.endsWith('.d.ts')
    },
  })

  console.log('  Transpiling framework modules...')
  const frameworkTsFiles = walkFiles(frameworkDir, ['.tsx', '.ts'])
    .filter(file => !file.endsWith('.d.ts') && !file.includes('__tests__'))
  for (const file of frameworkTsFiles) {
    const rel = relative(frameworkDir, file)
    const outPath = join(distDir, 'framework', rel.replace(/\.tsx?$/, '.js'))
    try {
      await transpileModule(file, outPath, distDir)
      console.log(`    ✓ framework/${rel.replace(/\.tsx?$/, '.js')}`)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      throw new Error(`Failed to transpile framework/${rel}:\n${err.message}`)
    }
  }

  console.log('  Transpiling game modules...')
  const gameTsFiles = walkFiles(gameDir, ['.tsx', '.ts']).filter(file => !file.endsWith('.d.ts'))
  for (const file of gameTsFiles) {
    const rel = relative(gameDir, file)
    const outPath = join(distDir, rel.replace(/\.tsx?$/, '.js'))
    try {
      await transpileModule(file, outPath, distDir, true)
      if (rel === 'game.config.ts') rewriteBuiltGameConfig(outPath, config)
      console.log(`    ✓ ${rel.replace(/\.tsx?$/, '.js')}`)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      throw new Error(`Failed to transpile ${rel}:\n${err.message}`)
    }
  }

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
    if (!result.success) throw new Error(`Failed to bundle vendor/${out}: ${result.logs.map(log => log.message).join('\n')}`)
    rewriteVendorNamedExports(join(vendorDir, out), out)
    console.log(`    ✓ vendor/${out}`)
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
    cpSync(mgDir, join(distDir, 'minigames'), {
      recursive: true,
      filter: (src) => !src.endsWith('.ts') && !src.endsWith('.tsx') && !src.endsWith('.d.ts'),
    })
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
    }})
    const tag = `<script type="importmap">${importMap}</script>`
    html = html.includes('<head>') ? html.replace('<head>', `<head>\n  ${tag}`) : tag + '\n' + html
    writeFileSync(join(distDir, 'index.html'), html)
  }

  console.log('  Running post-build smoke...')
  validateStaticOutput(distDir, config)
  writeDistributionWrapper(distDir, config, mode)
  writeBuildManifest(distDir, gameDir, config, issues, mode)
  console.log('    ✓ static output verified')

  const totalSize = dirSize(distDir)
  console.log('\n  Size report:')
  console.log(`    framework: ${formatBytes(dirSize(join(distDir, 'framework')))}`)
  console.log(`    assets:    ${formatBytes(dirSize(join(distDir, 'assets')))}`)
  console.log(`    story:     ${formatBytes(dirSize(join(distDir, 'story')))}`)
  console.log(`    data:      ${formatBytes(dirSize(join(distDir, 'data')))}`)
  console.log(`    total:     ${formatBytes(totalSize)}`)

  console.log(`\n✅ Build complete: dist/${gameId}/\n`)
}
