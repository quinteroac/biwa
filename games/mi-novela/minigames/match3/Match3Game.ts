import { MinigameBase, type MinigameResult } from '../../../../framework/minigames/MinigameBase.ts'

export class Match3Game extends MinigameBase {
  private config: Record<string, unknown> = {}
  private score = 0
  private bestCombo = 0

  async init(config: Record<string, unknown>): Promise<void> {
    this.config = config
    this.score = 0
    this.bestCombo = 0
  }

  async start(): Promise<MinigameResult> {
    // TODO: implement Pixi.js match-3 grid
    return {
      score: this.score,
      completed: true,
      bestCombo: this.bestCombo,
    }
  }

  override destroy(): void {}
}
