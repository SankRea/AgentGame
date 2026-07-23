import Phaser from 'phaser';
import type { DialogueNode, DialogueRecord, VoiceStyle } from '../types/content';
import { DialogueBox, type DialogueHistoryEntry } from '../ui/DialogueBox';
import type { EndingSystem } from './EndingSystem';
import { SaveSystem } from './SaveSystem';
import type { StoryEffect, StoryStateSystem } from './StoryStateSystem';

/** JSON 节点式对话解释器，统一发射稳定的对话、选择、视角和时间层事件。 */
export class DialogueSystem {
  private readonly box: DialogueBox;
  private readonly records = new Map<string, DialogueRecord>();
  private readonly history: DialogueHistoryEntry[] = [];
  private record?: DialogueRecord;
  private nodes = new Map<string, DialogueNode>();
  private currentNode?: DialogueNode;
  private completion?: () => void;
  private autoAdvanceEvent?: Phaser.Time.TimerEvent;
  private active = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly storyState: StoryStateSystem,
    private readonly endingSystem: EndingSystem,
    private readonly onStoryAction?: (actionId: string) => void,
    private readonly onNarrativeEvent?: (type: string, target: string) => void,
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
    this.onNarrativeEvent?.('dialogue_started', dialogueId);
    return this.openRecord(record);
  }

  startLines(
    speaker: string,
    lines: string | string[],
    onComplete?: () => void,
    voice: VoiceStyle = 'narration',
  ): boolean {
    if (this.active) return false;
    const pages = Array.isArray(lines) ? lines : [lines];
    const nodes = pages.map((text, index): DialogueNode => ({
      id: `line_${index}`,
      speaker,
      voice,
      text,
      next: index < pages.length - 1 ? `line_${index + 1}` : undefined,
    }));
    this.active = true;
    this.completion = onComplete;
    this.onNarrativeEvent?.('dialogue_started', '__runtime__');
    return this.openRecord({ id: '__runtime__', voice, start: 'line_0', nodes });
  }

  advance(): void {
    if (!this.active || !this.currentNode) return;
    if (this.box.revealAll() || this.box.hasChoices) return;
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
      voice: record.voice,
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
    this.autoAdvanceEvent?.remove(false);
    this.autoAdvanceEvent = undefined;
    const node = this.nodes.get(nodeId);
    if (!node) {
      console.warn(`Dialogue node not found: ${this.record?.id}/${nodeId}`);
      this.finish();
      return;
    }
    this.currentNode = node;
    this.applyEffects(node.onEnterEffects);
    const speaker = node.speaker ?? this.record?.speaker ?? '一个声音';
    const voice = node.voice ?? this.record?.voice ?? 'living';
    this.history.push({ speaker, text: node.text, voice });
    this.box.showLine(speaker, node.text, voice);
    this.onNarrativeEvent?.('dialogue_node_entered', `${this.record?.id}/${node.id}`);

    const choices = (node.choices ?? []).filter((choice) =>
      this.storyState.matchesAll(choice.conditions),
    );
    if (choices.length) {
      this.box.showChoices(choices.map((choice) => choice.text), (index) => {
        const choice = choices[index];
        this.applyEffects(choice.effects);
        choice.actions?.forEach((actionId) => this.onStoryAction?.(actionId));
        this.onNarrativeEvent?.('dialogue_choice_selected', choice.id);
        if (choice.next) this.enterNode(choice.next);
        else this.finish();
      });
    } else {
      const settings = new SaveSystem().LoadSettings();
      if (settings.autoAdvance) {
        const voiceDelay = voice === 'ghost' ? settings.textSpeed + 8 : settings.textSpeed;
        this.autoAdvanceEvent = this.scene.time.delayedCall(
          Math.max(900, node.text.length * Math.max(8, voiceDelay) + 1400),
          () => {
            this.autoAdvanceEvent = undefined;
            if (this.active && this.currentNode?.id === node.id) this.advance();
          },
        );
      }
    }
  }

  private applyEffects(effects: StoryEffect[] = []): void {
    const previousLayer = String(this.storyState.get('currentTimeLayer') ?? '');
    const previousPerspective = String(this.storyState.get('currentPerspective') ?? '');
    const wasDead = Boolean(this.storyState.get('isDead'));
    this.storyState.applyEffects(effects);
    const nextLayer = String(this.storyState.get('currentTimeLayer') ?? '');
    const nextPerspective = String(this.storyState.get('currentPerspective') ?? '');
    if (previousLayer !== nextLayer) this.onNarrativeEvent?.('time_layer_changed', nextLayer);
    if (previousPerspective !== nextPerspective) this.onNarrativeEvent?.('perspective_changed', nextPerspective);
    if (!wasDead && Boolean(this.storyState.get('isDead'))) {
      this.onNarrativeEvent?.('character_truth_discovered', 'juan_is_dead');
    }
  }

  private finish(): void {
    this.autoAdvanceEvent?.remove(false);
    this.autoAdvanceEvent = undefined;
    const completedRecord = this.record?.id ?? '';
    this.active = false;
    this.currentNode = undefined;
    this.record = undefined;
    this.nodes.clear();
    this.box.close();
    if (completedRecord) this.onNarrativeEvent?.('dialogue_completed', completedRecord);
    const callback = this.completion;
    this.completion = undefined;
    callback?.();
  }

  private handlePointer(): void {
    if (this.box.revealAll()) return;
    if (!this.box.hasChoices) this.advance();
  }

  private handleKey(event: KeyboardEvent): void {
    if (!this.active) return;
    if (event.code === 'KeyH') {
      this.box.toggleHistory(this.history);
      return;
    }
    if (this.box.isTyping && ['Enter', 'Space', 'KeyE'].includes(event.code)) {
      this.box.revealAll();
      return;
    }
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
    this.autoAdvanceEvent?.remove(false);
    this.autoAdvanceEvent = undefined;
    this.scene.input.off('pointerdown', this.handlePointer, this);
    this.scene.input.keyboard?.off('keydown', this.handleKey, this);
  }
}
