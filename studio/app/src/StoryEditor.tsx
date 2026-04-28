import Editor from '@monaco-editor/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentProps, CSSProperties, PointerEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStoryFile, fetchStoryFiles, saveStoryFile } from './api.ts'
import type { StudioProjectSummary, StudioStoryFile } from '../../shared/types.ts'

const quickTags = [
  { label: 'Scene', text: '# scene: ' },
  { label: 'Character', text: '# character: ' },
  { label: 'Audio', text: '# bgm: ' },
  { label: 'Effect', text: '# effect: shake duration=600 intensity=16' },
  { label: 'Unlock', text: '# unlock: gallery ' },
]

type SymbolTab = 'Symbols' | 'Characters' | 'Variables' | 'Functions' | 'Lists' | 'Tags'

const symbolTabs: SymbolTab[] = ['Symbols', 'Characters', 'Variables', 'Functions', 'Lists', 'Tags']

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
  runtime: number
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

function fileName(path: string): string {
  return path.split('/').at(-1) ?? path
}

function relativeStoryPath(path: string): string {
  return path.replace(/^story\//, '')
}

function groupStoryFiles(files: StudioStoryFile[]): StoryFileGroup[] {
  const groups = new Map<string, StudioStoryFile[]>()
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
  const [activeSymbolTab, setActiveSymbolTab] = useState<SymbolTab>('Symbols')
  const [collapsedFolders, setCollapsedFolders] = useState<ReadonlySet<string>>(() => new Set())
  const [panelLayout, setPanelLayout] = useState<StoryPanelLayout>({ left: 10, editor: 60, runtime: 30 })
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const filePanelRef = useRef<HTMLElement | null>(null)
  const editorPanelRef = useRef<HTMLElement | null>(null)
  const runtimePanelRef = useRef<HTMLElement | null>(null)
  const editorRef = useRef<Parameters<NonNullable<ComponentProps<typeof Editor>['onMount']>>[0] | null>(null)
  const storyFilesQuery = useQuery({
    queryKey: ['story-files', props.project.id],
    queryFn: () => fetchStoryFiles(props.project.id),
  })
  const files = useMemo(() => storyFilesQuery.data?.files ?? [], [storyFilesQuery.data])
  const filteredFiles = useMemo(() => {
    const query = fileSearch.trim().toLowerCase()
    if (!query) return files
    return files.filter(file => file.path.toLowerCase().includes(query))
  }, [fileSearch, files])
  const fileGroups = useMemo(() => groupStoryFiles(filteredFiles), [filteredFiles])
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

  useEffect(() => {
    if (!selectedPath && files[0]) setSelectedPath(files[0].path)
  }, [files, selectedPath])

  useEffect(() => {
    if (storyFileQuery.data) {
      setDraft(storyFileQuery.data.content)
      setSavedContent(storyFileQuery.data.content)
    }
  }, [storyFileQuery.data])

  function insertText(text: string): void {
    const editor = editorRef.current
    if (!editor) {
      setDraft(current => `${current}${current.endsWith('\n') ? '' : '\n'}${text}`)
      return
    }
    const selection = editor.getSelection()
    const position = editor.getPosition()
    const range = selection ?? {
      startLineNumber: position?.lineNumber ?? 1,
      startColumn: position?.column ?? 1,
      endLineNumber: position?.lineNumber ?? 1,
      endColumn: position?.column ?? 1,
    }
    editor.executeEdits('quick-tag', [{ range, text, forceMoveMarkers: true }])
    setDraft(editor.getValue())
    editor.focus()
  }

  function toggleFolder(locale: string): void {
    setCollapsedFolders(current => {
      const next = new Set(current)
      if (next.has(locale)) next.delete(locale)
      else next.add(locale)
      return next
    })
  }

  function startPanelResize(boundary: 'left-editor' | 'editor-runtime', event: PointerEvent<HTMLDivElement>): void {
    event.preventDefault()
    const workspace = workspaceRef.current
    const filePanel = filePanelRef.current
    const editorPanel = editorPanelRef.current
    const runtimePanel = runtimePanelRef.current
    if (!workspace || !filePanel || !editorPanel || !runtimePanel) return

    const startX = event.clientX
    const startLeft = filePanel.getBoundingClientRect().width
    const startEditor = editorPanel.getBoundingClientRect().width
    const startRuntime = runtimePanel.getBoundingClientRect().width
    const availableWidth = startLeft + startEditor + startRuntime
    const minLeft = 128
    const minEditor = 320
    const minRuntime = 320

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const delta = moveEvent.clientX - startX
      let nextLeft = startLeft
      let nextEditor = startEditor
      let nextRuntime = startRuntime

      if (boundary === 'left-editor') {
        const pairWidth = startLeft + startEditor
        nextLeft = clamp(startLeft + delta, minLeft, pairWidth - minEditor)
        nextEditor = pairWidth - nextLeft
      } else {
        const pairWidth = startEditor + startRuntime
        nextEditor = clamp(startEditor + delta, minEditor, pairWidth - minRuntime)
        nextRuntime = pairWidth - nextEditor
      }

      setPanelLayout({
        left: (nextLeft / availableWidth) * 100,
        editor: (nextEditor / availableWidth) * 100,
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

  const preview = storyFileQuery.data?.content === draft
    ? storyFileQuery.data.preview
    : []
  const hasChanges = draft !== savedContent
  const symbols = useMemo(() => extractSymbols(draft), [draft])
  const activeSymbols = symbols.filter(symbol => symbol.type === activeSymbolTab)
  const simulatorDialogue = preview.filter(line => line.kind === 'dialogue').slice(0, 3)
  const simulatorChoices = preview.filter(line => line.kind === 'choice').slice(0, 4)
  const currentLocale = storyFileQuery.data?.file.locale ?? files.find(file => file.path === activePath)?.locale ?? 'story'
  const workspaceStyle = {
    '--story-left-column': `${panelLayout.left}fr`,
    '--story-editor-column': `${panelLayout.editor}fr`,
    '--story-runtime-column': `${panelLayout.runtime}fr`,
  } as CSSProperties

  return (
    <div className="story-workspace" ref={workspaceRef} style={workspaceStyle}>
      <aside className="story-file-panel" ref={filePanelRef}>
        <div className="story-file-toolbar">
          <strong>Ink Files</strong>
          <div>
            <button aria-label="New Ink file" type="button">+</button>
            <button aria-label="New folder" type="button">Folder</button>
          </div>
        </div>
        <label className="story-file-search">
          <span>Search ink files</span>
          <input
            onChange={(event) => setFileSearch(event.target.value)}
            placeholder="Search ink files..."
            type="search"
            value={fileSearch}
          />
        </label>
        <div className="story-file-tree">
          {fileGroups.map(group => {
            const isOpen = !collapsedFolders.has(group.locale)
            return (
            <div className={`story-file-folder ${isOpen ? 'is-open' : 'is-collapsed'}`} key={group.locale}>
              <button
                aria-expanded={isOpen}
                className="story-folder-row"
                onClick={() => toggleFolder(group.locale)}
                type="button"
              >
                <FolderIcon open={isOpen} />
                <strong>{group.locale}</strong>
              </button>
              {isOpen ? (
                <div className="story-folder-files">
                  {group.files.map(file => (
                    <button
                      className={file.path === activePath ? 'is-active' : ''}
                      key={file.path}
                      onClick={() => setSelectedPath(file.path)}
                      type="button"
                    >
                      <span className="story-file-icon" aria-hidden="true">Ink</span>
                      <span>{fileName(file.path)}</span>
                      {file.path === activePath && hasChanges ? <small>M</small> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )
          })}
        </div>
        <div className="story-file-footer">{files.length} ink files</div>
      </aside>

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
              {activeSymbols.map(symbol => (
                <option key={`${symbol.type}-${symbol.line}-${symbol.label}`} value={symbol.line}>
                  {symbol.label}
                </option>
              ))}
            </select>
          </div>
          <nav aria-label="Ink symbol groups">
            {symbolTabs.map(tab => (
              <button
                className={tab === activeSymbolTab ? 'is-active' : ''}
                key={tab}
                onClick={() => setActiveSymbolTab(tab)}
                type="button"
              >
                {tab}
              </button>
            ))}
          </nav>
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
              fontFamily: '"Azeret Mono", "SFMono-Regular", Consolas, monospace',
              fontSize: 14,
              minimap: { enabled: false },
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
            }}
            theme="vs-dark"
            value={storyFileQuery.isLoading ? 'Loading Ink...' : draft}
          />
        </div>
      </section>

      <div
        aria-label="Resize editor and simulator"
        className="story-resize-handle"
        onPointerDown={(event) => startPanelResize('editor-runtime', event)}
        role="separator"
        tabIndex={0}
      />

      <aside className="story-runtime-column" ref={runtimePanelRef}>
        <section className="story-simulator-panel">
          <div className="story-runtime-heading">
            <strong>Simulator</strong>
            <div className="story-runtime-tools">
              <button aria-label="Restart simulator" type="button">Reset</button>
              <button aria-label="Run diagnostics" disabled={props.isRunningDoctor} onClick={props.onRunDoctor} type="button">Doctor</button>
              <span>State: <strong>Start</strong></span>
              <button aria-label="Simulator settings" type="button">Settings</button>
            </div>
          </div>
          <div className="simulator-scroll" aria-label="Ink simulator preview">
            {hasChanges ? (
              <p className="muted">Save to refresh simulator output.</p>
            ) : preview.length === 0 ? (
              <p className="muted">No previewable dialogue or choices found.</p>
            ) : (
              <>
                <div className="simulator-lines">
                  {simulatorDialogue.map(line => (
                    <p key={`${line.line}-${line.text}`}>{line.text}</p>
                  ))}
                </div>
                <div className="simulator-choices">
                  {simulatorChoices.map((line, index) => (
                    <button className={index === 0 ? 'is-active' : ''} key={`${line.line}-${line.text}`} type="button">
                      <span>{index + 1}</span>
                      {line.text}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <label className="simulator-command">
            <span>Type a command</span>
            <input placeholder="Type a command..." type="text" />
            <button aria-label="Send command" type="button">Send</button>
          </label>
        </section>

        <section className="story-debug-panel">
          <div className="story-debug-tabs">
            <button className="is-active" type="button">Variables</button>
            <button type="button">Call Stack</button>
          </div>
          <div className="story-variable-grid">
            <span>Name</span>
            <span>Value</span>
            <p>No variables defined</p>
            <button type="button">+ Add Watch</button>
          </div>
          <details className="story-debug-console">
            <summary>Debug Console</summary>
          </details>
          <div className="tag-suggestions">
            <span>Core Tags</span>
            {(storyFileQuery.data?.tagSuggestions ?? []).map(tag => (
              <button key={tag} onClick={() => insertText(`# ${tag}: `)} type="button">
                {tag}
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  )
}
