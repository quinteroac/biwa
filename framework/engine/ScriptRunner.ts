import { Story } from 'inkjs'
import type { EventBus } from './EventBus.ts'
import { TagParser } from '../TagParser.ts'
import type { TagCommand } from '../TagParser.ts'

export type { TagCommand } from '../TagParser.ts'

const SPEAKER_RE = /^([^:]{1,30}):\s*([\s\S]*)$/

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
  #bus: EventBus<any>
  #currentSpeaker: string | null = null
  #pendingMinigame: string | null = null

  constructor(bus: EventBus<any>) {
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
    const story = new Story(this.#storyJson)
    this.#story = story
    const variableStory = story as Story & { onVariableChange?: (name: string, value: unknown) => void }
    variableStory.onVariableChange = (name: string, value: unknown) => {
      this.#bus.emit('variable:change', { name, value })
    }
    story.BindExternalFunction('launch_minigame', (name: string) => {
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

    const rawText = story.Continue() ?? ''
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

    const parsedTags = TagParser.parse(tags)
    const speakerTag = parsedTags.find(t => t.type === 'speaker')
    if (speakerTag?.id) {
      const tagSpeaker = speakerTag.id.trim()
      const normalized = tagSpeaker.toLowerCase()
      if (normalized === 'none' || normalized === 'off' || normalized === 'clear' || normalized === 'null') {
        speaker = null
      } else {
        speaker = tagSpeaker
      }
      this.#currentSpeaker = speaker
    } else if (speakerTag) {
      speaker = null
      this.#currentSpeaker = null
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
    return (this.#story?.variablesState as Record<string, unknown> | undefined)?.[name]
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
