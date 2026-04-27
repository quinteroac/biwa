import { MinigameBase, type MinigameResult } from '../../../../framework/minigames/MinigameBase.ts'

export class TensionTimer extends MinigameBase {
  private config: Record<string, unknown> = {}
  private duration = 45
  private remaining = 45

  async init(config: Record<string, unknown>): Promise<void> {
    this.config = config
    this.duration = (config['duration'] as number | undefined) ?? 45
    this.remaining = this.duration
  }

  async start(): Promise<MinigameResult> {
    // TODO: implement invisible reactive countdown
    return {
      timeRemaining: this.remaining,
      expired: this.remaining <= 0,
    }
  }

  override destroy(): void {}
}
