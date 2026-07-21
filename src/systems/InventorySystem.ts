import type { ItemDefinition, ItemSystem } from './ItemSystem';
import type { StoryStateSystem } from './StoryStateSystem';

export interface InventoryEntry {
  itemId: string;
  quantity: number;
}

export interface InventorySaveData {
  entries: InventoryEntry[];
}

export interface InventoryChange {
  type: 'added' | 'removed' | 'used';
  itemId: string;
  amount: number;
}

/** 支持数量、堆叠上限、容量、使用和持久化的背包。 */
export class InventorySystem {
  private readonly quantities = new Map<string, number>();
  private readonly listeners = new Set<(change: InventoryChange) => void>();

  constructor(
    private readonly items: ItemSystem,
    private readonly capacity = 24,
  ) {}

  add(itemId: string, amount = 1): ItemDefinition | undefined {
    const item = this.items.get(itemId);
    if (!item || amount <= 0) return undefined;
    const current = this.quantities.get(itemId) ?? 0;
    if (current === 0 && this.quantities.size >= this.capacity) return undefined;
    const next = Math.min(current + amount, this.items.getMaxStack(itemId));
    const added = next - current;
    if (added <= 0) return undefined;
    this.quantities.set(itemId, next);
    this.emit({ type: 'added', itemId, amount: added });
    return item;
  }

  remove(itemId: string, amount = 1): boolean {
    const current = this.quantities.get(itemId) ?? 0;
    if (amount <= 0 || current < amount) return false;
    const next = current - amount;
    if (next === 0) this.quantities.delete(itemId);
    else this.quantities.set(itemId, next);
    this.emit({ type: 'removed', itemId, amount });
    return true;
  }

  use(itemId: string, storyState: StoryStateSystem): boolean {
    if (!this.has(itemId) || !this.items.use(itemId, storyState)) return false;
    this.remove(itemId, 1);
    this.emit({ type: 'used', itemId, amount: 1 });
    return true;
  }

  has(itemId: string, amount = 1): boolean {
    return (this.quantities.get(itemId) ?? 0) >= amount;
  }

  getQuantity(itemId: string): number {
    return this.quantities.get(itemId) ?? 0;
  }

  getOwnedItems(): Array<ItemDefinition & { quantity: number }> {
    return [...this.quantities].flatMap(([id, quantity]) => {
      const item = this.items.get(id);
      return item ? [{ ...item, quantity }] : [];
    });
  }

  onChanged(listener: (change: InventoryChange) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  restore(data: InventorySaveData | InventoryEntry[]): void {
    this.quantities.clear();
    const entries = Array.isArray(data) ? data : data.entries;
    entries.forEach((entry) => {
      if (!this.items.get(entry.itemId)) return;
      const quantity = Math.min(Math.max(entry.quantity, 1), this.items.getMaxStack(entry.itemId));
      this.quantities.set(entry.itemId, quantity);
    });
  }

  serialize(): InventorySaveData {
    return {
      entries: [...this.quantities].map(([itemId, quantity]) => ({ itemId, quantity })),
    };
  }

  private emit(change: InventoryChange): void {
    this.listeners.forEach((listener) => listener(change));
  }
}
