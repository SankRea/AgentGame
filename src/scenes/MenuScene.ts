import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { ambientAudio } from '../systems/AmbientAudioSystem';
import { SaveSystem } from '../systems/SaveSystem';

/** 《得道成仙》碑刻、烛火、烟雾与符纸主题标题界面。 */
export class MenuScene extends Phaser.Scene {
  private readonly saveSystem = new SaveSystem();
  private noticeText!: Phaser.GameObjects.Text;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#050403');
    this.drawTempleSilhouette();
    this.createSmoke();
    this.createFallingTalismans();
    this.createCandles();

    this.add.text(GAME_WIDTH / 2 + 4, 110 + 5, '得 道 成 仙', {
      fontFamily: 'STKaiti, KaiTi, serif', fontSize: '66px', color: '#170d0b', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 110, '得 道 成 仙', {
      fontFamily: 'STKaiti, KaiTi, serif', fontSize: '66px', color: '#d5c39c', fontStyle: 'bold',
      stroke: '#3b2520', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 162, 'AscendToImmortality', {
      fontFamily: 'Georgia, serif', fontSize: '17px', color: '#74695c', letterSpacing: 5,
    }).setOrigin(0.5);

    const seal = this.add.text(642, 92, '尸\n解', {
      fontFamily: 'STKaiti, KaiTi, serif', fontSize: '18px', color: '#9e1d17', align: 'center',
      backgroundColor: '#250806', padding: { x: 7, y: 5 },
    }).setOrigin(0.5).setAngle(-7);
    this.tweens.add({ targets: seal, alpha: { from: 0.35, to: 1 }, duration: 1700, yoyo: true, repeat: -1 });

    this.createButton(255, '开始修行', () => this.startGame(false), true);
    const hasSave = this.saveSystem.hasSave();
    this.createButton(309, hasSave ? '读取命数' : '命数未书', () => this.startGame(true), hasSave);
    this.createButton(363, '设置', () => this.toggleSettings(), true);
    this.createButton(417, '退出', () => this.exitGame(), true);

    this.noticeText = this.add.text(GAME_WIDTH / 2, 480, '青玄观百年无灯，今夜却有人叩棺。', {
      fontFamily: 'STKaiti, KaiTi, serif', fontSize: '15px', color: '#756b5f',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 515, 'Enter 开始修行', {
      fontFamily: 'monospace', fontSize: '12px', color: '#554b43',
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => void ambientAudio.start());
    this.input.keyboard?.once('keydown-ENTER', () => this.startGame(false));
  }

  private startGame(loadSave: boolean): void {
    void ambientAudio.start();
    ambientAudio.playDoor();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(520, () => this.scene.start('GameScene', { loadSave }));
  }

  private toggleSettings(): void {
    void ambientAudio.start();
    const muted = ambientAudio.toggleMuted();
    this.noticeText.setText(muted ? '环境声音：关闭' : '环境声音：开启');
  }

  private exitGame(): void {
    ambientAudio.playDoor();
    window.close();
    this.noticeText.setText('尘缘未了。请关闭此页，方可离观。');
  }

  private createButton(y: number, label: string, onClick: () => void, enabled: boolean): void {
    const line = this.add.rectangle(GAME_WIDTH / 2, y + 18, 164, 1, enabled ? 0x5f211d : 0x292421, 0.8);
    const text = this.add.text(GAME_WIDTH / 2, y, label, {
      fontFamily: 'STKaiti, KaiTi, serif', fontSize: '23px',
      color: enabled ? '#c8b991' : '#4d4740', padding: { x: 20, y: 6 },
    }).setOrigin(0.5);
    if (!enabled) return;
    text.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        text.setColor('#e5d6aa');
        line.setScale(1.25, 1).setFillStyle(0x9d2b23);
      })
      .on('pointerout', () => {
        text.setColor('#c8b991');
        line.setScale(1, 1).setFillStyle(0x5f211d);
      })
      .on('pointerdown', onClick);
  }

  private drawTempleSilhouette(): void {
    const g = this.add.graphics();
    g.fillStyle(0x0b0907).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x11100d).fillTriangle(65, 430, 270, 215, 410, 430);
    g.fillTriangle(555, 430, 755, 195, 930, 430);
    g.fillStyle(0x17130f).fillRect(225, 420, 510, 120);
    g.fillTriangle(165, 435, 480, 285, 795, 435);
    g.fillStyle(0x080706).fillRect(430, 354, 100, 186);
    g.lineStyle(2, 0x331512, 0.7).lineBetween(480, 300, 480, 540);
  }

  private createCandles(): void {
    [110, 850].forEach((x) => {
      this.add.rectangle(x, 450, 13, 70, 0x756446).setOrigin(0.5, 1);
      const glow = this.add.circle(x, 370, 35, 0x8f2415, 0.13);
      const flame = this.add.ellipse(x, 392, 10, 25, 0xe26b23, 0.9).setOrigin(0.5, 1);
      this.add.ellipse(x, 392, 4, 14, 0xf4d27c).setOrigin(0.5, 1);
      this.tweens.add({
        targets: [flame, glow], scaleX: { from: 0.75, to: 1.2 }, scaleY: { from: 0.9, to: 1.1 },
        alpha: { from: 0.55, to: 1 }, duration: 180 + Math.random() * 130, yoyo: true, repeat: -1,
      });
    });
  }

  private createSmoke(): void {
    for (let index = 0; index < 8; index += 1) {
      const smoke = this.add.ellipse(110 + index * 105, 440 + Math.random() * 80, 120, 18, 0x8a8174, 0.025);
      this.tweens.add({
        targets: smoke, x: '+=100', y: '-=65', alpha: { from: 0.02, to: 0.08 },
        duration: 7000 + index * 650, delay: index * 430, repeat: -1, yoyo: true,
      });
    }
  }

  private createFallingTalismans(): void {
    for (let index = 0; index < 5; index += 1) {
      const x = 160 + index * 165;
      const paper = this.add.rectangle(x, -40 - index * 95, 22, 62, 0xb69b5b, 0.28).setAngle(index % 2 ? 9 : -8);
      const glyph = this.add.text(x, paper.y, '敕', {
        fontFamily: 'STKaiti, KaiTi, serif', fontSize: '15px', color: '#6f1814',
      }).setOrigin(0.5);
      this.tweens.add({
        targets: [paper, glyph], y: GAME_HEIGHT + 70, x: `+=${index % 2 ? 45 : -45}`,
        angle: '+=25', duration: 11000 + index * 900, delay: index * 1200, repeat: -1,
      });
    }
  }
}
