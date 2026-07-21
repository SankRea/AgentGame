import type { StoryEffect, StoryStateSystem } from './StoryStateSystem';

export type ItemType = 'key' | 'quest' | 'consumable' | 'equipment';

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  icon?: string;
  stackable: boolean;
  maxStack: number;
  useEffects?: StoryEffect[];
}

/** 物品目录与物品行为解释器；背包只保存 id 和数量。 */
export class ItemSystem {
  private readonly catalog = new Map<string, ItemDefinition>();

  constructor(items: ItemDefinition[]) {
    items.forEach((item) => this.catalog.set(item.id, item));
  }

  get(itemId: string): ItemDefinition | undefined {
    return this.catalog.get(itemId);
  }

  getMaxStack(itemId: string): number {
    const item = this.get(itemId);
    return item?.stackable ? Math.max(1, item.maxStack) : 1;
  }

  use(itemId: string, storyState: StoryStateSystem): boolean {
    const item = this.get(itemId);
    if (!item || item.type !== 'consumable') return false;
    storyState.applyEffects(item.useEffects);
    return true;
  }
}
