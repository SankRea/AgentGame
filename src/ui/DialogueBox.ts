import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { ambientAudio } from '../systems/AmbientAudioSystem';
import { SaveSystem } from '../systems/SaveSystem';
import type { VoiceStyle } from '../types/content';
import { UI_THEME } from './Theme';

export interface DialogueHistoryEntry {
  speaker: string;
  text: string;
  voice: VoiceStyle;
}
/** 旧纸与石灰墙质感的对话 UI，支持打字机、跳过、选择和对话记录。 */
export class DialogueBox extends Phaser.GameObjects.Container {
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;
  private readonly continueText: Phaser.GameObjects.Text;
  private readonly historyPanel: Phaser.GameObjects.Container;
  private readonly historyText: Phaser.GameObjects.Text;
  private readonly choiceTexts: Phaser.GameObjects.Text[] = [];
  private typingEvent?: Phaser.Time.TimerEvent;
  private fullText = '';
  private typedCharacters = 0;
  private selectedChoice = 0;
  private highContrast = false;
  private onChoice?: (index: number) => void;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(20000).setScrollFactor(0).setVisible(false);

    const shadow = scene.add.rectangle(28, GAME_HEIGHT - 248, GAME_WIDTH - 48, 218, 0x17130f, 0.62)
      .setOrigin(0);
    this.panel = scene.add.rectangle(22, GAME_HEIGHT - 254, GAME_WIDTH - 48, 218, UI_THEME.colors.paper, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, UI_THEME.colors.charcoal, 0.9);
    const topRule = scene.add.rectangle(44, GAME_HEIGHT - 230, GAME_WIDTH - 92, 1, UI_THEME.colors.clay, 0.55)
      .setOrigin(0);
    const crackA = scene.add.line(0, 0, 760, GAME_HEIGHT - 252, 790, GAME_HEIGHT - 235, 0x675342, 0.35)
      .setOrigin(0);
    const crackB = scene.add.line(0, 0, 790, GAME_HEIGHT - 235, 778, GAME_HEIGHT - 215, 0x675342, 0.25)
      .setOrigin(0);

    this.nameText = scene.add.text(48, GAME_HEIGHT - 244, '', {
      fontFamily: UI_THEME.fonts.display,
      fontSize: '18px',
      color: '#4e382c',
      fontStyle: 'bold',
    });
    this.bodyText = scene.add.text(48, GAME_HEIGHT - 207, '', {
      fontFamily: UI_THEME.fonts.body,
      fontSize: '17px',
      color: UI_THEME.colors.inkCss,
      lineSpacing: 7,
      wordWrap: { width: GAME_WIDTH - 102 },
    });
    this.continueText = scene.add.text(GAME_WIDTH - 49, GAME_HEIGHT - 46, 'E 继续  ·  H 记录', {
      fontFamily: UI_THEME.fonts.mono,
      fontSize: '11px',
      color: '#5e4837',
    }).setOrigin(1);

    const historyBackground = scene.add.rectangle(110, 54, GAME_WIDTH - 220, 404, 0x25201d, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, UI_THEME.colors.dust, 0.85);
    const historyTitle = scene.add.text(136, 74, '已经听见的声音', {
      fontFamily: UI_THEME.fonts.display,
      fontSize: '21px',
      color: UI_THEME.colors.chalk,
    });
    this.historyText = scene.add.text(136, 115, '', {
      fontFamily: UI_THEME.fonts.body,
      fontSize: '14px',
      color: '#cfc1aa',
      lineSpacing: 6,
      wordWrap: { width: GAME_WIDTH - 284 },
    });
    const historyHint = scene.add.text(GAME_WIDTH - 136, 426, 'H 返回', {
      fontFamily: UI_THEME.fonts.mono,
      fontSize: '11px',
      color: '#8e806e',
    }).setOrigin(1);
    this.historyPanel = scene.add.container(0, 0, [historyBackground, historyTitle, this.historyText, historyHint])
      .setDepth(100)
      .setVisible(false);

    this.add([shadow, this.panel, topRule, crackA, crackB, this.nameText, this.bodyText, this.continueText, this.historyPanel]);
    scene.tweens.add({
      targets: this.continueText,
      alpha: { from: 0.45, to: 1 },
      duration: 650,
      yoyo: true,
      repeat: -1,
    });
  }

  showLine(speaker: string, text: string, voice: VoiceStyle = 'living'): void {
    const settings = new SaveSystem().LoadSettings();
    this.highContrast = settings.highContrastText;
    this.clearChoices();
    this.stopTyping();
    this.nameText.setText(speaker || '一个声音');
    this.fullText = text;
    this.typedCharacters = 0;
    this.bodyText.setText('');
    this.applyVoiceStyle(voice);
    if (this.highContrast) {
      this.panel.setFillStyle(0x151515, 0.985).setStrokeStyle(2, 0xc8c8bd, 0.95);
      this.nameText.setColor('#fff0bd');
      this.bodyText.setColor('#fffdf4').setAlpha(1);
      this.continueText.setColor('#ffffff');
    } else {
      this.panel.setFillStyle(UI_THEME.colors.paper, 0.96).setStrokeStyle(2, UI_THEME.colors.charcoal, 0.9);
      this.continueText.setColor('#5e4837');
    }
    this.continueText.setText('E 显示全文  ·  H 记录').setVisible(true);
    this.historyPanel.setVisible(false);
    this.setVisible(true);
    this.typingEvent = this.scene.time.addEvent({
      delay: Math.max(8, settings.textSpeed + (voice === 'ghost' ? 8 : 0)),
      loop: true,
      callback: () => {
        this.typedCharacters += 1;
        this.bodyText.setText(this.fullText.slice(0, this.typedCharacters));
        const character = this.fullText[this.typedCharacters - 1];
        if (this.typedCharacters % 4 === 0 && character && !/\s/.test(character)) {
          ambientAudio.playDialogueTick(voice);
        }
        if (this.typedCharacters >= this.fullText.length) {
          this.stopTyping();
          this.continueText.setText('E 继续  ·  H 记录');
        }
      },
    });
  }

  showChoices(labels: string[], callback: (index: number) => void): void {
    this.clearChoices();
    this.onChoice = callback;
    this.selectedChoice = 0;
    this.continueText.setVisible(false);
    labels.forEach((label, index) => {
      const choice = this.scene.add.text(58, GAME_HEIGHT - 130 + index * 30, '', {
        fontFamily: UI_THEME.fonts.body,
        fontSize: '14px',
        color: this.highContrast ? '#ffffff' : '#3d3027',
        backgroundColor: this.highContrast ? '#303438' : '#b9a47ddd',
        padding: { x: 8, y: 4 },
      }).setData('label', label).setInteractive({ useHandCursor: true });
      choice
        .on('pointerover', () => {
          this.selectedChoice = index;
          this.refreshChoiceStyles();
        })
        .on('pointerdown', (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          this.choose(index);
        });
      this.choiceTexts.push(choice);
      this.add(choice);
    });
    this.refreshChoiceStyles();
  }

  get hasChoices(): boolean {
    return this.choiceTexts.length > 0;
  }

  get isTyping(): boolean {
    return Boolean(this.typingEvent);
  }

  revealAll(): boolean {
    if (!this.isTyping) return false;
    this.stopTyping();
    this.typedCharacters = this.fullText.length;
    this.bodyText.setText(this.fullText);
    this.continueText.setText(this.hasChoices ? '选择回应  ·  H 记录' : 'E 继续  ·  H 记录');
    return true;
  }

  toggleHistory(entries: DialogueHistoryEntry[]): void {
    const visible = !this.historyPanel.visible;
    if (visible) {
      const recent = entries.slice(-8);
      this.historyText.setText(recent.map((entry) => `${entry.speaker || '一个声音'}\n${entry.text}`).join('\n\n'));
    }
    this.historyPanel.setVisible(visible);
  }

  moveSelection(direction: number): void {
    if (!this.choiceTexts.length || this.historyPanel.visible) return;
    this.selectedChoice = Phaser.Math.Wrap(this.selectedChoice + direction, 0, this.choiceTexts.length);
    this.refreshChoiceStyles();
  }

  confirmSelection(): void {
    if (!this.historyPanel.visible) this.choose(this.selectedChoice);
  }

  chooseByIndex(index: number): void {
    if (index >= 0 && index < this.choiceTexts.length && !this.historyPanel.visible) this.choose(index);
  }

  close(): void {
    this.stopTyping();
    this.clearChoices();
    this.historyPanel.setVisible(false);
    this.setVisible(false);
  }

  private applyVoiceStyle(voice: VoiceStyle): void {
    const styles = {
      living: { name: '#553827', body: '#211b18', alpha: 1 },
      ghost: { name: '#5d534d', body: '#3d3835', alpha: 0.9 },
      memory: { name: '#4d5b45', body: '#293328', alpha: 0.94 },
      narration: { name: '#67523a', body: '#2b241f', alpha: 0.96 },
    } satisfies Record<VoiceStyle, { name: string; body: string; alpha: number }>;
    const style = styles[voice];
    this.nameText.setColor(style.name);
    this.bodyText.setColor(style.body).setAlpha(style.alpha);
  }

  private choose(index: number): void {
    const callback = this.onChoice;
    this.onChoice = undefined;
    this.clearChoices();
    callback?.(index);
  }

  private refreshChoiceStyles(): void {
    this.choiceTexts.forEach((text, index) => {
      const active = index === this.selectedChoice;
      text.setText(`${active ? '›' : ' '} ${index + 1}. ${String(text.getData('label') ?? '')}`);
      text.setColor(this.highContrast ? '#ffffff' : active ? '#1c1714' : '#493a2e');
      text.setBackgroundColor(
        this.highContrast
          ? active ? '#667078' : '#303438'
          : active ? '#d7c39a' : '#b9a47d',
      );
    });
  }

  private clearChoices(): void {
    this.choiceTexts.forEach((text) => text.destroy());
    this.choiceTexts.length = 0;
    this.onChoice = undefined;
  }

  private stopTyping(): void {
    this.typingEvent?.remove(false);
    this.typingEvent = undefined;
  }
}
