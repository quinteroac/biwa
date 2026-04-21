import { MinigameBase, type MinigameResult } from '../../../framework/minigames/MinigameBase.ts'

export class SlidingPuzzle extends MinigameBase {
  private config: Record<string, unknown> = {}
  private moves = 0

  async init(config: Record<string, unknown>): Promise<void> {
    this.config = config
    this.moves = 0
  }

  async start(): Promise<MinigameResult> {
    // TODO: implement sliding puzzle with image tiles
    return {
      solved: false,
      moves: this.moves,
    }
  }

  override destroy(): void {}
}
