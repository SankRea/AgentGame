import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { VISUAL_THEME } from '../config/VisualTheme';
import { ambientAudio } from '../systems/AmbientAudioSystem';
import type { EndingDefinition } from '../systems/EndingSystem';
import { SaveSystem, type GameSettings } from '../systems/SaveSystem';
import { SettingsPanel } from '../ui/SettingsPanel';
import { UI_THEME } from '../ui/Theme';

/** 正午逐渐腐败成黄昏：科马拉的远景先于玩家开始回忆。 */
export class MenuScene extends Phaser.Scene {
  private readonly saveSystem = new SaveSystem();
  private noticeText!: Phaser.GameObjects.Text;
  private settings!: GameSettings;
  private settingsPanel!: SettingsPanel;
  private confirmNewUntil = 0;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.settings = this.saveSystem.LoadSettings();
    this.applyAudioSettings();
    this.cameras.main.setBackgroundColor('#ded7bc');
    const save = this.saveSystem.Load();
    this.drawLandscape();
    this.createDust();
    this.createHeatShimmer();
    this.createDuskFall();

    this.add.text(74, 64, '佩德罗·巴拉莫', {
      fontFamily: UI_THEME.fonts.display,
      fontSize: '46px',
      color: '#241d1a',
      fontStyle: 'bold',
      letterSpacing: 4,
    }).setDepth(10);
    this.add.text(78, 125, '科马拉仍在说话', {
      fontFamily: UI_THEME.fonts.body,
      fontSize: '17px',
      color: '#4e4036',
      letterSpacing: 5,
    }).setDepth(10);
    this.add.text(79, 155, 'PEDRO PÁRAMO', {
      fontFamily: UI_THEME.fonts.mono,
      fontSize: '10px',
      color: '#665b68',
      letterSpacing: 3,
    }).setDepth(10);
    this.add.rectangle(78, 181, 390, 1, VISUAL_THEME.memory.darkGold, 0.72).setOrigin(0).setDepth(10);

    const hasSave = Boolean(save);
    this.createButton(84, 224, '下到科马拉', () => this.startNewGame(), true);
    this.createButton(84, 270, '继续聆听', () => this.startGame(true), hasSave);
    this.createButton(84, 316, '往事', () => {
      if (!save?.endings.reached.length) {
        this.noticeText.setText('还没有哪一种往事肯承认你。');
        return;
      }
      const names: Record<string, string> = {
        another_voice: '又一个声音',
        comala_memory: '科马拉的记忆',
        mothers_place: '母亲所说的地方',
        remain_with_dead: '又一个声音',
        release_memory: '科马拉的记忆',
        remain_in_murmurs: '又一个声音',
        memory_of_comala: '科马拉的记忆',
        unfinished_search: '未说完的话',
      };
      this.noticeText.setText(`已经听见：${save.endings.reached.map((id) => names[id] ?? id).join('、')}`);
    }, true);
    this.createButton(84, 362, '设置', () => this.settingsPanel.open(), true);
    this.createButton(84, 408, '离开', () => {
      this.noticeText.setText('科马拉不会拦你。关闭这一页，就可以离开。');
    }, true);

    this.noticeText = this.add.text(82, 474, save?.title ?? '有些地方只有在离开以后，才开始发出声音。', {
      fontFamily: UI_THEME.fonts.body,
      fontSize: '14px',
      color: '#4e4036',
      wordWrap: { width: 720 },
    }).setDepth(10);

    this.settingsPanel = new SettingsPanel(
      this,
      this.settings,
      (settings) => {
        this.saveSystem.SaveSettings(settings);
        this.applyAudioSettings();
      },
      () => undefined,
    );
    this.input.keyboard?.on('keydown', this.handleKey, this);
    this.input.once('pointerdown', () => void ambientAudio.start());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.handleKey, this);
    });
  }

  private handleKey(event: KeyboardEvent): void {
    this.settingsPanel.handleKey(event);
  }

  private applyAudioSettings(): void {
    ambientAudio.setMuted(false);
    ambientAudio.setVolume(this.settings.masterVolume);
    ambientAudio.setEnvironmentVolume(this.settings.environmentVolume);
    ambientAudio.setDialogueVolume(this.settings.dialogueVolume);
  }

  private startNewGame(): void {
    if (this.saveSystem.hasSave() && this.time.now > this.confirmNewUntil) {
      this.confirmNewUntil = this.time.now + 5000;
      this.noticeText.setText('再点一次“下到科马拉”，当前旅程会被新的脚印覆盖。');
      return;
    }
    this.startGame(false);
  }

  private startGame(loadSave: boolean): void {
    if (this.settingsPanel.visible) return;
    void ambientAudio.start();
    ambientAudio.playDoor();
    this.cameras.main.fadeOut(520, 222, 215, 188);
    this.time.delayedCall(550, () => {
      const save = loadSave ? this.saveSystem.Load() : null;
      if (save?.endings.currentEnding) {
        const endings = this.cache.json.get('endings') as EndingDefinition[];
        const ending = endings.find((candidate) => candidate.id === save.endings.currentEnding);
        if (ending) {
          this.scene.start('EndingScene', { ending });
          return;
        }
      }
      this.scene.start('GameScene', { loadSave });
    });
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    enabled: boolean,
  ): void {
    const marker = this.add.rectangle(
      x,
      y + 8,
      4,
      25,
      enabled ? VISUAL_THEME.memory.darkGold : 0x736956,
      enabled ? 0.9 : 0.35,
    ).setOrigin(0, 0.5).setDepth(10);
    const text = this.add.text(x + 18, y, label, {
      fontFamily: UI_THEME.fonts.body,
      fontSize: '19px',
      color: enabled ? '#302824' : '#81786b',
      padding: { x: 4, y: 4 },
    }).setDepth(10);
    if (!enabled) return;
    text.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        text.setColor('#151617');
        marker.setScale(1.8, 1).setFillStyle(VISUAL_THEME.reality.doorway);
      })
      .on('pointerout', () => {
        text.setColor('#302824');
        marker.setScale(1, 1).setFillStyle(VISUAL_THEME.memory.darkGold);
      })
      .on('pointerdown', onClick);
  }

  private drawLandscape(): void {
    const g = this.add.graphics();
    const bands = [
      [VISUAL_THEME.reality.limeWhite, 0, 0, GAME_WIDTH, 105],
      [VISUAL_THEME.reality.overexposedSky, 0, 105, GAME_WIDTH, 118],
      [VISUAL_THEME.reality.dustYellow, 0, 223, GAME_WIDTH, 150],
      [VISUAL_THEME.reality.dryEarth, 0, 373, GAME_WIDTH, 167],
    ] as const;
    bands.forEach(([color, x, y, width, height]) => g.fillStyle(color).fillRect(x, y, width, height));
    g.fillStyle(0xc0a86e, 0.55).fillEllipse(745, 176, 310, 38);
    g.fillStyle(0x796752).fillTriangle(510, 410, 720, 290, 960, 410);
    g.fillStyle(0x4e4036).fillRect(620, 352, 340, 188);
    g.fillTriangle(585, 373, 740, 312, 870, 373);
    g.fillStyle(0x34383a).fillRect(780, 226, 58, 185);
    g.fillTriangle(762, 235, 809, 180, 856, 235);
    g.fillStyle(VISUAL_THEME.reality.doorway).fillRect(799, 266, 21, 37);
    g.fillStyle(0x292b2c).fillRect(675, 398, 66, 142).fillRect(862, 412, 54, 128);
    g.fillStyle(VISUAL_THEME.reality.dryEarth).fillRect(0, 492, GAME_WIDTH, 48);
  }

  private createDuskFall(): void {
    const dusk = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x665b68, 0)
      .setOrigin(0)
      .setDepth(2)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    const longShadow = this.add.rectangle(800, 430, 520, 46, 0x303438, 0.08)
      .setAngle(-7)
      .setDepth(3);
    this.tweens.add({ targets: dusk, alpha: 0.24, duration: 24000, ease: 'Sine.easeIn' });
    this.tweens.add({ targets: longShadow, scaleX: 1.65, alpha: 0.3, duration: 24000, ease: 'Sine.easeIn' });
  }

  private createDust(): void {
    for (let index = 0; index < 24; index += 1) {
      const dust = this.add.rectangle(
        (index * 83) % GAME_WIDTH,
        180 + ((index * 47) % 330),
        index % 3 === 0 ? 3 : 2,
        2,
        VISUAL_THEME.reality.limeWhite,
        0.24,
      );
      this.tweens.add({
        targets: dust,
        x: `+=${90 + (index % 5) * 16}`,
        y: `-=${12 + (index % 4) * 7}`,
        alpha: { from: 0.06, to: 0.3 },
        duration: 4800 + index * 160,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private createHeatShimmer(): void {
    if (!this.settings.heatHaze) return;
    for (let index = 0; index < 5; index += 1) {
      const shimmer = this.add.rectangle(580 + index * 82, 260 + index * 22, 96, 2, 0xded7bc, 0.07);
      this.tweens.add({
        targets: shimmer,
        x: '+=24',
        alpha: { from: 0.015, to: 0.1 },
        duration: 1700 + index * 210,
        yoyo: true,
        repeat: -1,
      });
    }
  }
}
