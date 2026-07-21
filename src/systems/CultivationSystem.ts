import type { StoryEffect, StoryStateSystem } from './StoryStateSystem';

interface CultivationConfig {
  initialVariables: Record<string, string | number | boolean>;
}

export interface CultivationStatus {
  life: number;
  spiritualSense: number;
  karma: number;
  sanity: number;
  innerDemon: number;
  cultivation: number;
  flesh: number;
}

/** 修士状态门面：底层仍使用剧情变量，因此可直接参与 JSON 条件分支与结局判断。 */
export class CultivationSystem {
  constructor(
    private readonly storyState: StoryStateSystem,
    private readonly karmaRules: Record<string, number>,
    config: CultivationConfig,
  ) {
    // config 由 StoryStateSystem 初始化；参数保留用于未来多角色状态模板。
    void config;
  }

  get status(): CultivationStatus {
    const sanity = this.number('sanity');
    return {
      life: this.number('life'),
      spiritualSense: this.number('spiritualSense'),
      karma: this.number('karma'),
      sanity,
      innerDemon: Math.max(0, 100 - sanity),
      cultivation: this.number('cultivation'),
      flesh: this.number('flesh'),
    };
  }

  applyKarma(actionId: string): number {
    const amount = this.karmaRules[actionId] ?? 0;
    this.apply([{ variable: 'karma', operation: 'add', value: amount }]);
    return amount;
  }

  changeSanity(amount: number): void {
    const next = Math.min(Math.max(this.status.sanity + amount, 0), 100);
    this.apply([{ variable: 'sanity', operation: 'set', value: next }]);
  }

  changeLife(amount: number): void {
    const next = Math.min(Math.max(this.status.life + amount, 0), 100);
    this.apply([{ variable: 'life', operation: 'set', value: next }]);
  }

  apply(effects: StoryEffect[] = []): void {
    this.storyState.applyEffects(effects);
  }

  isBodyDecayed(): boolean {
    return this.status.life <= 0 || this.status.flesh <= 0;
  }

  hasHallucinations(): boolean {
    return this.status.innerDemon >= 35;
  }

  private number(variable: string): number {
    return Number(this.storyState.get(variable) ?? 0);
  }
}
