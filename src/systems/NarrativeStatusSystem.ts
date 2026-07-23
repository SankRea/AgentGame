import type { Perspective, TimeLayer } from '../types/content';
import type { StoryEffect, StoryStateSystem } from './StoryStateSystem';

export interface NarrativeStatus {
  vitality: number;
  heat: number;
  clarity: number;
  murmurs: number;
  memory: number;
  fatherClues: number;
  guilt: number;
  truth: number;
  isDead: boolean;
  currentPerspective: Perspective;
  currentTimeLayer: TimeLayer;
  currentChapter: string;
}

/** 科马拉叙事状态门面；真实值仍由 StoryStateSystem 执行条件与效果。 */
export class NarrativeStatusSystem {
  constructor(private readonly storyState: StoryStateSystem) {}

  get status(): NarrativeStatus {
    return {
      vitality: this.number('vitality'),
      heat: this.number('heat'),
      clarity: this.number('clarity'),
      murmurs: this.number('murmurs'),
      memory: this.number('memory'),
      fatherClues: this.number('fatherClues'),
      guilt: this.number('guilt'),
      truth: this.number('truth'),
      isDead: Boolean(this.storyState.get('isDead')),
      currentPerspective: this.text('currentPerspective', 'juan') as Perspective,
      currentTimeLayer: this.text('currentTimeLayer', 'embers') as TimeLayer,
      currentChapter: this.text('currentChapter', 'chapter_1_descent'),
    };
  }

  apply(effects: StoryEffect[]): void {
    this.storyState.applyEffects(effects);
  }

  get sensoryLine(): string {
    const status = this.status;
    if (status.isDead) return '土层很薄。每一句话都从别人的梦里经过。';
    if (status.murmurs >= 6) return '低语已经近得像是从自己胸腔里发出。';
    if (status.clarity <= 55) return '墙面边缘轻微错位，脚步声总比身体慢半拍。';
    if (status.heat >= 78) return '热气压住呼吸，白墙在视野边缘发亮。';
    if (status.currentTimeLayer === 'past') return '过去贴在空街表面，稍一眨眼就会剥落。';
    return '热风贴着地面移动，镇里没有正常生活的声音。';
  }

  get objectiveLine(): string {
    const status = this.status;
    if (status.isDead) return '遗愿：决定还要听见多少科马拉';
    if (!this.storyState.get('heard_abundio')) return '遗愿：向下坡路上的赶驴人询问科马拉';
    if (!this.storyState.get('met_eduviges')) return '遗愿：寻找爱杜薇海斯留下的住处';
    if (!this.storyState.get('entered_memory')) return '回声：循着钟声观察同一座镇的过去';
    if (!this.storyState.get('found_ledger')) return '线索：在空街尽头寻找半月庄留下的账目';
    return '低语：到墓地寻找声音聚集的地方';
  }

  private number(variable: string): number {
    return Number(this.storyState.get(variable) ?? 0);
  }

  private text(variable: string, fallback: string): string {
    const value = this.storyState.get(variable);
    return typeof value === 'string' ? value : fallback;
  }
}

