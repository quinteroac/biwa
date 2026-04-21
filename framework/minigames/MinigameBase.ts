export interface MinigameResult {
  [key: string]: unknown
}

export abstract class MinigameBase {
  abstract init(config: Record<string, unknown>): Promise<void>
  abstract start(): Promise<MinigameResult>
  destroy(): void {}
}
