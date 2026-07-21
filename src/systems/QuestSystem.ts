import type { InventorySystem } from './InventorySystem';
import type { StoryCondition, StoryEffect, StoryStateSystem } from './StoryStateSystem';

export interface ProgressEvent {
  type: string;
  target: string;
  amount?: number;
}

interface QuestObjectiveDefinition {
  id: string;
  description: string;
  event: string;
  target: string;
  required: number;
}

interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  autoStart?: boolean;
  startConditions?: StoryCondition[];
  objectives: QuestObjectiveDefinition[];
  rewards?: {
    items?: Array<{ id: string; quantity: number }>;
    storyEffects?: StoryEffect[];
  };
  nextQuest?: string;
}

interface QuestState {
  status: 'active' | 'completed';
  progress: Record<string, number>;
}

export interface QuestSaveData {
  states: Record<string, QuestState>;
}

export interface QuestUpdate {
  type: 'started' | 'progress' | 'completed';
  questId: string;
  title: string;
}

/** 通用事件驱动任务系统；目标、条件、奖励和任务链全部来自 JSON。 */
export class QuestSystem {
  private readonly definitions = new Map<string, QuestDefinition>();
  private readonly states = new Map<string, QuestState>();

  constructor(
    definitions: QuestDefinition[],
    private readonly inventory: InventorySystem,
    private readonly storyState: StoryStateSystem,
    private readonly onUpdate?: (update: QuestUpdate) => void,
  ) {
    definitions.forEach((quest) => this.definitions.set(quest.id, quest));
    definitions.filter((quest) => quest.autoStart).forEach((quest) => this.start(quest.id));
  }

  start(questId: string): boolean {
    const quest = this.definitions.get(questId);
    if (!quest || this.states.has(questId) || !this.storyState.matchesAll(quest.startConditions)) return false;
    this.states.set(questId, { status: 'active', progress: {} });
    this.onUpdate?.({ type: 'started', questId, title: quest.title });
    return true;
  }

  notify(event: ProgressEvent): void {
    for (const [questId, state] of [...this.states]) {
      if (state.status !== 'active') continue;
      const quest = this.definitions.get(questId);
      if (!quest) continue;
      let changed = false;
      quest.objectives.forEach((objective) => {
        if (objective.event !== event.type || (objective.target !== '*' && objective.target !== event.target)) return;
        const current = state.progress[objective.id] ?? 0;
        const next = Math.min(objective.required, current + (event.amount ?? 1));
        if (next !== current) {
          state.progress[objective.id] = next;
          changed = true;
        }
      });
      if (!changed) continue;
      this.onUpdate?.({ type: 'progress', questId, title: quest.title });
      if (quest.objectives.every((objective) => (state.progress[objective.id] ?? 0) >= objective.required)) {
        this.complete(quest);
      }
    }
  }

  getActiveSummary(): string {
    const entry = [...this.states].find(([, state]) => state.status === 'active');
    if (!entry) return '当前没有任务';
    const [questId, state] = entry;
    const quest = this.definitions.get(questId)!;
    const objective = quest.objectives.find((item) => (state.progress[item.id] ?? 0) < item.required);
    if (!objective) return quest.title;
    return `${quest.title}：${objective.description} (${state.progress[objective.id] ?? 0}/${objective.required})`;
  }

  isCompleted(questId: string): boolean {
    return this.states.get(questId)?.status === 'completed';
  }

  serialize(): QuestSaveData {
    return { states: Object.fromEntries(this.states) };
  }

  restore(data?: QuestSaveData): void {
    if (!data || Object.keys(data.states).length === 0) return;
    this.states.clear();
    Object.entries(data.states).forEach(([id, state]) => {
      if (this.definitions.has(id)) this.states.set(id, state);
    });
    if (this.states.size === 0) {
      [...this.definitions.values()].filter((quest) => quest.autoStart).forEach((quest) => this.start(quest.id));
    }
  }

  private complete(quest: QuestDefinition): void {
    const state = this.states.get(quest.id);
    if (!state || state.status === 'completed') return;
    state.status = 'completed';
    this.storyState.applyEffects(quest.rewards?.storyEffects);
    quest.rewards?.items?.forEach((reward) => this.inventory.add(reward.id, reward.quantity));
    this.onUpdate?.({ type: 'completed', questId: quest.id, title: quest.title });
    if (quest.nextQuest) this.start(quest.nextQuest);
  }
}
