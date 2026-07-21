import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { DialogueSystem } from './DialogueSystem';
import type { InventorySystem } from './InventorySystem';
import type { StoryEffect, StoryStateSystem } from './StoryStateSystem';

interface StoryEvent {
  id: string;
  map?: string;
  type: 'dialogue';
  trigger?: 'area' | 'investigate';
  speaker: string;
  text?: string | string[];
  dialogueId?: string;
  once?: boolean;
  rewards?: string[];
  area?: { x: number; y: number; width: number; height: number };
  position?: { x: number; y: number };
  radius?: number;
  effects?: StoryEffect[];
}

interface MapStoryEvent extends StoryEvent {
  trigger: 'area' | 'investigate';
  area?: { x: number; y: number; width: number; height: number };
  position?: { x: number; y: number };
  radius?: number;
}

/** 处理进入区域和主动调查两类事件，触发结果全部来自 JSON。 */
export class EventSystem {
  private readonly definitions = new Map<string, StoryEvent>();
  private mapEvents: MapStoryEvent[] = [];
  private readonly triggered = new Set<string>();

  constructor(
    scene: Phaser.Scene,
    private readonly dialogue: DialogueSystem,
    private readonly inventory: InventorySystem,
    private readonly storyState: StoryStateSystem,
    private readonly onStateChanged: (message?: string) => void,
    private readonly onProgressEvent?: (type: string, target: string, amount?: number) => void,
  ) {
    const definitions = scene.cache.json.get('events') as StoryEvent[];
    definitions.forEach((event) => this.definitions.set(event.id, event));
  }

  /** Graphics 地图直接使用事件 JSON 中的空间数据；Tiled 地图仍可调用 setMapEvents。 */
  activateDataMap(mapKey: string): void {
    this.mapEvents = [...this.definitions.values()].flatMap((event) => {
      if (event.map !== mapKey || !event.trigger) return [];
      return [{ ...event, trigger: event.trigger } as MapStoryEvent];
    });
  }

  /** 将 Tiled Events 对象层转换为运行时事件，空间信息留在地图文件中。 */
  setMapEvents(objects: Phaser.Types.Tilemaps.TiledObject[]): void {
    this.mapEvents = objects.flatMap((object) => {
      if (object.type !== 'story_event') return [];
      const definitionId = this.getProperty<string>(object, 'definitionId', object.name);
      const definition = this.definitions.get(definitionId);
      if (!definition) {
        console.warn(`Event definition not found: ${definitionId}`);
        return [];
      }
      const trigger = this.getProperty<'area' | 'investigate'>(object, 'trigger', 'area');
      return [{
        ...definition,
        trigger,
        area: trigger === 'area' ? {
          x: object.x ?? 0,
          y: object.y ?? 0,
          width: object.width ?? 0,
          height: object.height ?? 0,
        } : undefined,
        position: trigger === 'investigate'
          ? { x: object.x ?? 0, y: object.y ?? 0 }
          : undefined,
        radius: this.getProperty<number>(object, 'radius', 64),
      }];
    });
  }

  update(player: Player): void {
    if (this.dialogue.isActive) return;
    const event = this.mapEvents.find((candidate) =>
      candidate.trigger === 'area' &&
      this.canTrigger(candidate) &&
      candidate.area !== undefined &&
      player.x >= candidate.area.x &&
      player.x <= candidate.area.x + candidate.area.width &&
      player.y >= candidate.area.y &&
      player.y <= candidate.area.y + candidate.area.height,
    );
    if (event) this.trigger(event);
  }

  investigate(player: Player): boolean {
    if (this.dialogue.isActive) return false;
    const event = this.mapEvents.find((candidate) => {
      if (candidate.trigger !== 'investigate' || !candidate.position || !this.canTrigger(candidate)) return false;
      return Phaser.Math.Distance.Between(player.x, player.y, candidate.position.x, candidate.position.y)
        <= (candidate.radius ?? 64);
    });
    return event ? this.trigger(event) : false;
  }

  restore(eventIds: string[]): void {
    this.triggered.clear();
    eventIds.forEach((id) => this.triggered.add(id));
  }

  serialize(): string[] {
    return [...this.triggered];
  }

  private canTrigger(event: MapStoryEvent): boolean {
    return !event.once || !this.triggered.has(event.id);
  }

  private trigger(event: MapStoryEvent): boolean {
    const finish = () => {
      if (event.once) this.triggered.add(event.id);
      this.storyState.applyEffects(event.effects);
      const obtainedNames = (event.rewards ?? []).flatMap((id) => {
        const item = this.inventory.add(id);
        return item ? [item.name] : [];
      });
      this.onProgressEvent?.('story_event', event.id, 1);
      this.onStateChanged(obtainedNames.length ? `获得物品：${obtainedNames.join('、')}` : undefined);
    };

    if (event.dialogueId) return this.dialogue.start(event.dialogueId, finish);
    return this.dialogue.startLines(event.speaker, event.text ?? '', finish);
  }

  private getProperty<T>(object: Phaser.Types.Tilemaps.TiledObject, name: string, fallback: T): T {
    const properties = (object.properties ?? []) as Array<{ name: string; value: unknown }>;
    const property = properties.find((candidate) => candidate.name === name);
    return (property?.value as T | undefined) ?? fallback;
  }
}
