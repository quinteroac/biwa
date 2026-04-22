import { Story } from 'inkjs'
import type { EventBus } from './EventBus.ts'

const SPEAKER_RE = /^([^:]{1,30}):\s*([\s\S]*)$/

export interface TagCommand {
  type: string
  id?: string
  exit?: boolean
  [key: string]: unknown
}

export interface StepChoice {
  index: number
  text: string
  tags: string[]
}

export type StepResult =
  | { type: 'choices'; choices: StepChoice[] }
  | { type: 'dialog'; text: string; speaker: string | null; tags: TagCommand[]; canContinue: boolean; hasChoices: boolean; pendingMinigame: string | null }
  | { type: 'tags-only'; text: ''; speaker: null; tags: TagCommand[]; canContinue: boolean; hasChoices: boolean; pendingMinigame: string | null }
  | null

export class ScriptRunner {
  #story: Story | null = null
  #storyJson: string | null = null
  #bus: EventBus
  #currentSpeaker: string | null = null
  #pendingMinigame: string | null = null

  constructor(bus: EventBus) {
    this.#bus = bus
  }

  async load(url: string): Promise<void> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`[ScriptRunner] Failed to fetch story: ${url} (${res.status})`)
    this.#storyJson = await res.text()
    this.#createStory()
  }

  reset(): void {
    this.#currentSpeaker = null
    this.#pendingMinigame = null
    this.#createStory()
  }

  #createStory(): void {
    if (!this.#storyJson) return
    this.#story = new Story(this.#storyJson)
    this.#story.onVariableChange = (name: string, value: unknown) => {
      this.#bus.emit('variable:change', { name, value })
    }
    this.#story.BindExternalFunction('launch_minigame', (name: string) => {
      this.#pendingMinigame = name
    }, false)
  }

  step(): StepResult {
    const story = this.#story
    if (!story) return null

    if (!story.canContinue && story.currentChoices.length === 0) {
      return null
    }

    if (!story.canContinue && story.currentChoices.length > 0) {
      return {
        type: 'choices',
        choices: this.choices,
      }
    }

    const rawText = story.Continue()
    const tags = story.currentTags ?? []
    const text = rawText.trim()

    let speaker = this.#currentSpeaker
    let dialogText = text

    if (text) {
      const match = SPEAKER_RE.exec(text)
      if (match) {
        const prefix = match[1]!
        if (!/[.!?]/.test(prefix)) {
          speaker = prefix
          dialogText = match[2]!.trim()
          this.#currentSpeaker = speaker
        }
      }
    }

    const parsedTags = this.#parseTags(tags)
    const speakerTag = parsedTags.find(t => t.type === 'speaker')
    if (speakerTag?.id) {
      speaker = speakerTag.id
      this.#currentSpeaker = speaker
    }

    const hasChoices = story.currentChoices.length > 0 && !story.canContinue
    const pendingMinigame = this.#pendingMinigame
    this.#pendingMinigame = null

    if (!dialogText && parsedTags.length === 0 && !pendingMinigame) {
      return { type: 'tags-only', text: '', speaker: null, tags: parsedTags, canContinue: story.canContinue, hasChoices, pendingMinigame: null }
    }

    if (!dialogText) {
      return { type: 'tags-only', text: '', speaker: null, tags: parsedTags, canContinue: story.canContinue, hasChoices, pendingMinigame }
    }

    return {
      type: 'dialog',
      text: dialogText,
      speaker,
      tags: parsedTags,
      canContinue: story.canContinue,
      hasChoices,
      pendingMinigame,
    }
  }

  #parseTags(tags: string[]): TagCommand[] {
    return tags.map(raw => {
      const trimmed = raw.trim().replace(/^#\s*/, '')
      if (!trimmed) return null

      const parts = trimmed.split(',').map(s => s.trim())
      const first = parts[0]!
      const colonIdx = first.indexOf(':')

      if (colonIdx === -1) {
        return { type: first.trim() }
      }

      const type = first.slice(0, colonIdx).trim()
      const remaining = trimmed.slice(colonIdx + 1)
      const tokens = remaining.split(',').map(s => s.trim())
      const cmd: TagCommand = { type }

      if (tokens[0] && !tokens[0].includes(':')) {
        if (tokens[0] === 'exit') {
          cmd.exit = true
        } else {
          cmd.id = tokens[0]
        }
        for (let i = 1; i < tokens.length; i++) {
          const kv = tokens[i]!
          const ci = kv.indexOf(':')
          if (ci !== -1) {
            cmd[kv.slice(0, ci).trim()] = kv.slice(ci + 1).trim()
          } else if (kv === 'exit') {
            cmd.exit = true
          }
        }
      } else {
        for (const token of tokens) {
          const ci = token.indexOf(':')
          if (ci !== -1) {
            const k = token.slice(0, ci).trim()
            const v = token.slice(ci + 1).trim()
            cmd[k] = v
          } else if (token === 'exit') {
            cmd.exit = true
          } else if (token) {
            cmd.id = token
          }
        }
      }
      return cmd
    }).filter((c): c is TagCommand => c !== null)
  }

  get choices(): StepChoice[] {
    return (this.#story?.currentChoices ?? []).map(c => ({
      index: c.index,
      text: c.text,
      tags: c.tags ?? [],
    }))
  }

  choose(index: number): void {
    this.#story!.ChooseChoiceIndex(index)
    this.#currentSpeaker = null
  }

  getVariable(name: string): unknown {
    return this.#story?.variablesState[name as keyof typeof this.#story.variablesState]
  }

  setVariable(name: string, value: unknown): void {
    if (this.#story) {
      (this.#story.variablesState as Record<string, unknown>)[name] = value
    }
  }

  saveState(): string | null {
    return this.#story?.state.ToJson() ?? null
  }

  loadState(json: string): void {
    this.#story?.state.LoadJson(json)
  }
}
