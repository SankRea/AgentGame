import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';

/** 底部对话 UI，支持鼠标、方向键、数字键与确认键选择选项。 */
export class DialogueBox extends Phaser.GameObjects.Container {
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;
  private readonly continueText: Phaser.GameObjects.Text;
  private readonly choiceTexts: Phaser.GameObjects.Text[] = [];
  private selectedChoice = 0;
  private onChoice?: (index: number) => void;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(20000).setScrollFactor(0).setVisible(false);

    const panel = scene.add.rectangle(24, GAME_HEIGHT - 260, GAME_WIDTH - 48, 236, 0x090706, 0.93)
      .setOrigin(0)
      .setStrokeStyle(3, 0x8f2721, 0.95);
    this.nameText = scene.add.text(50, GAME_HEIGHT - 244, '', {
      fontFamily: 'STKaiti, KaiTi, serif', fontSize: '20px', color: '#c75245', fontStyle: 'bold',
    });
    this.bodyText = scene.add.text(50, GAME_HEIGHT - 208, '', {
      fontFamily: 'STKaiti, KaiTi, serif', fontSize: '18px', color: '#e7dbc0',
      lineSpacing: 7, wordWrap: { width: GAME_WIDTH - 106 },
    });
    this.continueText = scene.add.text(GAME_WIDTH - 52, GAME_HEIGHT - 42, '▼', {
      fontFamily: 'monospace', fontSize: '16px', color: '#a5382e',
    }).setOrigin(1);

    this.add([panel, this.nameText, this.bodyText, this.continueText]);
    scene.tweens.add({ targets: this.continueText, y: '+=4', duration: 420, yoyo: true, repeat: -1 });
  }

  showLine(speaker: string, text: string): void {
    this.clearChoices();
    this.nameText.setText(speaker);
    this.bodyText.setText(text);
    this.continueText.setVisible(true);
    this.setVisible(true);
  }

  showChoices(labels: string[], callback: (index: number) => void): void {
    this.clearChoices();
    this.onChoice = callback;
    this.selectedChoice = 0;
    this.continueText.setVisible(false);

    labels.forEach((label, index) => {
      const choice = this.scene.add.text(62, GAME_HEIGHT - 145 + index * 31, '', {
        fontFamily: 'STKaiti, KaiTi, serif', fontSize: '16px', color: '#d9cdb0',
        backgroundColor: '#17100e', padding: { x: 8, y: 4 },
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

  moveSelection(direction: number): void {
    if (!this.choiceTexts.length) return;
    this.selectedChoice = Phaser.Math.Wrap(this.selectedChoice + direction, 0, this.choiceTexts.length);
    this.refreshChoiceStyles();
  }

  confirmSelection(): void {
    this.choose(this.selectedChoice);
  }

  chooseByIndex(index: number): void {
    if (index >= 0 && index < this.choiceTexts.length) this.choose(index);
  }

  close(): void {
    this.clearChoices();
    this.setVisible(false);
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
      text.setText(`${active ? '▶' : ' '} ${index + 1}. ${text.getData('label') ?? ''}`);
      text.setColor(active ? '#f0dfb5' : '#d9cdb0');
      text.setBackgroundColor(active ? '#431a17' : '#17100e');
    });
  }

  private clearChoices(): void {
    this.choiceTexts.forEach((text) => text.destroy());
    this.choiceTexts.length = 0;
    this.onChoice = undefined;
  }
}
