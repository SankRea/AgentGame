import type { StoryCondition, StoryStateSystem } from './StoryStateSystem';

export interface EndingDefinition {
  id: string;
  name: string;
  description: string;
  priority: number;
  conditions: StoryCondition[];
  dialogueId: string;
}

export interface EndingSaveData {
  reached: string[];
  currentEnding: string;
}

/** 独立结局判定器：高优先级规则先匹配，并记录所有已达成结局。 */
export class EndingSystem {
  private readonly endings: EndingDefinition[];
  private readonly reached = new Set<string>();
  private currentEnding = '';

  constructor(
    definitions: EndingDefinition[],
    private readonly storyState: StoryStateSystem,
    private readonly onReached?: (ending: EndingDefinition) => void,
  ) {
    this.endings = [...definitions].sort((a, b) => b.priority - a.priority);
  }

  evaluate(): EndingDefinition | null {
    const ending = this.endings.find((candidate) => this.storyState.matchesAll(candidate.conditions)) ?? null;
    if (!ending) return null;
    this.currentEnding = ending.id;
    this.storyState.applyEffects([{ variable: 'current_ending', operation: 'set', value: ending.id }]);
    if (!this.reached.has(ending.id)) {
      this.reached.add(ending.id);
      this.onReached?.(ending);
    }
    return ending;
  }

  hasReached(endingId: string): boolean {
    return this.reached.has(endingId);
  }

  serialize(): EndingSaveData {
    return { reached: [...this.reached], currentEnding: this.currentEnding };
  }

  restore(data?: EndingSaveData): void {
    if (!data) return;
    this.reached.clear();
    data.reached.forEach((id) => this.reached.add(id));
    this.currentEnding = data.currentEnding;
  }
}
