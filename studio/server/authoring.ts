import { existsSync, readFileSync, readdirSync } from 'fs'
import { extname, join, relative } from 'path'
import { validateGame, createDoctorJsonReport } from '../../manager/commands/doctor.ts'
import { listAssets } from './assets.ts'
import { getBuilds } from './builds.ts'
import type {
  StudioAuthoringAnalysisResponse,
  StudioAuthoringBranchPath,
  StudioAuthoringBranchStep,
  StudioAuthoringEdge,
  StudioAuthoringLocaleSummary,
  StudioAuthoringNode,
  StudioAuthoringNote,
  StudioAuthoringSearchResult,
  StudioSearchKind,
} from '../shared/types.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const GAMES_DIR = join(ROOT, 'games')
const NOTE_PATTERN = /\b(TODO|NOTE|FIXME|REVIEW)\b[:\-\s]*(.*)/i

interface TextFile {
  path: string
  fullPath: string
  text: string
}

interface ParseResult {
  nodes: StudioAuthoringNode[]
  edges: StudioAuthoringEdge[]
  notes: StudioAuthoringNote[]
  stats: Map<string, { choices: number; dialogue: number; knots: number }>
}

function assertGameId(gameId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(gameId)) throw new Error(`Invalid game id: ${gameId}`)
}

function walkFiles(dir: string, extensions: string[], baseDir = dir): TextFile[] {
  if (!existsSync(dir)) return []
  const files: TextFile[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, extensions, baseDir))
      continue
    }
    if (!extensions.includes(extname(entry.name).toLowerCase())) continue
    files.push({
      path: relative(baseDir, fullPath).replace(/\\/g, '/'),
      fullPath,
      text: readFileSync(fullPath, 'utf8'),
    })
  }
  return files.sort((a, b) => a.path.localeCompare(b.path))
}

function localeFromStoryPath(path: string): string {
  return path.split('/')[0] ?? ''
}

function rootId(locale: string, path: string): string {
  return `${locale}/__root__/${path}`
}

function knotId(locale: string, knot: string): string {
  return `${locale}/${knot}`
}

function targetName(raw: string): string | null {
  const target = raw
    .replace(/\s+#.*$/, '')
    .replace(/\s*\(.*?\)\s*$/, '')
    .trim()
  if (!target || target === 'DONE' || target === 'END') return null
  return target.replace(/^\./, '').split('.')[0] ?? null
}

function edgeTarget(locale: string, rawTarget: string, knownIds: Set<string>): { id: string; resolved: boolean } {
  const sameLocale = knotId(locale, rawTarget)
  if (knownIds.has(sameLocale)) return { id: sameLocale, resolved: true }
  const anyLocale = Array.from(knownIds).find(id => id.endsWith(`/${rawTarget}`))
  if (anyLocale) return { id: anyLocale, resolved: true }
  return { id: sameLocale, resolved: false }
}

function classifyLine(path: string, raw: string): StudioSearchKind {
  const line = raw.trim()
  if (path.startsWith('assets/')) return 'asset'
  if (/^#\s*\w+/.test(line) || /\s#\s*\w+/.test(line)) return 'tag'
  if (/^(VAR|CONST|LIST)\s+/i.test(line) || line.includes('{') || line.includes('}')) return 'variable'
  if (/^[A-ZÁÉÍÓÚÑa-záéíóúñ0-9_-]+:/.test(line)) return 'speaker'
  if (path.startsWith('story/') || path.endsWith('.ink')) return 'dialogue'
  if (path.startsWith('data/')) return 'data'
  return 'script'
}

function collectNotes(path: string, lines: string[]): StudioAuthoringNote[] {
  const notes: StudioAuthoringNote[] = []
  lines.forEach((raw, index) => {
    const match = NOTE_PATTERN.exec(raw)
    if (!match) return
    notes.push({
      path,
      line: index + 1,
      tag: (match[1] ?? 'NOTE').toUpperCase(),
      text: (match[2] ?? raw.trim()).trim() || raw.trim(),
    })
  })
  return notes
}

function parseStory(files: TextFile[]): ParseResult {
  const nodes: StudioAuthoringNode[] = []
  const pendingEdges: Array<Omit<StudioAuthoringEdge, 'to' | 'resolved'>> = []
  const notes: StudioAuthoringNote[] = []
  const stats = new Map<string, { choices: number; dialogue: number; knots: number }>()

  for (const file of files) {
    const locale = localeFromStoryPath(file.path)
    const lines = file.text.split(/\r?\n/)
    let current = rootId(locale, file.path)
    let hasRootNode = false
    const localeStats = stats.get(locale) ?? { choices: 0, dialogue: 0, knots: 0 }

    notes.push(...collectNotes(`story/${file.path}`, lines))

    lines.forEach((raw, index) => {
      const line = raw.trim()
      if (!line || line.startsWith('//') || line.startsWith('INCLUDE ')) return

      const knot = /^={2,3}\s*([A-Za-z0-9_.-]+)\s*=*/.exec(line)
      if (knot) {
        const title = knot[1] ?? `knot_${index + 1}`
        current = knotId(locale, title)
        nodes.push({ id: current, kind: 'knot', locale, path: file.path, line: index + 1, title })
        localeStats.knots += 1
        return
      }

      const choice = /^\+\s*(.*?)\s*(?:->\s*([A-Za-z0-9_.-]+))?\s*$/.exec(line)
      if (choice) {
        localeStats.choices += 1
        const rawTarget = choice[2] ? targetName(choice[2]) : null
        if (rawTarget) {
          pendingEdges.push({
            from: current,
            target: rawTarget,
            label: (choice[1] ?? '').replace(/\s*#.*$/, '').trim() || rawTarget,
            kind: 'choice',
            locale,
            path: file.path,
            line: index + 1,
          })
          if (current.startsWith(`${locale}/__root__/`)) hasRootNode = true
        }
        return
      }

      const divert = /^->\s*([A-Za-z0-9_.-]+|DONE|END)\s*$/.exec(line)
      if (divert) {
        const rawTarget = targetName(divert[1] ?? '')
        if (rawTarget) {
          pendingEdges.push({
            from: current,
            target: rawTarget,
            label: rawTarget,
            kind: 'divert',
            locale,
            path: file.path,
            line: index + 1,
          })
          if (current.startsWith(`${locale}/__root__/`)) hasRootNode = true
        }
        return
      }

      if (!line.startsWith('#') && !line.startsWith('*') && !line.startsWith('VAR ') && !line.startsWith('CONST ')) {
        localeStats.dialogue += 1
      }
    })

    if (hasRootNode) {
      nodes.push({ id: rootId(locale, file.path), kind: 'root', locale, path: file.path, line: 1, title: file.path })
    }
    stats.set(locale, localeStats)
  }

  const knownIds = new Set(nodes.map(node => node.id))
  const edges = pendingEdges.map(edge => {
    const target = edgeTarget(edge.locale, edge.target, knownIds)
    return { ...edge, to: target.id, resolved: target.resolved }
  })
  return { nodes, edges, notes, stats }
}

function reachableNodes(nodes: StudioAuthoringNode[], edges: StudioAuthoringEdge[], defaultLocale: string): Set<string> {
  const byFrom = new Map<string, StudioAuthoringEdge[]>()
  edges.filter(edge => edge.resolved).forEach(edge => {
    byFrom.set(edge.from, [...(byFrom.get(edge.from) ?? []), edge])
  })
  const roots = [
    ...nodes.filter(node => node.locale === defaultLocale && node.kind === 'root').map(node => node.id),
    ...nodes.filter(node => node.locale === defaultLocale && node.title === 'start').map(node => node.id),
    nodes.find(node => node.locale === defaultLocale && node.kind === 'knot')?.id,
  ].filter((id): id is string => typeof id === 'string')
  const seen = new Set<string>()
  const queue = [...roots]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    for (const edge of byFrom.get(id) ?? []) queue.push(edge.to)
  }
  return seen
}

function branchPaths(edges: StudioAuthoringEdge[], startIds: string[]): StudioAuthoringBranchPath[] {
  const byFrom = new Map<string, StudioAuthoringEdge[]>()
  edges.filter(edge => edge.resolved).forEach(edge => {
    byFrom.set(edge.from, [...(byFrom.get(edge.from) ?? []), edge])
  })
  const paths: StudioAuthoringBranchPath[] = []
  const visit = (node: string, steps: StudioAuthoringBranchStep[], seen: Set<string>) => {
    if (paths.length >= 8) return
    if (steps.length >= 10) {
      paths.push({ id: `path_${paths.length + 1}`, steps, terminal: node, stoppedBy: 'depth' })
      return
    }
    const nextEdges = byFrom.get(node) ?? []
    if (nextEdges.length === 0) {
      paths.push({ id: `path_${paths.length + 1}`, steps, terminal: node, stoppedBy: 'end' })
      return
    }
    for (const edge of nextEdges.slice(0, 4)) {
      if (seen.has(edge.to)) {
        paths.push({
          id: `path_${paths.length + 1}`,
          steps: [...steps, { node: edge.to, via: edge.label, kind: edge.kind }],
          terminal: edge.to,
          stoppedBy: 'cycle',
        })
        continue
      }
      visit(edge.to, [...steps, { node: edge.to, via: edge.label, kind: edge.kind }], new Set([...seen, edge.to]))
    }
  }
  startIds.slice(0, 3).forEach(start => visit(start, [], new Set([start])))
  return paths
}

function searchTextFiles(files: TextFile[], query: string, prefix = ''): StudioAuthoringSearchResult[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []
  const results: StudioAuthoringSearchResult[] = []
  for (const file of files) {
    const lines = file.text.split(/\r?\n/)
    lines.forEach((raw, index) => {
      if (!raw.toLowerCase().includes(normalized)) return
      const path = `${prefix}${file.path}`
      results.push({
        path,
        line: index + 1,
        kind: classifyLine(path, raw),
        snippet: raw.trim(),
      })
    })
  }
  return results
}

function localization(files: TextFile[], locales: string[], stats: ParseResult['stats']): StudioAuthoringLocaleSummary[] {
  const byLocale = new Map<string, string[]>()
  files.forEach(file => {
    const locale = localeFromStoryPath(file.path)
    const rel = file.path.split('/').slice(1).join('/')
    byLocale.set(locale, [...(byLocale.get(locale) ?? []), rel])
  })
  const allRelativeFiles = new Set(Array.from(byLocale.values()).flat())
  return locales.map(locale => {
    const localeFiles = new Set(byLocale.get(locale) ?? [])
    const localeStats = stats.get(locale) ?? { choices: 0, dialogue: 0, knots: 0 }
    return {
      locale,
      storyFiles: localeFiles.size,
      knots: localeStats.knots,
      choices: localeStats.choices,
      dialogueLines: localeStats.dialogue,
      missingFiles: Array.from(allRelativeFiles).filter(path => !localeFiles.has(path)),
      extraFiles: Array.from(localeFiles).filter(path => !Array.from(allRelativeFiles).includes(path)),
    }
  })
}

export async function analyzeAuthoring(gameId: string, query = ''): Promise<StudioAuthoringAnalysisResponse> {
  assertGameId(gameId)
  const { config, gameDir, issues } = await validateGame(gameId)
  const storyFiles = walkFiles(join(gameDir, 'story'), ['.ink'])
  const dataFiles = walkFiles(join(gameDir, 'data'), ['.md'])
  const parsed = parseStory(storyFiles)
  const reachable = reachableNodes(parsed.nodes, parsed.edges, config.story.defaultLocale)
  const knotNodes = parsed.nodes.filter(node => node.kind === 'knot')
  const startIds = parsed.nodes
    .filter(node => node.locale === config.story.defaultLocale && (node.kind === 'root' || node.title === 'start'))
    .map(node => node.id)
  const assets = await listAssets(gameId)
  const assetResults: StudioAuthoringSearchResult[] = query.trim()
    ? assets
      .filter(asset => asset.path.toLowerCase().includes(query.trim().toLowerCase()))
      .map(asset => ({ path: `assets/${asset.path}`, line: 1, kind: 'asset', snippet: asset.path }))
    : []
  const search = [
    ...searchTextFiles(storyFiles, query, 'story/'),
    ...searchTextFiles(dataFiles, query, 'data/'),
    ...assetResults,
  ].slice(0, 80)
  const buildState = getBuilds(gameId).latest

  return {
    graph: {
      nodes: parsed.nodes,
      edges: parsed.edges,
    },
    coverage: {
      totalKnots: knotNodes.length,
      reachableKnots: knotNodes.filter(node => reachable.has(node.id)).length,
      unreachableKnots: knotNodes.filter(node => !reachable.has(node.id)),
      unresolvedEdges: parsed.edges.filter(edge => !edge.resolved),
    },
    search,
    notes: [
      ...parsed.notes,
      ...dataFiles.flatMap(file => collectNotes(`data/${file.path}`, file.text.split(/\r?\n/))),
    ].slice(0, 80),
    localization: localization(storyFiles, Object.keys(config.story.locales), parsed.stats),
    branches: branchPaths(parsed.edges, startIds),
    debug: {
      diagnostics: createDoctorJsonReport(gameId, gameDir, issues).summary,
      buildStatus: buildState?.status ?? 'none',
      buildMode: buildState?.mode ?? null,
      manifestUrl: buildState?.manifestUrl ?? null,
    },
  }
}
