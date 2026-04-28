import Editor from '@monaco-editor/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStoryFile, fetchStoryFiles, saveStoryFile } from './api.ts'
import type { StudioProjectSummary, StudioStoryPreviewLine } from '../../shared/types.ts'

const quickTags = [
  { label: 'Scene', text: '# scene: ' },
  { label: 'Character', text: '# character: ' },
  { label: 'Audio', text: '# bgm: ' },
  { label: 'Effect', text: '# effect: shake duration=600 intensity=16' },
  { label: 'Unlock', text: '# unlock: gallery ' },
]

function lineClass(line: StudioStoryPreviewLine): string {
  return `preview-line preview-${line.kind}`
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
  const editorRef = useRef<Parameters<NonNullable<ComponentProps<typeof Editor>['onMount']>>[0] | null>(null)
  const storyFilesQuery = useQuery({
    queryKey: ['story-files', props.project.id],
    queryFn: () => fetchStoryFiles(props.project.id),
  })
  const files = useMemo(() => storyFilesQuery.data?.files ?? [], [storyFilesQuery.data])
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

  const preview = storyFileQuery.data?.content === draft
    ? storyFileQuery.data.preview
    : []
  const hasChanges = draft !== savedContent

  return (
    <div className="story-workspace">
      <aside className="studio-panel story-file-panel">
        <div className="studio-panel-heading">
          <span>Ink Files</span>
          <small>{files.length} files</small>
        </div>
        <div className="story-file-list">
          {files.map(file => (
            <button
              className={file.path === activePath ? 'is-active' : ''}
              key={file.path}
              onClick={() => setSelectedPath(file.path)}
              type="button"
            >
              <span>{file.path}</span>
              <small>{file.locale}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="studio-panel story-editor-panel">
        <div className="studio-panel-heading story-editor-heading">
          <span>{activePath ?? 'No Ink file'}</span>
          <div className="story-actions">
            <button className="ghost-button" disabled={props.isRunningDoctor} onClick={props.onRunDoctor} type="button">
              Doctor
            </button>
            <button className="ghost-button" disabled={!hasChanges || saveMutation.isPending || !activePath} onClick={() => saveMutation.mutate()} type="button">
              {saveMutation.isPending ? 'Saving' : hasChanges ? 'Save' : 'Saved'}
            </button>
          </div>
        </div>
        <div className="quick-tags" aria-label="Quick Ink tag inserts">
          {quickTags.map(tag => (
            <button key={tag.label} onClick={() => insertText(tag.text)} type="button">
              {tag.label}
            </button>
          ))}
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
            height="560px"
            language="ink"
            onChange={(value) => setDraft(value ?? '')}
            onMount={(editor) => {
              editorRef.current = editor
            }}
            options={{
              fontFamily: 'Manrope, ui-monospace, SFMono-Regular, monospace',
              fontSize: 14,
              minimap: { enabled: false },
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
            theme="vs-dark"
            value={storyFileQuery.isLoading ? 'Loading Ink...' : draft}
          />
        </div>
      </section>

      <aside className="studio-panel story-preview-panel">
        <div className="studio-panel-heading">
          <span>Text Preview</span>
          <small>{hasChanges ? 'Save to refresh' : `${preview.length} lines`}</small>
        </div>
        <div className="preview-scroll" aria-label="Ink text preview">
          {hasChanges ? (
            <p className="muted">Save the Ink file to refresh framework diagnostics and preview.</p>
          ) : preview.length === 0 ? (
            <p className="muted">No previewable dialogue or choices found.</p>
          ) : (
            <div className="preview-list">
              {preview.map(line => (
                <article className={lineClass(line)} key={`${line.line}-${line.kind}-${line.text}`}>
                  <small>{line.kind} · line {line.line}</small>
                  <p>{line.text}</p>
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="tag-suggestions">
          <span>Core Tags</span>
          {(storyFileQuery.data?.tagSuggestions ?? []).map(tag => (
            <button key={tag} onClick={() => insertText(`# ${tag}: `)} type="button">
              {tag}
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}
