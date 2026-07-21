import type { ProgressEvent } from './QuestSystem';

interface AchievementRequirement {
  event: string;
  target: string;
  count: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  hidden?: boolean;
  requirements: AchievementRequirement[];
}

export interface AchievementSaveData {
  unlocked: string[];
  progress: Record<string, number>;
}

/** 监听统一进度事件并按 JSON 规则解锁成就。 */
export class AchievementSystem {
  private readonly definitions: AchievementDefinition[];
  private readonly unlocked = new Set<string>();
  private readonly progress = new Map<string, number>();

  constructor(
    definitions: AchievementDefinition[],
    private readonly onUnlocked?: (achievement: AchievementDefinition) => void,
  ) {
    this.definitions = definitions;
  }

  notify(event: ProgressEvent): void {
    this.definitions.forEach((achievement) => {
      if (this.unlocked.has(achievement.id)) return;
      achievement.requirements.forEach((requirement, index) => {
        if (requirement.event !== event.type || (requirement.target !== '*' && requirement.target !== event.target)) return;
        const key = this.progressKey(achievement.id, index);
        this.progress.set(key, Math.min(requirement.count, (this.progress.get(key) ?? 0) + (event.amount ?? 1)));
      });
      const complete = achievement.requirements.every((requirement, index) =>
        (this.progress.get(this.progressKey(achievement.id, index)) ?? 0) >= requirement.count,
      );
      if (complete) {
        this.unlocked.add(achievement.id);
        this.onUnlocked?.(achievement);
      }
    });
  }

  hasUnlocked(achievementId: string): boolean {
    return this.unlocked.has(achievementId);
  }

  serialize(): AchievementSaveData {
    return { unlocked: [...this.unlocked], progress: Object.fromEntries(this.progress) };
  }

  restore(data?: AchievementSaveData): void {
    if (!data) return;
    this.unlocked.clear();
    data.unlocked.forEach((id) => this.unlocked.add(id));
    this.progress.clear();
    Object.entries(data.progress).forEach(([key, value]) => this.progress.set(key, value));
  }

  private progressKey(achievementId: string, requirementIndex: number): string {
    return `${achievementId}:${requirementIndex}`;
  }
}
