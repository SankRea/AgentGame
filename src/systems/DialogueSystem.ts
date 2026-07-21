import Phaser from 'phaser';
import type { StoryCondition, StoryEffect, StoryStateSystem } from './StoryStateSystem';
import type { EndingSystem } from './EndingSystem';
import { DialogueBox } from '../ui/DialogueBox';

interface DialogueChoice {
  text: string;
  next?: string;
  conditions?: StoryCondition[];
  effects?: StoryEffect[];
  actions?: string[];
}

interface DialogueBranch {
  conditions: StoryCondition[];
  next: string;
}

interface DialogueNode {
  id: string;
  speaker?: string;
  text: string;
  next?: string;
  branches?: DialogueBranch[];
  choices?: DialogueChoice[];
  onEnterEffects?: StoryEffect[];
  endingCheck?: boolean;
}

interface DialogueRecord {
  id: string;
  speaker?: string;
  start?: string;
  nodes?: DialogueNode[];
  // 兼容第一阶段的简单多段文本格式。
  text?: string[];
}

/** JSON 驱动的节点式对话解释器，支持选项、变量效果、条件跳转和结局判定。 */
export class DialogueSystem {
  private readonly box: DialogueBox;
  private readonly records = new Map<string, DialogueRecord>();
  private record?: DialogueRecord;
  private nodes = new Map<string, DialogueNode>();
  private currentNode?: DialogueNode;
  private completion?: () => void;
  private active = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly storyState: StoryStateSystem,
    private readonly endingSystem: EndingSystem,
    private readonly onStoryAction?: (actionId: string) => void,
  ) {
    this.box = new DialogueBox(scene);
    const data = scene.cache.json.get('dialogues') as DialogueRecord[];
    data.forEach((record) => this.records.set(record.id, record));

    scene.input.on('pointerdown', this.handlePointer, this);
    scene.input.keyboard?.on('keydown', this.handleKey, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  get isActive(): boolean {
    return this.active;
  }

  start(dialogueId: string, onComplete?: () => void): boolean {
    if (this.active) return false;
    const record = this.records.get(dialogueId);
    if (!record) {
      console.warn(`Dialogue not found: ${dialogueId}`);
      return false;
    }
    this.active = true;
    this.completion = onComplete;
    return this.openRecord(record);
  }

  startLines(speaker: string, lines: string | string[], onComplete?: () => void): boolean {
    if (this.active) return false;
    const pages = Array.isArray(lines) ? lines : [lines];
    const nodes = pages.map((text, index): DialogueNode => ({
      id: `line_${index}`,
      speaker,
      text,
      next: index < pages.length - 1 ? `line_${index + 1}` : undefined,
    }));
    this.active = true;
    this.completion = onComplete;
    return this.openRecord({ id: '__runtime__', start: 'line_0', nodes });
  }

  advance(): void {
    if (!this.active || !this.currentNode || this.box.hasChoices) return;

    const branch = this.currentNode.branches?.find((candidate) =>
      this.storyState.matchesAll(candidate.conditions),
    );
    const nextNodeId = branch?.next ?? this.currentNode.next;
    if (nextNodeId) {
      this.enterNode(nextNodeId);
      return;
    }

    if (this.currentNode.endingCheck) {
      const ending = this.endingSystem.evaluate();
      const endingRecord = ending ? this.records.get(ending.dialogueId) : undefined;
      if (ending && endingRecord && endingRecord.id !== this.record?.id) {
        this.openRecord(endingRecord);
        return;
      }
    }
    this.finish();
  }

  private openRecord(record: DialogueRecord): boolean {
    const normalizedNodes = record.nodes ?? (record.text ?? []).map((text, index) => ({
      id: `line_${index}`,
      speaker: record.speaker,
      text,
      next: index < (record.text?.length ?? 0) - 1 ? `line_${index + 1}` : undefined,
    }));
    if (!normalizedNodes.length) {
      console.warn(`Dialogue has no nodes: ${record.id}`);
      this.finish();
      return false;
    }

    this.record = record;
    this.nodes = new Map(normalizedNodes.map((node) => [node.id, node]));
    this.enterNode(record.start ?? normalizedNodes[0].id);
    return true;
  }

  private enterNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      console.warn(`Dialogue node not found: ${this.record?.id}/${nodeId}`);
      this.finish();
      return;
    }

    this.currentNode = node;
    this.storyState.applyEffects(node.onEnterEffects);
    this.box.showLine(node.speaker ?? this.record?.speaker ?? '', node.text);

    const choices = (node.choices ?? []).filter((choice) =>
      this.storyState.matchesAll(choice.conditions),
    );
    if (choices.length) {
      this.box.showChoices(choices.map((choice) => choice.text), (index) => {
        const choice = choices[index];
        this.storyState.applyEffects(choice.effects);
        choice.actions?.forEach((actionId) => this.onStoryAction?.(actionId));
        if (choice.next) this.enterNode(choice.next);
        else this.finish();
      });
    }
  }

  private finish(): void {
    this.active = false;
    this.currentNode = undefined;
    this.record = undefined;
    this.nodes.clear();
    this.box.close();
    const callback = this.completion;
    this.completion = undefined;
    callback?.();
  }

  private handlePointer(): void {
    if (!this.box.hasChoices) this.advance();
  }

  private handleKey(event: KeyboardEvent): void {
    if (!this.active) return;
    if (this.box.hasChoices) {
      if (event.code === 'ArrowUp' || event.code === 'KeyW') this.box.moveSelection(-1);
      else if (event.code === 'ArrowDown' || event.code === 'KeyS') this.box.moveSelection(1);
      else if (/^Digit[1-9]$/.test(event.code)) this.box.chooseByIndex(Number(event.code.at(-1)) - 1);
      else if (event.code === 'Enter' || event.code === 'Space' || event.code === 'KeyE') {
        this.box.confirmSelection();
      }
      return;
    }
    if (event.code === 'Enter' || event.code === 'Space' || event.code === 'KeyE') this.advance();
  }

  private destroy(): void {
    this.scene.input.off('pointerdown', this.handlePointer, this);
    this.scene.input.keyboard?.off('keydown', this.handleKey, this);
  }
}
