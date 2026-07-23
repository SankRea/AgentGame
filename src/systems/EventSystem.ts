import Phaser from 'phaser';
import type { VoiceStyle } from '../types/content';
import type { Player } from '../entities/Player';
import type { DialogueSystem } from './DialogueSystem';
import type { InventorySystem } from './InventorySystem';
import type { StoryCondition, StoryEffect, StoryStateSystem } from './StoryStateSystem';

interface StoryEvent {
  id: string;
  map?: string;
  type: 'dialogue';
  trigger?: 'area' | 'investigate';
  speaker: string;
  voice?: VoiceStyle;
  prompt?: string;
  text?: string | string[];
  dialogueId?: string;
  once?: boolean;
  rewards?: string[];
  conditions?: StoryCondition[];
  area?: { x: number; y: number; width: number; height: number };
  position?: { x: number; y: number };
  radius?: number;
  effects?: StoryEffect[];
}

interface MapStoryEvent extends StoryEvent {
  trigger: 'area' | 'investigate';
}

/** 处理区域与调查事件，并把时间层、认知反转和记忆发现转换为统一进度事件。 */
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

  activateDataMap(mapKey: string): void {
    this.mapEvents = [...this.definitions.values()].flatMap((event) => {
      if (event.map !== mapKey || !event.trigger) return [];
      return [{ ...event, trigger: event.trigger } as MapStoryEvent];
    });
  }

  setMapEvents(objects: Phaser.Types.Tilemaps.TiledObject[]): void {
    this.mapEvents = objects.flatMap((object) => {
      if (object.type !== 'story_event') return [];
      const definitionId = this.getProperty<string>(object, 'definitionId', object.name);
      const definition = this.definitions.get(definitionId);
      if (!definition) return [];
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
        position: trigger === 'investigate' ? { x: object.x ?? 0, y: object.y ?? 0 } : undefined,
        radius: this.getProperty<number>(object, 'radius', 64),
      }];
    });
  }

  update(player: Player): void {
    if (this.dialogue.isActive) return;
    const event = this.mapEvents.find((candidate) =>
      candidate.trigger === 'area'
      && this.canTrigger(candidate)
      && candidate.area !== undefined
      && player.x >= candidate.area.x
      && player.x <= candidate.area.x + candidate.area.width
      && player.y >= candidate.area.y
      && player.y <= candidate.area.y + candidate.area.height,
    );
    if (event) this.trigger(event);
  }

  investigate(player: Player): boolean {
    if (this.dialogue.isActive) return false;
    const event = this.getNearbyInvestigation(player);
    return event ? this.trigger(event) : false;
  }

  getInteractionPrompt(player: Player): string | undefined {
    return this.getNearbyInvestigation(player)?.prompt;
  }

  restore(eventIds: string[]): void {
    this.triggered.clear();
    eventIds.forEach((id) => this.triggered.add(id));
  }

  serialize(): string[] {
    return [...this.triggered];
  }

  private getNearbyInvestigation(player: Player): MapStoryEvent | undefined {
    return this.mapEvents.find((candidate) => {
      if (candidate.trigger !== 'investigate' || !candidate.position || !this.canTrigger(candidate)) return false;
      return Phaser.Math.Distance.Between(player.x, player.y, candidate.position.x, candidate.position.y)
        <= (candidate.radius ?? 64);
    });
  }

  private canTrigger(event: MapStoryEvent): boolean {
    return (!event.once || !this.triggered.has(event.id))
      && this.storyState.matchesAll(event.conditions);
  }

  private trigger(event: MapStoryEvent): boolean {
    const finish = () => {
      if (event.once) this.triggered.add(event.id);
      const previousLayer = String(this.storyState.get('currentTimeLayer') ?? '');
      this.storyState.applyEffects(event.effects);
      const nextLayer = String(this.storyState.get('currentTimeLayer') ?? '');
      if (previousLayer !== nextLayer) this.onProgressEvent?.('time_layer_changed', nextLayer, 1);
      const obtainedNames = (event.rewards ?? []).flatMap((id) => {
        const item = this.inventory.add(id);
        return item ? [item.name] : [];
      });
      this.onProgressEvent?.('story_event', event.id, 1);
      if (Number(this.storyState.get('memory') ?? 0) > 0) {
        this.onProgressEvent?.('memory_discovered', event.id, 1);
      }
      this.onStateChanged(obtainedNames.length ? `遗物：${obtainedNames.join('、')}` : undefined);
    };
    if (event.dialogueId) return this.dialogue.start(event.dialogueId, finish);
    return this.dialogue.startLines(event.speaker, event.text ?? '', finish, event.voice);
  }

  private getProperty<T>(object: Phaser.Types.Tilemaps.TiledObject, name: string, fallback: T): T {
    const properties = (object.properties ?? []) as Array<{ name: string; value: unknown }>;
    const property = properties.find((candidate) => candidate.name === name);
    return (property?.value as T | undefined) ?? fallback;
  }
}
