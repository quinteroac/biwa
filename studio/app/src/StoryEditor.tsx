import Editor from '@monaco-editor/react'
import { layoutWithLines, prepareWithSegments } from '@chenglou/pretext'
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState } from '@xyflow/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentProps, CSSProperties, FormEvent, KeyboardEvent, PointerEvent, Ref } from 'react'
import type { Edge, Node, NodeProps } from '@xyflow/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import '@xyflow/react/dist/style.css'
import { createStoryFolder, deleteStoryFile, deleteStoryFolder, fetchStoryFile, fetchStoryFiles, renameStoryFile, renameStoryFolder, saveStoryFile } from './api.ts'
import { StudioIcon } from './StudioIcon.tsx'
import type { StudioProjectSummary, StudioStoryFile, StudioStoryFolder } from '../../shared/types.ts'

type SymbolTab = 'Symbols' | 'Characters' | 'Variables' | 'Functions' | 'Lists' | 'Tags'

interface StoryFileGroup {
  locale: string
  files: StudioStoryFile[]
}

interface StorySymbol {
  label: string
  line: number
  type: SymbolTab
}

interface StoryPanelLayout {
  left: number
  editor: number
  flow: number
  runtime: number
}

const STORY_EDITOR_FONT_FAMILY = '"Source Code Pro", "SFMono-Regular", Consolas, monospace'
const STORY_RUNTIME_FONT_FAMILY = '"IBM Plex Serif", Georgia, serif'

interface SimChoice {
  label: string
  target: string | null
}

interface SimTag {
  name: string
  value: string
  raw: string
  line: number
}

interface SimNode {
  id: string
  title: string
  startLine: number
  lines: string[]
  tags: SimTag[]
  choices: SimChoice[]
  divert: string | null
}

interface TextSimulator {
  start: string | null
  nodes: Map<string, SimNode>
}

type StoryFlowCardKind = 'knot' | 'choice'

interface StoryFlowCard {
  id: string
  kind: StoryFlowCardKind
  title: string
  subtitle: string | null
  meta: string[]
  line: number | null
  x: number
  y: number
  width: number
  height: number
}

interface StoryFlowEdge {
  id: string
  from: string
  to: string
}

interface StoryFlowGraph {
  cards: StoryFlowCard[]
  edges: StoryFlowEdge[]
  width: number
  height: number
}

interface StoryFlowNodeData extends Record<string, unknown> {
  active: boolean
  kind: StoryFlowCardKind
  line: number | null
  meta: string[]
  onJumpToLine: (line: number) => void
  subtitle: string | null
  title: string
}

type StoryFlowNode = Node<StoryFlowNodeData, 'storyFlow'>

interface SimulatorStep {
  node: string
  choice?: string
}

interface SimulatorState {
  steps: SimulatorStep[]
  selectedChoice: number
  terminal: string | null
}

type StoryDebugTab = 'Tags' | 'Call Stack'

interface EditingTag {
  line: number
  name: string
  value: string
}

type StoryDialogMode = 'new-file' | 'new-folder' | 'rename-folder' | 'discard-new-file' | 'delete-file' | 'delete-folder'

interface StoryDialogState {
  mode: StoryDialogMode
  value: string
  error: string | null
  targetPath?: string
}

interface RenamingFileState {
  path: string
  value: string
  error: string | null
}

function PretextText(props: {
  className?: string
  font: string
  lineHeight: number
  maxLines?: number
  text: string
  width: number
}) {
  const lines = useMemo(() => {
    const prepared = prepareWithSegments(props.text || ' ', props.font, { whiteSpace: 'normal' })
    const result = layoutWithLines(prepared, props.width, props.lineHeight)
    const maxLines = props.maxLines ?? result.lines.length
    return result.lines.slice(0, maxLines).map((line, index, visibleLines) => {
      const isTruncated = result.lines.length > maxLines && index === visibleLines.length - 1
      return isTruncated ? `${line.text.replace(/\s+$/, '')}...` : line.text
    })
  }, [props.font, props.lineHeight, props.maxLines, props.text, props.width])

  return (
    <span
      className={props.className ? `pretext-fixed ${props.className}` : 'pretext-fixed'}
      style={{
        '--pretext-line-height': `${props.lineHeight}px`,
        '--pretext-lines': props.maxLines ?? lines.length,
      } as CSSProperties}
    >
      {lines.map((line, index) => <span key={`${index}-${line}`}>{line}</span>)}
    </span>
  )
}

function FolderIcon(props: { open: boolean }) {
  return (
    <svg aria-hidden="true" className="story-folder-icon" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M3.5 7.5h6l1.8 2H20.5v8.8a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2V7.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M3.5 7.5V5.7a2.2 2.2 0 0 1 2.2-2.2h3.2l2 2H18a2.2 2.2 0 0 1 2.2 2.2v1.8"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        className="story-folder-chevron"
        d={props.open ? 'm8.5 12 3.5 3.5 3.5-3.5' : 'm10 8.5 3.5 3.5-3.5 3.5'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function TagKindIcon(props: { name: string }) {
  const tag = props.name.toLowerCase()
  if (tag.includes('atmosphere')) {
    return (
      <svg aria-hidden="true" className="story-tag-kind-icon" viewBox="0 0 32 32">
        <path d="M9 17.5c-2.8.1-4.8-1.3-4.8-3.6 0-2.2 1.7-3.7 4.1-3.7.9-3.2 3.2-4.9 6.7-4.9 3.2 0 5.5 1.6 6.6 4.5 3.2.1 5.2 1.8 5.2 4.2 0 2.5-2.1 3.8-5.2 3.8H9Z" />
        <path d="m9.2 22-1.4 3.1M15 22l-1.4 3.1M20.9 22l-1.4 3.1" />
      </svg>
    )
  }
  if (tag === 'bgm' || tag === 'sfx') {
    return (
      <svg aria-hidden="true" className="story-tag-kind-icon" viewBox="0 0 32 32">
        <path d="M9.5 22.5c0 2.1-1.8 3.4-4 3-2-.4-3.1-2-2.4-3.7.6-1.5 2.2-2.2 4-1.8.9.2 1.7.7 2.4 1.2V8.1l15-2.6v13.8" />
        <path d="M24.5 19.3c0 2.1-1.8 3.4-4 3-2-.4-3.1-2-2.4-3.7.6-1.5 2.2-2.2 4-1.8.9.2 1.7.7 2.4 1.2" />
        <path d="M9.5 12.2 24.5 9.5" />
      </svg>
    )
  }
  if (tag === 'character') {
    return (
      <svg aria-hidden="true" className="story-tag-kind-icon" viewBox="0 0 32 32">
        <path d="M8.2 25.2c.6-4.7 3.1-7 7.6-7s7 2.3 7.8 7" />
        <path d="M11.2 10.9c.2-3.6 2.1-5.5 4.8-5.5s4.6 1.9 4.8 5.5c.2 3.4-1.9 5.5-4.8 5.5s-5-2.1-4.8-5.5Z" />
        <path d="M21.8 7.2c3.5.2 5.3 1.9 5.3 4.8 0 2.4-1.4 4-4.2 4.8" />
      </svg>
    )
  }
  if (tag === 'scene') {
    return (
      <svg aria-hidden="true" className="story-tag-kind-icon" viewBox="0 0 32 32">
        <path d="m5.1 15.6 10.4-10.4h9.2v9.2L14.3 24.8 5.1 15.6Z" />
        <path d="M20.8 9.1h.1" />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" className="story-tag-kind-icon" viewBox="0 0 32 32">
      <path d="M6 8.5h20M6 16h20M6 23.5h20" />
      <path d="M11 5.5 8.6 26.5M23.4 5.5 21 26.5" />
    </svg>
  )
}

function fileName(path: string): string {
  return path.split('/').at(-1) ?? path
}

function relativeStoryPath(path: string): string {
  return path.replace(/^story\//, '')
}

function groupStoryFiles(files: StudioStoryFile[], folders: StudioStoryFolder[]): StoryFileGroup[] {
  const groups = new Map<string, StudioStoryFile[]>()
  for (const folder of folders) {
    groups.set(folder.locale || folder.path || 'root', groups.get(folder.locale || folder.path || 'root') ?? [])
  }
  for (const file of files) {
    const key = file.locale || 'root'
    groups.set(key, [...(groups.get(key) ?? []), file])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([locale, groupFiles]) => ({
      locale,
      files: [...groupFiles].sort((a, b) => a.path.localeCompare(b.path)),
    }))
}

function currentStoryFolder(activePath: string | null, fallbackLocale: string): string {
  if (!activePath) return fallbackLocale
  const parts = activePath.split('/')
  parts.pop()
  return parts.join('/') || fallbackLocale
}

function normalizeStoryFolderInput(raw: string): string {
  return raw.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

function normalizeStoryFileInput(raw: string, folder: string): string {
  const normalized = normalizeStoryFolderInput(raw)
  if (!normalized) return ''
  const withExtension = normalized.endsWith('.ink') ? normalized : `${normalized}.ink`
  return withExtension.includes('/') ? withExtension : `${folder}/${withExtension}`
}

function extractSymbols(content: string): StorySymbol[] {
  return content.split('\n').flatMap<StorySymbol>((line, index) => {
    const lineNumber = index + 1
    const knot = line.match(/^={2,}\s*([^=].*?)\s*=*$/)
    if (knot) return [{ label: knot[1]?.trim() ?? 'Untitled knot', line: lineNumber, type: 'Symbols' }]

    const character = line.match(/^#\s*character:\s*([^,\s]+)/)
    if (character) return [{ label: character[1] ?? 'character', line: lineNumber, type: 'Characters' }]

    const variable = line.match(/^VAR\s+([A-Za-z_][\w]*)/)
    if (variable) return [{ label: variable[1] ?? 'variable', line: lineNumber, type: 'Variables' }]

    const functionName = line.match(/^===\s*function\s+([A-Za-z_][\w]*)/)
    if (functionName) return [{ label: functionName[1] ?? 'function', line: lineNumber, type: 'Functions' }]

    const list = line.match(/^LIST\s+([A-Za-z_][\w]*)/)
    if (list) return [{ label: list[1] ?? 'list', line: lineNumber, type: 'Lists' }]

    const tag = line.match(/^#\s*([^:]+):/)
    if (tag) return [{ label: tag[1]?.trim() ?? 'tag', line: lineNumber, type: 'Tags' }]

    return []
  })
}

function jumpToLine(
  editor: Parameters<NonNullable<ComponentProps<typeof Editor>['onMount']>>[0] | null,
  line: number,
): void {
  if (!editor) return
  editor.revealLineInCenter(line)
  editor.setPosition({ lineNumber: line, column: 1 })
  editor.focus()
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function cleanChoiceLabel(raw: string): string {
  const trimmed = raw.replace(/\s+#.*$/, '').trim()
  const bracket = /^\[(.*)\]$/.exec(trimmed)
  return (bracket?.[1] ?? trimmed).trim()
}

function cleanTarget(raw: string): string | null {
  const target = raw.replace(/\s+#.*$/, '').trim()
  if (!target || target === 'DONE' || target === 'END') return null
  return target.replace(/^\./, '').split('.')[0] ?? null
}

function parseSimTag(raw: string, line: number): SimTag | null {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('#')) return null
  const content = trimmed.replace(/^#\s*/, '').trim()
  if (!content) return null
  const colon = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(content)
  if (colon) {
    return {
      name: colon[1] ?? 'tag',
      value: colon[2]?.trim() ?? '',
      raw: trimmed,
      line,
    }
  }
  const [name = 'tag', ...rest] = content.split(/\s+/)
  return {
    name,
    value: rest.join(' ').trim(),
    raw: trimmed,
    line,
  }
}

function parseTextSimulator(content: string): TextSimulator {
  const nodes = new Map<string, SimNode>()
  const root: SimNode = { id: '__root__', title: 'Start', startLine: 1, lines: [], tags: [], choices: [], divert: null }
  nodes.set(root.id, root)
  let current = root
  let firstKnot: string | null = null
  const lines = content.split(/\r?\n/)

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index] ?? ''
    const line = raw.trim()
    if (!line || line.startsWith('//')) continue
    const tag = parseSimTag(line, index + 1)
    if (tag) {
      current.tags.push(tag)
      continue
    }
    if (line.startsWith('INCLUDE ') || line.startsWith('VAR ') || line.startsWith('CONST ') || line.startsWith('EXTERNAL ')) continue

    const knot = /^={2,3}\s*([^=]+?)\s*=*$/.exec(line)
    if (knot) {
      const title = knot[1]?.trim() ?? `knot_${index + 1}`
      current = { id: title, title, startLine: index + 1, lines: [], tags: [], choices: [], divert: null }
      nodes.set(title, current)
      firstKnot ??= title
      continue
    }

    const choice = /^\s*[*+]\s*(.*?)(?:\s*->\s*([A-Za-z0-9_.-]+|DONE|END))?\s*$/.exec(raw)
    if (choice) {
      let target = choice[2] ? cleanTarget(choice[2]) : null
      if (!target) {
        for (let next = index + 1; next < lines.length; next++) {
          const nextLine = (lines[next] ?? '').trim()
          if (!nextLine) continue
          const nestedDivert = /^->\s*([A-Za-z0-9_.-]+|DONE|END)\s*$/.exec(nextLine)
          if (nestedDivert) target = cleanTarget(nestedDivert[1] ?? '')
          break
        }
      }
      current.choices.push({ label: cleanChoiceLabel(choice[1] ?? ''), target })
      continue
    }

    const divert = /^->\s*([A-Za-z0-9_.-]+|DONE|END)\s*$/.exec(line)
    if (divert) {
      current.divert = cleanTarget(divert[1] ?? '')
      continue
    }

    current.lines.push(line.replace(/\s+#.*$/, '').trim())
  }

  const start = firstKnot ?? (root.lines.length || root.choices.length || root.divert ? root.id : null)
  return { start, nodes }
}

function advanceSimulator(simulator: TextSimulator, steps: SimulatorStep[]): SimulatorStep[] {
  const advanced = [...steps]
  const seen = new Set<string>()
  while (advanced.length > 0) {
    const current = advanced.at(-1)
    if (!current || seen.has(current.node)) break
    seen.add(current.node)
    const node = simulator.nodes.get(current.node)
    if (!node || node.choices.length > 0 || !node.divert) break
    if (!simulator.nodes.has(node.divert)) break
    advanced.push({ node: node.divert, choice: node.divert })
  }
  return advanced
}

function initialSimulatorState(simulator: TextSimulator): SimulatorState {
  return {
    steps: simulator.start ? advanceSimulator(simulator, [{ node: simulator.start }]) : [],
    selectedChoice: 0,
    terminal: null,
  }
}

function nodeFlowMeta(node: SimNode): string[] {
  const preferred = ['scene', 'atmosphere', 'bgm', 'sfx', 'character']
  const tags = [...node.tags].sort((a, b) => {
    const aIndex = preferred.indexOf(a.name)
    const bIndex = preferred.indexOf(b.name)
    return (aIndex === -1 ? preferred.length : aIndex) - (bIndex === -1 ? preferred.length : bIndex)
  })
  return tags.slice(0, 2).map(tag => `${tag.name}: ${tag.value || '(empty)'}`)
}

function outgoingTargets(node: SimNode): string[] {
  const targets = node.choices.flatMap(choice => choice.target ? [choice.target] : [])
  if (node.divert) targets.push(node.divert)
  return targets
}

function buildStoryFlowGraph(simulator: TextSimulator): StoryFlowGraph {
  if (!simulator.start) return { cards: [], edges: [], width: 560, height: 420 }

  const depths = new Map<string, number>([[simulator.start, 0]])
  const queue = [simulator.start]
  for (let index = 0; index < queue.length; index++) {
    const nodeId = queue[index]
    if (!nodeId) continue
    const node = simulator.nodes.get(nodeId)
    if (!node) continue
    const depth = depths.get(nodeId) ?? 0
    for (const target of outgoingTargets(node)) {
      if (!simulator.nodes.has(target) || depths.has(target)) continue
      depths.set(target, depth + 1)
      queue.push(target)
    }
  }

  const reachableNodes = [...depths.keys()]
    .map(id => simulator.nodes.get(id))
    .filter((node): node is SimNode => Boolean(node))
  const layers = new Map<number, SimNode[]>()
  for (const node of reachableNodes) {
    const depth = depths.get(node.id) ?? 0
    layers.set(depth, [...(layers.get(depth) ?? []), node])
  }

  const cards: StoryFlowCard[] = []
  const edges: StoryFlowEdge[] = []
  const nodeCards = new Map<string, StoryFlowCard>()
  const knotWidth = 180
  const knotHeight = 92
  const choiceWidth = 174
  const choiceHeight = 62
  const layerGap = 270
  const columnGap = 44
  const topPadding = 38
  const leftPadding = 24

  for (const [depth, nodes] of [...layers.entries()].sort(([a], [b]) => a - b)) {
    const sorted = [...nodes].sort((a, b) => a.startLine - b.startLine || a.title.localeCompare(b.title))
    const startX = leftPadding
    sorted.forEach((node, index) => {
      const card: StoryFlowCard = {
        id: `node:${node.id}`,
        kind: 'knot',
        title: node.title,
        subtitle: node.id === simulator.start ? 'entry knot' : null,
        meta: nodeFlowMeta(node),
        line: node.startLine,
        x: startX + index * (knotWidth + columnGap),
        y: topPadding + depth * layerGap,
        width: knotWidth,
        height: knotHeight,
      }
      cards.push(card)
      nodeCards.set(node.id, card)
    })
  }

  for (const node of reachableNodes) {
    const source = nodeCards.get(node.id)
    if (!source) continue
    const choices = node.choices
    const choiceGap = 18
    const choiceGroupWidth = choices.length * choiceWidth + Math.max(0, choices.length - 1) * choiceGap
    const choiceStartX = Math.max(leftPadding, source.x + source.width / 2 - choiceGroupWidth / 2)
    choices.forEach((choice, index) => {
      const choiceId = `choice:${node.id}:${index}`
      const choiceCard: StoryFlowCard = {
        id: choiceId,
        kind: 'choice',
        title: choice.label || `Choice ${index + 1}`,
        subtitle: choice.target,
        meta: [],
        line: null,
        x: choiceStartX + index * (choiceWidth + choiceGap),
        y: source.y + 136,
        width: choiceWidth,
        height: choiceHeight,
      }
      cards.push(choiceCard)
      edges.push({ id: `edge:${source.id}:${choiceId}`, from: source.id, to: choiceId })
      if (choice.target && nodeCards.has(choice.target)) {
        edges.push({ id: `edge:${choiceId}:node:${choice.target}`, from: choiceId, to: `node:${choice.target}` })
      }
    })
    if (node.divert && nodeCards.has(node.divert)) {
      edges.push({ id: `edge:${source.id}:node:${node.divert}`, from: source.id, to: `node:${node.divert}` })
    }
  }

  const width = Math.max(560, ...cards.map(card => card.x + card.width + leftPadding))
  const height = Math.max(420, ...cards.map(card => card.y + card.height + 72))
  return { cards, edges, width, height }
}

function StoryFlowNodeView({ data }: NodeProps<StoryFlowNode>) {
  const canJump = data.line !== null
  return (
    <div className={`story-flow-card is-${data.kind} ${data.active ? 'is-active' : ''}`}>
      <Handle className="story-flow-handle" position={Position.Top} type="target" />
      <button
        className="story-flow-card-button"
        disabled={!canJump}
        onClick={() => {
          if (data.line !== null) data.onJumpToLine(data.line)
        }}
        type="button"
      >
        <strong>{data.title}</strong>
        {data.subtitle ? <span>{data.subtitle}</span> : null}
        {data.meta.map(meta => <small key={meta}>{meta}</small>)}
      </button>
      <Handle className="story-flow-handle" position={Position.Bottom} type="source" />
    </div>
  )
}

const storyFlowNodeTypes = {
  storyFlow: StoryFlowNodeView,
}

function StoryFlowPanel(props: {
  activeNodeId: string | null
  graph: StoryFlowGraph
  onJumpToLine: (line: number) => void
  panelRef: Ref<HTMLElement>
}) {
  const generatedFlowNodes = useMemo<StoryFlowNode[]>(() => props.graph.cards.map(card => ({
    id: card.id,
    type: 'storyFlow',
    position: { x: card.x, y: card.y },
    data: {
      active: card.id === `node:${props.activeNodeId ?? ''}`,
      kind: card.kind,
      line: card.line,
      meta: card.meta,
      onJumpToLine: props.onJumpToLine,
      subtitle: card.subtitle,
      title: card.title,
    },
    draggable: true,
    selectable: true,
    style: {
      minHeight: card.height,
      width: card.width,
    },
  })), [props.activeNodeId, props.graph.cards, props.onJumpToLine])
  const generatedFlowEdges = useMemo<Edge[]>(() => props.graph.edges.map(edge => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
    },
    style: {
      stroke: '#747878',
      strokeWidth: 1.7,
    },
  })), [props.graph.edges])
  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState<StoryFlowNode>(generatedFlowNodes)
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState(generatedFlowEdges)

  useEffect(() => {
    setFlowNodes(current => generatedFlowNodes.map(node => {
      const existing = current.find(item => item.id === node.id)
      return existing ? { ...node, position: existing.position } : node
    }))
  }, [generatedFlowNodes, setFlowNodes])

  useEffect(() => {
    setFlowEdges(generatedFlowEdges)
  }, [generatedFlowEdges, setFlowEdges])

  return (
    <section className="story-flow-panel" ref={props.panelRef}>
      <div className="story-flow-heading">
        <strong>Story Flow</strong>
        <span aria-label="Flow is derived from Ink knots, choices, diverts, and runtime tags">i</span>
      </div>
      <div className="story-flow-scroll" style={{ '--story-flow-width': `${props.graph.width}px`, '--story-flow-height': `${props.graph.height}px` } as CSSProperties}>
        {props.graph.cards.length === 0 ? (
          <p className="muted">No knots or choices found for this Ink file.</p>
        ) : (
          <ReactFlowProvider>
            <ReactFlow
              colorMode="light"
              edges={flowEdges}
              elementsSelectable
              fitView
              fitViewOptions={{ padding: 0.18 }}
              maxZoom={1.45}
              minZoom={0.42}
              nodes={flowNodes}
              nodesConnectable={false}
              nodesDraggable
              nodeTypes={storyFlowNodeTypes}
              onEdgesChange={onFlowEdgesChange}
              onNodesChange={onFlowNodesChange}
              panOnDrag
              panOnScroll
              proOptions={{ hideAttribution: true }}
              zoomOnDoubleClick={false}
              zoomOnPinch
              zoomOnScroll
            >
              <Background color="#c4c7c7" gap={12} size={1.2} />
              <Controls position="bottom-left" showInteractive={false} />
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </div>
    </section>
  )
}

export function StoryEditor(props: {
  project: StudioProjectSummary
  onRunDoctor: () => void
  isRunningDoctor: boolean
}) {
  const queryClient = useQueryClient()
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [fileSearch, setFileSearch] = useState('')
  const [collapsedFolders, setCollapsedFolders] = useState<ReadonlySet<string>>(() => new Set())
  const [panelLayout, setPanelLayout] = useState<StoryPanelLayout>({ left: 10, editor: 44, flow: 24, runtime: 22 })
  const [simulatorState, setSimulatorState] = useState<SimulatorState>({ steps: [], selectedChoice: 0, terminal: null })
  const [activeDebugTab, setActiveDebugTab] = useState<StoryDebugTab>('Tags')
  const [editingTag, setEditingTag] = useState<EditingTag | null>(null)
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [newTag, setNewTag] = useState({ name: '', value: '' })
  const [storyDialog, setStoryDialog] = useState<StoryDialogState | null>(null)
  const [renamingFile, setRenamingFile] = useState<RenamingFileState | null>(null)
  const [openFileMenu, setOpenFileMenu] = useState<string | null>(null)
  const [openFolderMenu, setOpenFolderMenu] = useState<string | null>(null)
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const filePanelRef = useRef<HTMLElement | null>(null)
  const editorPanelRef = useRef<HTMLElement | null>(null)
  const flowPanelRef = useRef<HTMLElement | null>(null)
  const runtimePanelRef = useRef<HTMLElement | null>(null)
  const editorRef = useRef<Parameters<NonNullable<ComponentProps<typeof Editor>['onMount']>>[0] | null>(null)
  const storyFilesQuery = useQuery({
    queryKey: ['story-files', props.project.id],
    queryFn: () => fetchStoryFiles(props.project.id),
  })
  const files = useMemo(() => storyFilesQuery.data?.files ?? [], [storyFilesQuery.data])
  const folders = useMemo(() => storyFilesQuery.data?.folders ?? [], [storyFilesQuery.data])
  const filteredFiles = useMemo(() => {
    const query = fileSearch.trim().toLowerCase()
    if (!query) return files
    return files.filter(file => file.path.toLowerCase().includes(query))
  }, [fileSearch, files])
  const filteredFolders = useMemo(() => {
    const query = fileSearch.trim().toLowerCase()
    if (!query) return folders
    return folders.filter(folder => folder.path.toLowerCase().includes(query))
  }, [fileSearch, folders])
  const fileGroups = useMemo(() => groupStoryFiles(filteredFiles, filteredFolders), [filteredFiles, filteredFolders])
  const activePath = selectedPath ?? files[0]?.path ?? null
  const storyFileQuery = useQuery({
    queryKey: ['story-file', props.project.id, activePath],
    queryFn: () => fetchStoryFile(props.project.id, activePath ?? ''),
    enabled: Boolean(activePath),
  })
  const saveMutation = useMutation({
    mutationFn: () => saveStoryFile(props.project.id, activePath ?? '', draft),
    onSuccess: (response) => {
      setDraft(response.content)
      setSavedContent(response.content)
      queryClient.setQueryData(['story-file', props.project.id, activePath], response)
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })
  const createFileMutation = useMutation({
    mutationFn: (path: string) => saveStoryFile(props.project.id, path, `=== start ===\n\n`),
    onSuccess: response => {
      setStoryDialog(null)
      setSelectedPath(response.file.path)
      setDraft(response.content)
      setSavedContent(response.content)
      queryClient.setQueryData(['story-file', props.project.id, response.file.path], response)
      queryClient.invalidateQueries({ queryKey: ['story-files', props.project.id] })
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
      setCollapsedFolders(current => {
        const next = new Set(current)
        next.delete(response.file.locale)
        return next
      })
    },
    onError: error => {
      setStoryDialog(current => current
        ? { ...current, error: error instanceof Error ? error.message : String(error) }
        : current)
    },
  })
  const createFolderMutation = useMutation({
    mutationFn: (path: string) => createStoryFolder(props.project.id, path),
    onSuccess: (response, path) => {
      setStoryDialog(null)
      queryClient.setQueryData(['story-files', props.project.id], response)
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
      const locale = path.split('/')[0] ?? path
      setCollapsedFolders(current => {
        const next = new Set(current)
        next.delete(locale)
        return next
      })
    },
    onError: error => {
      setStoryDialog(current => current
        ? { ...current, error: error instanceof Error ? error.message : String(error) }
        : current)
    },
  })
  const renameFileMutation = useMutation({
    mutationFn: (paths: { fromPath: string; toPath: string }) => renameStoryFile(props.project.id, paths.fromPath, paths.toPath),
    onSuccess: (response, paths) => {
      setRenamingFile(null)
      setSelectedPath(response.file.path)
      setDraft(response.content)
      setSavedContent(response.content)
      queryClient.removeQueries({ queryKey: ['story-file', props.project.id, paths.fromPath] })
      queryClient.setQueryData(['story-file', props.project.id, response.file.path], response)
      queryClient.invalidateQueries({ queryKey: ['story-files', props.project.id] })
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
      setCollapsedFolders(current => {
        const next = new Set(current)
        next.delete(response.file.locale)
        return next
      })
    },
    onError: error => {
      setRenamingFile(current => current
        ? { ...current, error: error instanceof Error ? error.message : String(error) }
        : current)
    },
  })
  const renameFolderMutation = useMutation({
    mutationFn: (paths: { fromPath: string; toPath: string }) => renameStoryFolder(props.project.id, paths.fromPath, paths.toPath),
    onSuccess: (response, paths) => {
      setStoryDialog(null)
      queryClient.setQueryData(['story-files', props.project.id], response)
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
      if (activePath?.startsWith(`${paths.fromPath}/`)) {
        const nextPath = `${paths.toPath}/${activePath.slice(paths.fromPath.length + 1)}`
        queryClient.removeQueries({ queryKey: ['story-file', props.project.id, activePath] })
        setSelectedPath(nextPath)
      }
      setCollapsedFolders(current => {
        const next = new Set(current)
        next.delete(paths.toPath)
        return next
      })
    },
    onError: error => {
      setStoryDialog(current => current
        ? { ...current, error: error instanceof Error ? error.message : String(error) }
        : current)
    },
  })
  const deleteFileMutation = useMutation({
    mutationFn: (path: string) => deleteStoryFile(props.project.id, path),
    onSuccess: (response, deletedPath) => {
      setStoryDialog(null)
      queryClient.setQueryData(['story-files', props.project.id], response)
      queryClient.removeQueries({ queryKey: ['story-file', props.project.id, deletedPath] })
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
      if (activePath === deletedPath) {
        const nextFile = response.files.find(file => file.path !== deletedPath) ?? response.files[0] ?? null
        setSelectedPath(nextFile?.path ?? null)
        setDraft('')
        setSavedContent('')
      }
    },
    onError: error => {
      setStoryDialog(current => current
        ? { ...current, error: error instanceof Error ? error.message : String(error) }
        : current)
    },
  })
  const deleteFolderMutation = useMutation({
    mutationFn: (path: string) => deleteStoryFolder(props.project.id, path),
    onSuccess: (response, deletedPath) => {
      setStoryDialog(null)
      queryClient.setQueryData(['story-files', props.project.id], response)
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
      if (activePath?.startsWith(`${deletedPath}/`)) {
        queryClient.removeQueries({ queryKey: ['story-file', props.project.id, activePath] })
        const nextFile = response.files.find(file => !file.path.startsWith(`${deletedPath}/`)) ?? response.files[0] ?? null
        setSelectedPath(nextFile?.path ?? null)
        setDraft('')
        setSavedContent('')
      }
    },
    onError: error => {
      setStoryDialog(current => current
        ? { ...current, error: error instanceof Error ? error.message : String(error) }
        : current)
    },
  })

  useEffect(() => {
    if (!selectedPath && files[0]) setSelectedPath(files[0].path)
  }, [files, selectedPath])

  useEffect(() => {
    if (storyFileQuery.data) {
      setDraft(storyFileQuery.data.content)
      setSavedContent(storyFileQuery.data.content)
    }
  }, [storyFileQuery.data])

  useEffect(() => {
    if (!openFileMenu && !openFolderMenu) return

    const closeContextMenus = (event: globalThis.PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.story-file-menu, .story-file-actions, .story-folder-more')) return
      setOpenFileMenu(null)
      setOpenFolderMenu(null)
    }

    const closeContextMenusWithEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpenFileMenu(null)
      setOpenFolderMenu(null)
    }

    document.addEventListener('pointerdown', closeContextMenus, true)
    document.addEventListener('keydown', closeContextMenusWithEscape)
    return () => {
      document.removeEventListener('pointerdown', closeContextMenus, true)
      document.removeEventListener('keydown', closeContextMenusWithEscape)
    }
  }, [openFileMenu, openFolderMenu])

  function toggleFolder(locale: string): void {
    setCollapsedFolders(current => {
      const next = new Set(current)
      if (next.has(locale)) next.delete(locale)
      else next.add(locale)
      return next
    })
  }

  function startPanelResize(boundary: 'left-editor' | 'editor-flow' | 'flow-runtime', event: PointerEvent<HTMLDivElement>): void {
    event.preventDefault()
    const workspace = workspaceRef.current
    const filePanel = filePanelRef.current
    const editorPanel = editorPanelRef.current
    const flowPanel = flowPanelRef.current
    const runtimePanel = runtimePanelRef.current
    if (!workspace || !filePanel || !editorPanel || !flowPanel || !runtimePanel) return

    const startX = event.clientX
    const startLeft = filePanel.getBoundingClientRect().width
    const startEditor = editorPanel.getBoundingClientRect().width
    const startFlow = flowPanel.getBoundingClientRect().width
    const startRuntime = runtimePanel.getBoundingClientRect().width
    const availableWidth = startLeft + startEditor + startFlow + startRuntime
    const minLeft = 128
    const minEditor = 320
    const minFlow = 280
    const minRuntime = 320

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const delta = moveEvent.clientX - startX
      let nextLeft = startLeft
      let nextEditor = startEditor
      let nextFlow = startFlow
      let nextRuntime = startRuntime

      if (boundary === 'left-editor') {
        const pairWidth = startLeft + startEditor
        nextLeft = clamp(startLeft + delta, minLeft, pairWidth - minEditor)
        nextEditor = pairWidth - nextLeft
      } else if (boundary === 'editor-flow') {
        const pairWidth = startEditor + startFlow
        nextEditor = clamp(startEditor + delta, minEditor, pairWidth - minFlow)
        nextFlow = pairWidth - nextEditor
      } else {
        const pairWidth = startFlow + startRuntime
        nextFlow = clamp(startFlow + delta, minFlow, pairWidth - minRuntime)
        nextRuntime = pairWidth - nextFlow
      }

      if (nextRuntime < minRuntime) {
        const pairWidth = startEditor + startRuntime
        nextEditor = clamp(startEditor + delta, minEditor, pairWidth - minRuntime)
        nextRuntime = pairWidth - nextEditor
      }

      setPanelLayout({
        left: (nextLeft / availableWidth) * 100,
        editor: (nextEditor / availableWidth) * 100,
        flow: (nextFlow / availableWidth) * 100,
        runtime: (nextRuntime / availableWidth) * 100,
      })
    }

    const stopResize = () => {
      document.body.classList.remove('story-is-resizing')
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
      window.removeEventListener('pointercancel', stopResize)
    }

    document.body.classList.add('story-is-resizing')
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
    window.addEventListener('pointercancel', stopResize)
  }

  const hasChanges = draft !== savedContent
  const symbols = useMemo(() => extractSymbols(draft), [draft])
  const simulator = useMemo(() => parseTextSimulator(draft), [draft])
  const storyFlowGraph = useMemo(() => buildStoryFlowGraph(simulator), [simulator])
  const simulatorTranscript = simulatorState.steps.flatMap(step => {
    const node = simulator.nodes.get(step.node)
    return node ? node.lines : []
  })
  const currentSimNodeId = simulatorState.steps.at(-1)?.node ?? simulator.start
  const currentSimNode = currentSimNodeId ? simulator.nodes.get(currentSimNodeId) : null
  const simulatorTags = currentSimNode?.tags.map(tag => ({ ...tag, node: currentSimNode.title })) ?? []
  const simulatorChoices = simulatorState.terminal ? [] : currentSimNode?.choices ?? []
  const simulatorTerminalTarget = simulatorState.terminal ?? (currentSimNode?.divert && !simulator.nodes.has(currentSimNode.divert)
    ? currentSimNode.divert
    : null)
  const currentLocale = storyFileQuery.data?.file.locale ?? files.find(file => file.path === activePath)?.locale ?? 'story'
  const workspaceStyle = {
    '--story-left-column': `${panelLayout.left}fr`,
    '--story-editor-column': `${panelLayout.editor}fr`,
    '--story-flow-column': `${panelLayout.flow}fr`,
    '--story-runtime-column': `${panelLayout.runtime}fr`,
  } as CSSProperties

  useEffect(() => {
    setSimulatorState(initialSimulatorState(simulator))
  }, [activePath, simulator])

  function resetSimulator(): void {
    setSimulatorState(initialSimulatorState(simulator))
  }

  function replaceDraftLine(line: number, value: string): void {
    setDraft(current => {
      const lines = current.split(/\r?\n/)
      const index = line - 1
      if (index < 0 || index >= lines.length) return current
      lines[index] = value
      return lines.join('\n')
    })
  }

  function commitTagEdit(): void {
    if (!editingTag) return
    const name = editingTag.name.trim()
    if (!name) return
    replaceDraftLine(editingTag.line, `# ${name}: ${editingTag.value.trim()}`)
    setEditingTag(null)
  }

  function insertTagAfter(line: number, text: string): void {
    setDraft(current => {
      const lines = current.split(/\r?\n/)
      const index = clamp(line, 0, lines.length)
      lines.splice(index, 0, text)
      return lines.join('\n')
    })
  }

  function addNewTag(): void {
    const name = newTag.name.trim()
    if (!name) return
    const value = newTag.value.trim()
    const insertAfter = currentSimNode
      ? Math.max(currentSimNode.startLine, ...currentSimNode.tags.map(tag => tag.line))
      : draft.split(/\r?\n/).length
    insertTagAfter(insertAfter, `# ${name}: ${value}`)
    setNewTag({ name: '', value: '' })
    setIsAddingTag(false)
  }

  function chooseSimulatorChoice(index: number): void {
    const choice = simulatorChoices[index]
    if (!choice) return
    setSimulatorState(current => {
      if (!choice.target || !simulator.nodes.has(choice.target)) {
        return { steps: current.steps, selectedChoice: 0, terminal: choice.target ?? 'END' }
      }
      return {
        steps: advanceSimulator(simulator, [...current.steps, { node: choice.target, choice: choice.label }]),
        selectedChoice: 0,
        terminal: null,
      }
    })
  }

  function handleSimulatorKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault()
      resetSimulator()
      return
    }
    if (simulatorChoices.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSimulatorState(current => ({ ...current, selectedChoice: (current.selectedChoice + 1) % simulatorChoices.length }))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSimulatorState(current => ({
        ...current,
        selectedChoice: (current.selectedChoice - 1 + simulatorChoices.length) % simulatorChoices.length,
      }))
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      chooseSimulatorChoice(simulatorState.selectedChoice)
      return
    }
    const numericChoice = Number(event.key)
    if (numericChoice >= 1 && numericChoice <= simulatorChoices.length) {
      event.preventDefault()
      chooseSimulatorChoice(numericChoice - 1)
    }
  }

  function createNewInkFile(folderOverride?: string): void {
    setOpenFolderMenu(null)
    const folder = folderOverride ?? currentStoryFolder(activePath, props.project.defaultLocale || files[0]?.locale || 'en')
    if (hasChanges) {
      setStoryDialog({ mode: 'discard-new-file', value: `${folder}/new_scene.ink`, error: null })
      return
    }
    setStoryDialog({ mode: 'new-file', value: `${folder}/new_scene.ink`, error: null })
  }

  function createNewStoryFolder(): void {
    setOpenFolderMenu(null)
    setStoryDialog({ mode: 'new-folder', value: props.project.defaultLocale || 'en', error: null })
  }

  function renameFolder(path: string): void {
    setOpenFolderMenu(null)
    setStoryDialog({ mode: 'rename-folder', value: path, targetPath: path, error: null })
  }

  function deleteFolder(path: string): void {
    setOpenFolderMenu(null)
    setStoryDialog({ mode: 'delete-folder', value: path, targetPath: path, error: null })
  }

  function startInlineRename(path: string): void {
    setOpenFileMenu(null)
    setRenamingFile({ path, value: path, error: null })
  }

  function deleteInkFile(path: string): void {
    setOpenFileMenu(null)
    setStoryDialog({ mode: 'delete-file', value: path, targetPath: path, error: null })
  }

  function commitInlineRename(): void {
    if (!renamingFile) return
    const folder = currentStoryFolder(renamingFile.path, props.project.defaultLocale || files[0]?.locale || 'en')
    const path = normalizeStoryFileInput(renamingFile.value, folder)
    if (!path) {
      setRenamingFile({ ...renamingFile, error: 'Write a file path first.' })
      return
    }
    if (path === renamingFile.path) {
      setRenamingFile(null)
      return
    }
    if (files.some(file => file.path === path)) {
      setRenamingFile({ ...renamingFile, error: `Ink file already exists: ${path}` })
      return
    }
    renameFileMutation.mutate({ fromPath: renamingFile.path, toPath: path })
  }

  function submitStoryDialog(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!storyDialog) return
    if (storyDialog.mode === 'discard-new-file') {
      setStoryDialog({ mode: 'new-file', value: storyDialog.value, error: null })
      return
    }
    if (storyDialog.mode === 'delete-file') {
      if (!storyDialog.targetPath) {
        setStoryDialog({ ...storyDialog, error: 'No Ink file selected.' })
        return
      }
      deleteFileMutation.mutate(storyDialog.targetPath)
      return
    }
    if (storyDialog.mode === 'delete-folder') {
      if (!storyDialog.targetPath) {
        setStoryDialog({ ...storyDialog, error: 'No story folder selected.' })
        return
      }
      deleteFolderMutation.mutate(storyDialog.targetPath)
      return
    }
    if (storyDialog.mode === 'new-file') {
      const folder = currentStoryFolder(activePath, props.project.defaultLocale || files[0]?.locale || 'en')
      const path = normalizeStoryFileInput(storyDialog.value, folder)
      if (!path) {
        setStoryDialog({ ...storyDialog, error: 'Write a file path first.' })
        return
      }
      if (files.some(file => file.path === path)) {
        setStoryDialog({ ...storyDialog, error: `Ink file already exists: ${path}` })
        return
      }
      createFileMutation.mutate(path)
      return
    }
    const path = normalizeStoryFolderInput(storyDialog.value)
    if (!path) {
      setStoryDialog({ ...storyDialog, error: 'Write a folder path first.' })
      return
    }
    if (path.endsWith('.ink')) {
      setStoryDialog({ ...storyDialog, error: 'Folder paths cannot end with .ink.' })
      return
    }
    if (storyDialog.mode === 'rename-folder') {
      if (!storyDialog.targetPath) {
        setStoryDialog({ ...storyDialog, error: 'No story folder selected.' })
        return
      }
      if (path === storyDialog.targetPath) {
        setStoryDialog(null)
        return
      }
      if (folders.some(folder => folder.path === path)) {
        setStoryDialog({ ...storyDialog, error: `Story folder already exists: ${path}` })
        return
      }
      renameFolderMutation.mutate({ fromPath: storyDialog.targetPath, toPath: path })
      return
    }
    if (folders.some(folder => folder.path === path)) {
      setStoryDialog({ ...storyDialog, error: `Story folder already exists: ${path}` })
      return
    }
    createFolderMutation.mutate(path)
  }

  function updateStoryDialogValue(value: string): void {
    setStoryDialog(current => current ? { ...current, value, error: null } : current)
  }

  const storyDialogTitle = storyDialog?.mode === 'new-folder'
    ? 'New story folder'
    : storyDialog?.mode === 'rename-folder'
      ? 'Rename story folder'
    : storyDialog?.mode === 'delete-folder'
      ? 'Delete story folder'
    : storyDialog?.mode === 'delete-file'
      ? 'Delete Ink file'
    : storyDialog?.mode === 'discard-new-file'
      ? 'Unsaved changes'
      : 'New Ink file'
  const storyDialogBusy = createFileMutation.isPending
    || createFolderMutation.isPending
    || renameFileMutation.isPending
    || renameFolderMutation.isPending
    || deleteFileMutation.isPending
    || deleteFolderMutation.isPending

  return (
    <div className="story-workspace" ref={workspaceRef} style={workspaceStyle}>
      <aside className="story-file-panel" ref={filePanelRef}>
        <div className="story-file-toolbar">
          <strong><span aria-hidden="true">INK</span> Files</strong>
          <div>
            <button
              aria-label="New Ink file"
              disabled={createFileMutation.isPending}
              onClick={() => createNewInkFile()}
              type="button"
            >
              <StudioIcon name="add" size={18} />
            </button>
            <button
              aria-label="New folder"
              disabled={createFolderMutation.isPending}
              onClick={createNewStoryFolder}
              type="button"
            >
              Folder
            </button>
          </div>
        </div>
        <div className="story-file-search">
          <label htmlFor="story-file-search-input">Search ink files</label>
          <StudioIcon name="search" size={20} />
          <input
            id="story-file-search-input"
            onChange={(event) => setFileSearch(event.target.value)}
            placeholder="Search ink files..."
            type="search"
            value={fileSearch}
          />
          <button aria-label="Filter story files" type="button">
            <StudioIcon name="filter" size={18} />
          </button>
        </div>
        <div aria-label="Story file tree" className="story-file-tree" role="tree">
          {fileGroups.map(group => {
            const isOpen = !collapsedFolders.has(group.locale)
            return (
            <div className={`story-file-folder ${isOpen ? 'is-open' : 'is-collapsed'}`} key={group.locale}>
              <div aria-expanded={isOpen} aria-level={1} className="story-folder-row" role="treeitem">
                <button
                  aria-expanded={isOpen}
                  className="story-folder-toggle"
                  onClick={() => toggleFolder(group.locale)}
                  type="button"
                >
                  <FolderIcon open={isOpen} />
                  <strong>{group.locale}</strong>
                </button>
                <span className="story-folder-count">{group.files.length}</span>
                <button
                  aria-expanded={openFolderMenu === group.locale}
                  aria-label={`More options for ${group.locale}`}
                  className="story-folder-more"
                  onClick={() => {
                    setOpenFileMenu(null)
                    setOpenFolderMenu(current => current === group.locale ? null : group.locale)
                  }}
                  type="button"
                >
                  <StudioIcon name="more" size={18} />
                </button>
                {openFolderMenu === group.locale ? (
                  <div className="story-folder-menu story-file-menu" role="menu">
                    <button onClick={() => createNewInkFile(group.locale)} role="menuitem" type="button">
                      <StudioIcon name="add" size={17} />
                      New .ink file
                    </button>
                    <button onClick={() => renameFolder(group.locale)} role="menuitem" type="button">
                      <StudioIcon name="rename" size={17} />
                      Rename
                    </button>
                    <button className="is-danger" onClick={() => deleteFolder(group.locale)} role="menuitem" type="button">
                      <StudioIcon name="remove" size={17} />
                      Delete folder
                    </button>
                  </div>
                ) : null}
              </div>
              {isOpen ? (
                <div className="story-folder-files" role="group">
                  {group.files.map(file => (
                    <article
                      aria-level={2}
                      className={`${file.path === activePath ? 'is-active' : ''} ${renamingFile?.path === file.path ? 'is-renaming' : ''}`}
                      key={file.path}
                      role="treeitem"
                    >
                      {renamingFile?.path === file.path ? (
                        <label className="story-file-rename">
                          <span className="story-file-icon" aria-hidden="true">Ink</span>
                          <input
                            aria-label={`Rename ${file.path}`}
                            autoFocus
                            disabled={renameFileMutation.isPending}
                            onChange={event => setRenamingFile({ ...renamingFile, value: event.target.value, error: null })}
                            onFocus={event => event.currentTarget.select()}
                            onKeyDown={event => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                commitInlineRename()
                              }
                              if (event.key === 'Escape') {
                                event.preventDefault()
                                setRenamingFile(null)
                              }
                            }}
                            value={renamingFile.value}
                          />
                          {renamingFile.error ? <small>{renamingFile.error}</small> : null}
                        </label>
                      ) : (
                        <button
                          className="story-file-open"
                          aria-current={file.path === activePath ? 'page' : undefined}
                          onClick={() => setSelectedPath(file.path)}
                          onDoubleClick={() => startInlineRename(file.path)}
                          onKeyDown={event => {
                            if (event.key === 'F2' || event.key === 'F12') {
                              event.preventDefault()
                              startInlineRename(file.path)
                            }
                          }}
                          type="button"
                        >
                          <span className="story-file-icon" aria-hidden="true">Ink</span>
                          <span>{fileName(file.path)}</span>
                        </button>
                      )}
                      <span
                        aria-label={file.path === activePath && hasChanges ? 'Modified active file' : file.path === activePath ? 'Active file' : undefined}
                        className={`story-file-status ${file.path === activePath ? 'is-active' : ''} ${file.path === activePath && hasChanges ? 'is-modified' : ''}`}
                      />
                      <div className="story-file-actions">
                        <button
                          aria-expanded={openFileMenu === file.path}
                          aria-label={`More options for ${file.path}`}
                          onClick={() => {
                            setOpenFolderMenu(null)
                            setOpenFileMenu(current => current === file.path ? null : file.path)
                          }}
                          type="button"
                        >
                          <StudioIcon name="more" size={17} />
                        </button>
                        {openFileMenu === file.path ? (
                          <div className="story-file-menu" role="menu">
                            <button onClick={() => startInlineRename(file.path)} role="menuitem" type="button">
                              <StudioIcon name="rename" size={17} />
                              Rename
                            </button>
                            <button disabled role="menuitem" type="button">
                              <StudioIcon name="move" size={17} />
                              Move
                            </button>
                            <button disabled role="menuitem" type="button">
                              <StudioIcon name="duplicate" size={17} />
                              Duplicate
                            </button>
                            <button className="is-danger" onClick={() => deleteInkFile(file.path)} role="menuitem" type="button">
                              <StudioIcon name="remove" size={17} />
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          )
          })}
        </div>
        <div className="story-file-footer">
          <span><StudioIcon name="file" size={18} />{files.length} ink files</span>
          <span aria-hidden="true">{'{}'}</span>
        </div>
      </aside>

      {storyDialog ? (
        <div className="story-dialog-scrim" role="presentation">
          <form
            aria-label={storyDialogTitle}
            aria-modal="true"
            className="story-dialog"
            onKeyDown={event => {
              if (event.key === 'Escape') setStoryDialog(null)
            }}
            onSubmit={submitStoryDialog}
            role="dialog"
          >
            <span className="story-dialog-source">Visual Novel Studio</span>
            <strong>{storyDialogTitle}</strong>
            {storyDialog.mode === 'discard-new-file' ? (
              <p>Discard unsaved changes and create a new Ink file?</p>
            ) : storyDialog.mode === 'delete-file' ? (
              <p>Delete <strong>{storyDialog.targetPath}</strong>? This removes the Ink file from the project.</p>
            ) : storyDialog.mode === 'delete-folder' ? (
              <p>Delete <strong>{storyDialog.targetPath}</strong>? This removes the story folder and every Ink file inside it.</p>
            ) : (
              <label>
                <span>{storyDialog.mode === 'new-folder' || storyDialog.mode === 'rename-folder' ? 'Folder path' : 'Ink file path'}</span>
                <input
                  autoFocus
                  onChange={event => updateStoryDialogValue(event.target.value)}
                  value={storyDialog.value}
                />
              </label>
            )}
            {storyDialog.error ? <p className="story-dialog-error">{storyDialog.error}</p> : null}
            <div className="story-dialog-actions">
              <button disabled={storyDialogBusy} onClick={() => setStoryDialog(null)} type="button">Cancel</button>
              <button disabled={storyDialogBusy} type="submit">OK</button>
            </div>
          </form>
        </div>
      ) : null}

      <div
        aria-label="Resize file explorer and editor"
        className="story-resize-handle"
        onPointerDown={(event) => startPanelResize('left-editor', event)}
        role="separator"
        tabIndex={0}
      />

      <section className="story-editor-panel" ref={editorPanelRef}>
        <div className="story-tabbar">
          <button className="story-file-tab is-active" type="button">
            <span>Ink</span>
            {activePath ? fileName(activePath) : 'No Ink file'}
            <span aria-hidden="true">x</span>
          </button>
          <div className="story-actions">
            {hasChanges || saveMutation.isPending ? (
              <button className="ghost-button" disabled={saveMutation.isPending || !activePath} onClick={() => saveMutation.mutate()} type="button">
                {saveMutation.isPending ? 'Saving' : 'Save'}
              </button>
            ) : null}
          </div>
        </div>
        <div className="story-breadcrumb">
          <span>Ink Files</span>
          <span>&gt;</span>
          <span>{relativeStoryPath(currentLocale)}</span>
          <span>&gt;</span>
          <strong>{activePath ? fileName(activePath) : 'No file selected'}</strong>
        </div>
        <div className="story-symbol-bar">
          <div className="story-symbol-actions">
            <select
              aria-label="Go to symbol"
              onChange={(event) => {
                const line = Number(event.target.value)
                if (line > 0) jumpToLine(editorRef.current, line)
                event.target.value = ''
              }}
              value=""
            >
              <option value="">Go to symbol...</option>
              {symbols.map(symbol => (
                <option key={`${symbol.type}-${symbol.line}-${symbol.label}`} value={symbol.line}>
                  {symbol.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="monaco-frame">
          <Editor
            beforeMount={(monaco) => {
              monaco.languages.register({ id: 'ink' })
              monaco.languages.setMonarchTokensProvider('ink', {
                tokenizer: {
                  root: [
                    [/\/\/.*$/, 'comment'],
                    [/#.*$/, 'tag'],
                    [/^={1,2}\s+.*/, 'type.identifier'],
                    [/^\s*\+.*$/, 'keyword'],
                    [/->\s*\w+/, 'keyword'],
                  ],
                },
              })
            }}
            height="100%"
            language="ink"
            onChange={(value) => setDraft(value ?? '')}
            onMount={(editor) => {
              editorRef.current = editor
            }}
            options={{
              fontFamily: STORY_EDITOR_FONT_FAMILY,
              fontSize: 17,
              minimap: { enabled: false },
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
            }}
            theme="vs"
            value={storyFileQuery.isLoading ? 'Loading Ink...' : draft}
          />
        </div>
      </section>

      <div
        aria-label="Resize editor and story flow"
        className="story-resize-handle"
        onPointerDown={(event) => startPanelResize('editor-flow', event)}
        role="separator"
        tabIndex={0}
      />

      <StoryFlowPanel
        activeNodeId={currentSimNodeId ?? null}
        graph={storyFlowGraph}
        onJumpToLine={(line) => jumpToLine(editorRef.current, line)}
        panelRef={flowPanelRef}
      />

      <div
        aria-label="Resize story flow and simulator"
        className="story-resize-handle"
        onPointerDown={(event) => startPanelResize('flow-runtime', event)}
        role="separator"
        tabIndex={0}
      />

      <aside className="story-runtime-column" ref={runtimePanelRef}>
        <section className="story-simulator-panel">
          <div className="story-runtime-heading">
            <strong>Simulator</strong>
            <div className="story-runtime-tools">
              <button aria-label="Restart simulator" onClick={resetSimulator} type="button">Reset</button>
              <button aria-label="Run diagnostics" disabled={props.isRunningDoctor} onClick={props.onRunDoctor} type="button">Doctor</button>
              <span>State: <strong>{simulatorState.terminal ? 'End' : currentSimNode?.title ?? 'End'}</strong></span>
              <button aria-label="Simulator settings" type="button">Settings</button>
            </div>
          </div>
          <div
            aria-label="Ink text simulator"
            className="simulator-scroll"
            onKeyDown={handleSimulatorKeyDown}
            tabIndex={0}
          >
            {!simulator.start ? (
              <p className="muted">No previewable dialogue or choices found.</p>
            ) : (
              <>
                <div className="simulator-lines">
                  {simulatorTranscript.map((line, index) => (
                    <p key={`${index}-${line}`}>{line}</p>
                  ))}
                  {simulatorTerminalTarget ? (
                    <p className="simulator-system-line">Continues to {simulatorTerminalTarget}</p>
                  ) : null}
                  {currentSimNode && simulatorChoices.length === 0 && !simulatorTerminalTarget ? (
                    <p className="simulator-system-line">End of branch</p>
                  ) : null}
                </div>
                <div className="simulator-choices">
                  {simulatorChoices.map((line, index) => (
                    <button
                      className={index === simulatorState.selectedChoice ? 'is-active' : ''}
                      key={`${currentSimNode?.id}-${index}-${line.label}`}
                      onClick={() => chooseSimulatorChoice(index)}
                      onMouseEnter={() => setSimulatorState(current => ({ ...current, selectedChoice: index }))}
                      type="button"
                    >
                      <span>{index + 1}</span>
                      {line.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="story-debug-panel">
          <div className="story-debug-tabs">
            <button
              className={activeDebugTab === 'Tags' ? 'is-active' : ''}
              onClick={() => setActiveDebugTab('Tags')}
              type="button"
            >
              Tags
            </button>
            <button
              className={activeDebugTab === 'Call Stack' ? 'is-active' : ''}
              onClick={() => setActiveDebugTab('Call Stack')}
              type="button"
            >
              Call Stack
            </button>
          </div>
          {activeDebugTab === 'Tags' ? (
            <div className="story-variable-grid story-tag-grid">
              <span>Name</span>
              <span>Value</span>
              {simulatorTags.length === 0 ? (
                <p>No tags loaded yet.</p>
              ) : simulatorTags.map((tag, index) => (
                <article key={`${tag.node}-${tag.line}-${tag.raw}-${index}`} className="story-tag-row">
                  <div className="story-tag-name-cell">
                    <TagKindIcon name={tag.name} />
                    {editingTag?.line === tag.line ? (
                      <input
                        aria-label="Tag name"
                        onChange={event => setEditingTag({ ...editingTag, name: event.target.value })}
                        onBlur={commitTagEdit}
                        onKeyDown={event => {
                          if (event.key === 'Enter') commitTagEdit()
                          if (event.key === 'Escape') setEditingTag(null)
                        }}
                        value={editingTag.name}
                      />
                    ) : (
                      <strong>
                        <PretextText
                          font={`700 17px ${STORY_RUNTIME_FONT_FAMILY}`}
                          lineHeight={24}
                          maxLines={1}
                          text={tag.name}
                          width={92}
                        />
                      </strong>
                    )}
                  </div>
                  <div className="story-tag-value-cell">
                    {editingTag?.line === tag.line ? (
                      <textarea
                        aria-label="Tag value"
                        autoFocus
                        onBlur={commitTagEdit}
                        onChange={event => setEditingTag({ ...editingTag, value: event.target.value })}
                        onKeyDown={event => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            commitTagEdit()
                          }
                          if (event.key === 'Escape') setEditingTag(null)
                        }}
                        value={editingTag.value}
                      />
                    ) : (
                      <>
                        <div className="story-tag-copy">
                          <PretextText
                            className="story-tag-value-text"
                            font={`400 20px ${STORY_RUNTIME_FONT_FAMILY}`}
                            lineHeight={23}
                            maxLines={1}
                            text={tag.value || '(empty)'}
                            width={360}
                          />
                          <PretextText
                            className="story-tag-meta-text"
                            font={`400 13px ${STORY_RUNTIME_FONT_FAMILY}`}
                            lineHeight={15}
                            maxLines={1}
                            text={`${tag.node} · line ${tag.line}`}
                            width={260}
                          />
                        </div>
                      </>
                    )}
                    <button
                      aria-label={`Edit ${tag.name} tag`}
                      onClick={() => setEditingTag({ line: tag.line, name: tag.name, value: tag.value })}
                      type="button"
                    >
                      ✎
                    </button>
                  </div>
                </article>
              ))}
              {isAddingTag ? (
                <article className="story-tag-add-row is-editing">
                  <div>
                    <span aria-hidden="true">+</span>
                    <input
                      aria-label="New tag name"
                      autoFocus
                      onChange={event => setNewTag({ ...newTag, name: event.target.value })}
                      onKeyDown={event => {
                        if (event.key === 'Enter') addNewTag()
                        if (event.key === 'Escape') setIsAddingTag(false)
                      }}
                      placeholder="tag"
                      value={newTag.name}
                    />
                  </div>
                  <div>
                    <input
                      aria-label="New tag value"
                      onChange={event => setNewTag({ ...newTag, value: event.target.value })}
                      onKeyDown={event => {
                        if (event.key === 'Enter') addNewTag()
                        if (event.key === 'Escape') setIsAddingTag(false)
                      }}
                      placeholder="value"
                      value={newTag.value}
                    />
                    <button disabled={!newTag.name.trim()} onClick={addNewTag} type="button">Add</button>
                  </div>
                </article>
              ) : (
                <button className="story-tag-add-row" onClick={() => setIsAddingTag(true)} type="button">
                  <span aria-hidden="true">+</span>
                  <strong>Add new tag</strong>
                  <small>Create a new runtime tag in the current knot.</small>
                </button>
              )}
              <footer className="story-tag-footer">
                <StudioIcon name="info" size={18} />
                <span>{simulatorTags.length} tags</span>
              </footer>
            </div>
          ) : (
            <div className="story-call-stack">
              {simulatorState.steps.length === 0 ? (
                <p>No active stack.</p>
              ) : simulatorState.steps.map((step, index) => (
                <article key={`${step.node}-${index}`}>
                  <strong>{index + 1}. {step.node}</strong>
                  <span>{step.choice ? `via ${step.choice}` : 'entry'}</span>
                </article>
              ))}
              {simulatorState.terminal ? (
                <article>
                  <strong>{simulatorState.steps.length + 1}. {simulatorState.terminal}</strong>
                  <span>terminal</span>
                </article>
              ) : null}
            </div>
          )}
        </section>
      </aside>
    </div>
  )
}
