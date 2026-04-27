import type { ComponentType } from 'react'

export type RendererKind = 'background' | 'character' | 'transition' | 'overlay' | 'extras'

export interface BackgroundRendererProps {
  scene: { id: string; data?: Record<string, unknown> | undefined; variant?: string | undefined } | null
  background: Record<string, unknown>
  resolveAsset: (path: string | undefined) => string | null
}

export interface CharacterRendererProps {
  id: string
  charData: Record<string, unknown> | null
  animation: Record<string, unknown>
  position: 'left' | 'center' | 'right'
  expression: string
  exiting: boolean
  assetBase: string
  onExited: (id: string) => void
}

export interface TransitionRendererProps {
  config: Record<string, unknown>
  onDone: () => void
}

export interface OverlayRendererProps {
  id: string
  data: Record<string, unknown>
}

export interface ExtrasRendererProps {
  id: string
  data: Record<string, unknown>
}

export interface RendererPropsByKind {
  background: BackgroundRendererProps
  character: CharacterRendererProps
  transition: TransitionRendererProps
  overlay: OverlayRendererProps
  extras: ExtrasRendererProps
}

export interface RendererRecord<K extends RendererKind = RendererKind> {
  kind: K
  type: string
  pluginId?: string
  component: ComponentType<RendererPropsByKind[K]>
}

const RENDERER_TYPE_RE = /^[a-z0-9][a-z0-9-]*$/

export class RendererRegistry {
  #renderers = new Map<RendererKind, Map<string, RendererRecord>>()

  register<K extends RendererKind>(
    kind: K,
    type: string,
    component: ComponentType<RendererPropsByKind[K]>,
    options: { pluginId?: string } = {},
  ): RendererRecord<K> {
    if (!RENDERER_TYPE_RE.test(type)) {
      throw new Error(`Renderer type "${type}" must use lowercase letters, numbers and hyphens.`)
    }
    const byKind = this.#renderers.get(kind) ?? new Map<string, RendererRecord>()
    if (byKind.has(type)) throw new Error(`Renderer "${kind}:${type}" is already registered.`)
    const record: RendererRecord<K> = {
      kind,
      type,
      component,
      ...(options.pluginId ? { pluginId: options.pluginId } : {}),
    }
    byKind.set(type, record as unknown as RendererRecord)
    this.#renderers.set(kind, byKind)
    return record
  }

  get<K extends RendererKind>(kind: K, type: string): RendererRecord<K> | undefined {
    return this.#renderers.get(kind)?.get(type) as RendererRecord<K> | undefined
  }

  has(kind: RendererKind, type: string): boolean {
    return this.#renderers.get(kind)?.has(type) ?? false
  }

  list(kind?: RendererKind): RendererRecord[] {
    if (kind) return Array.from(this.#renderers.get(kind)?.values() ?? [])
    return Array.from(this.#renderers.values()).flatMap(records => Array.from(records.values()))
  }

  clear(): void {
    this.#renderers.clear()
  }
}

export const defaultRendererRegistry = new RendererRegistry()
