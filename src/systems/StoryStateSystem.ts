export type StoryValue = string | number | boolean;

export interface StoryCondition {
  variable: string;
  operator: 'equals' | 'notEquals' | 'gt' | 'gte' | 'lt' | 'lte' | 'truthy' | 'falsy' | 'includes';
  value?: StoryValue;
}

export interface StoryEffect {
  variable: string;
  operation: 'set' | 'add' | 'subtract' | 'toggle';
  value?: StoryValue;
}

interface StoryConfig {
  initialVariables: Record<string, StoryValue>;
}

export interface SerializedStoryState {
  variables: Record<string, StoryValue>;
}

/** 剧情状态与规则解释器；对话系统不硬编码任何具体剧情变量或结局。 */
export class StoryStateSystem {
  private readonly initialVariables: Record<string, StoryValue>;
  private variables: Record<string, StoryValue>;

  constructor(config: StoryConfig) {
    this.initialVariables = { ...config.initialVariables };
    this.variables = { ...this.initialVariables };
  }

  get(variable: string): StoryValue | undefined {
    return this.variables[variable];
  }

  matchesAll(conditions: StoryCondition[] = []): boolean {
    return conditions.every((condition) => this.matches(condition));
  }

  applyEffects(effects: StoryEffect[] = []): void {
    effects.forEach((effect) => {
      const current = this.variables[effect.variable];
      switch (effect.operation) {
        case 'set':
          if (effect.value !== undefined) this.variables[effect.variable] = effect.value;
          break;
        case 'add':
          this.variables[effect.variable] = Number(current ?? 0) + Number(effect.value ?? 0);
          break;
        case 'subtract':
          this.variables[effect.variable] = Number(current ?? 0) - Number(effect.value ?? 0);
          break;
        case 'toggle':
          this.variables[effect.variable] = !Boolean(current);
          break;
      }
    });
  }

  serialize(): SerializedStoryState {
    return { variables: { ...this.variables } };
  }

  restore(state?: Partial<SerializedStoryState>): void {
    this.variables = { ...this.initialVariables, ...(state?.variables ?? {}) };
  }

  private matches(condition: StoryCondition): boolean {
    const current = this.variables[condition.variable];
    switch (condition.operator) {
      case 'equals': return current === condition.value;
      case 'notEquals': return current !== condition.value;
      case 'gt': return Number(current) > Number(condition.value);
      case 'gte': return Number(current) >= Number(condition.value);
      case 'lt': return Number(current) < Number(condition.value);
      case 'lte': return Number(current) <= Number(condition.value);
      case 'truthy': return Boolean(current);
      case 'falsy': return !Boolean(current);
      case 'includes': return String(current ?? '').includes(String(condition.value ?? ''));
    }
  }
}
